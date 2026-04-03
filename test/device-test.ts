/**
 * Device-level integration test using the SprotoDevice API.
 *
 * Usage:
 *   1. Start bridge:  ./test/bridge.sh /dev/tty.usbserial-210
 *   2. docker compose run --rm test bun run test/device-test.ts
 */
import { TcpTransport } from "./tcp-transport.js";
import { SprotoDevice } from "../src/device.js";
import { HEADER_SIZE } from "../src/packet.js";

const HOST = process.env.SERIAL_HOST || "host.docker.internal";
const PORT = parseInt(process.env.SERIAL_PORT || "9876", 10);
const TIMEOUT = parseInt(process.env.TIMEOUT || "3000", 10);

function hexDump(data: Uint8Array): string {
  return Array.from(data)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(" ");
}

async function main() {
  const transport = new TcpTransport(TIMEOUT);

  console.log(`Connecting to ${HOST}:${PORT}...`);
  await transport.connect(HOST, PORT);
  console.log("Connected.\n");

  await new Promise((r) => setTimeout(r, 300));
  await transport.clear();

  // ── Test 1: Raw low-level read to verify transport works ───────────────

  console.log("=== Test 1: Raw read (region 0, offset 0, length 16) ===");
  {
    const pkt = new Uint8Array([0x50, 0x00, 0x00, 0x00, 0x10, 0x00]);
    await transport.write(pkt);
    console.log(`  TX: ${hexDump(pkt)}`);

    // Read echo
    const echo = await transport.read(6);
    console.log(`  RX echo: ${hexDump(echo)}`);

    // Read response header
    const hdr = await transport.read(6);
    console.log(`  RX hdr:  ${hexDump(hdr)}`);

    // Read data
    const data = await transport.read(hdr[4]);
    console.log(`  RX data: ${hexDump(data)}`);
    console.log("  OK\n");
  }

  await transport.clear();
  await new Promise((r) => setTimeout(r, 200));

  // ── Test 2: SprotoDevice with small maxDataLength ──────────────────────

  console.log("=== Test 2: SprotoDevice readRegion (region 1, 32 units, maxData=16) ===");
  {
    const device = new SprotoDevice(transport, {
      baudRate: 38400,
      addressBits: 8,
      maxDataLength: 16,
      duplex: false,
      messageTimeout: TIMEOUT,
      resendCount: 2,
    });

    const config = device.addRegion({ number: 1, offset: 0, length: 32 });

    try {
      await device.readRegion(config, undefined, undefined, (pct) => {
        process.stdout.write(`\r  Progress: ${pct}%   `);
      });
      console.log("\n  Success!");
      console.log("  First 32 bytes:", hexDump(config.readRaw(0, 32)));

      // Try typed reads
      for (let i = 0; i < 8; i++) {
        console.log(`  uint8[${i}] = ${config.readUint8(i)} (0x${config.readUint8(i).toString(16)})`);
      }
    } catch (e: unknown) {
      console.error(`\n  FAILED: ${e instanceof Error ? e.message : e}`);
    }
  }

  await transport.clear();
  await new Promise((r) => setTimeout(r, 200));

  // ── Test 3: Read Info region ───────────────────────────────────────────

  console.log("\n=== Test 3: SprotoDevice readRegion (region 0, 32 units, maxData=16) ===");
  {
    const device = new SprotoDevice(transport, {
      baudRate: 38400,
      addressBits: 8,
      maxDataLength: 16,
      duplex: false,
      messageTimeout: TIMEOUT,
      resendCount: 2,
    });

    const info = device.addRegion({ number: 0, offset: 0, length: 32 });

    try {
      await device.readRegion(info, undefined, undefined, (pct) => {
        process.stdout.write(`\r  Progress: ${pct}%   `);
      });
      console.log("\n  Success!");
      console.log("  First 32 bytes:", hexDump(info.readRaw(0, 32)));
      console.log("  ASCII [0..16]:", JSON.stringify(info.readAscii(0, 16)));
      console.log("  ASCII [16..32]:", JSON.stringify(info.readAscii(16, 16)));
    } catch (e: unknown) {
      console.error(`\n  FAILED: ${e instanceof Error ? e.message : e}`);
    }
  }

  console.log("\nDone.");
  await transport.disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
