# sproto-protocol

TypeScript implementation of the Sproto serial protocol used by **Tribunus ESCs** and other Sproto-based motor controllers.

## Protocol Overview

Sproto is a register-based serial protocol. The ESC's memory is divided into numbered **regions** (0-15), each containing addressable data cells. The host reads and writes these cells over a serial link.

### Wire Format

Every transaction uses a **6-byte header**:

```
Byte 0 - Signature:  [W][1][0][1][R3][R2][R1][R0]
           W     = 1 for write, 0 for read
           101   = fixed marker
           R3-R0 = region number (0-15)

Byte 1 - Address bits 23-16
Byte 2 - Address bits 15-8
Byte 3 - Address bits 7-0
Byte 4 - Length (data units)
Byte 5 - Reserved (0x00)
```

**Read transaction:**
1. Host sends 6-byte read header
2. Device responds with 6-byte header (byte 4 = actual length)
3. Device sends data bytes

**Write transaction:**
1. Host sends 6-byte header + data bytes
2. Device responds with 6-byte header (byte 4 = acknowledged length)

**Half-duplex mode:** When duplex is disabled, the device echoes back every write, which must be read and discarded before reading the response.

### Data Types

| Type | Encoding |
|------|----------|
| `IQ22` | Fixed-point: `int32 / 2^22` |
| `Sprc_t` | Percentage: `int16 / 100` |
| `Smeas_t` | Measurement: `int16 / 100` |

### Default Settings

| Setting | Default |
|---------|---------|
| Baud rate | 38400 |
| Address bits | 8 |
| Message timeout | 1000ms |
| Retry count | 3 |
| Max data length | 128 bytes |
| Duplex | true |

## Usage

### 1. Implement a Transport

The library is transport-agnostic. You provide an object that can write bytes, read bytes, and clear the buffer:

```ts
import type { Transport } from "sproto-protocol";

// Example: WebSerial transport
class WebSerialTransport implements Transport {
  private reader: ReadableStreamDefaultReader<Uint8Array>;
  private writer: WritableStreamDefaultWriter<Uint8Array>;
  private buffer: number[] = [];

  constructor(port: SerialPort) {
    this.reader = port.readable!.getReader();
    this.writer = port.writable!.getWriter();
  }

  async write(data: Uint8Array): Promise<void> {
    await this.writer.write(data);
  }

  async read(length: number): Promise<Uint8Array> {
    while (this.buffer.length < length) {
      const { value, done } = await this.reader.read();
      if (done) throw new Error("Port closed");
      this.buffer.push(...value);
    }
    return new Uint8Array(this.buffer.splice(0, length));
  }

  async clear(): Promise<void> {
    this.buffer = [];
  }
}
```

### 2. Connect and Read/Write

```ts
import { SprotoDevice } from "sproto-protocol";

const device = new SprotoDevice(transport, {
  baudRate: 38400,
  addressBits: 16,
  maxDataLength: 64,
  duplex: true,
});

// Define a region (number, offset, length from ESC documentation)
const config = device.addRegion({
  number: 1,
  offset: 0,
  length: 256,
});

// Read entire region from device into local buffer
await device.readRegion(config, undefined, undefined, (pct) => {
  console.log(`Reading... ${pct}%`);
});

// Access typed values from the local buffer
const voltage = config.readSmeas(0x10);
const throttleCurve = config.readSprc(0x20);
const firmwareVersion = config.readAscii(0x00, 16);
console.log(`FW: ${firmwareVersion}, Voltage: ${voltage}V, Throttle: ${throttleCurve}%`);

// Modify a value and write back
config.writeSprc(0x20, 80.0);
await device.writeRegion(config);
```

### 3. Low-Level Packet API

For custom protocol work:

```ts
import {
  buildReadPacket,
  buildWritePacket,
  decodeHeader,
  encodeSig,
} from "sproto-protocol";

// Build a read request for region 1, address 0x000000, 16 bytes
const packet = buildReadPacket(1, 0x000000, 16);
// => Uint8Array [0x51, 0x00, 0x00, 0x00, 0x10, 0x00]

// Build a write packet
const data = new Uint8Array([0x01, 0x02, 0x03]);
const writePacket = buildWritePacket(1, 0x000100, data);
// => Uint8Array [0xD1, 0x00, 0x01, 0x00, 0x03, 0x00, 0x01, 0x02, 0x03]

// Decode a response header
const resp = decodeHeader(responseBytes);
console.log(resp.region, resp.address, resp.length, resp.write);
```

### 4. S-Record Files

Sproto uses Motorola S-Records for config save/load and firmware:

```ts
import { parseSRec, generateSRec, srecToBuffer } from "sproto-protocol";

// Parse an S-Record file
const entries = parseSRec(fileContent);
for (const entry of entries) {
  console.log(`Region ${entry.region} @ 0x${entry.address.toString(16)}: ${entry.data.length} bytes`);
}

// Generate S-Record from region data
const srec = generateSRec([
  { region: 1, address: 0, data: config.readRaw(0, 256) },
]);

// Convert firmware S-Record to flat binary
const firmware = srecToBuffer(firmwareFileContent);
```

## Protocol Notes

- Region numbers are 4 bits (0-15)
- Addresses are 24 bits (0-0xFFFFFF)
- Length field is 8 bits (max 255 units per transaction, but `maxDataLength` config controls chunking)
- The signature byte's fixed `101` pattern can be used to validate responses
- Byte ordering for 16/32-bit values is configurable per region

