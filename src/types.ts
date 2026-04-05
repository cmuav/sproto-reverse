/**
 * Address width used by the device. Determines how many bytes each
 * addressable unit occupies in the region buffer.
 *
 * - `8`  - 1 byte per address unit
 * - `16` - 2 bytes per address unit
 * - `32` - 4 bytes per address unit
 */
export type AddressBits = 8 | 16 | 32;

/** Byte ordering for 16-bit values within a region. */
export type ByteOrder16 = [number, number];

/** Byte ordering for 32-bit values within a region. */
export type ByteOrder32 = [number, number, number, number];

/** Connection settings for a Sproto device. */
export interface DeviceConfig {
  /** Baud rate for serial communication. Default: 38400. */
  baudRate?: number;

  /** Address bit width. Default: 8. */
  addressBits?: AddressBits;

  /** Timeout in milliseconds for a single message exchange. Default: 1000. */
  messageTimeout?: number;

  /** Number of times to retry a failed transaction. Default: 3. */
  resendCount?: number;

  /** Maximum data bytes per single read/write transaction. Default: 128. */
  maxDataLength?: number;

  /**
   * If true, the link is full-duplex. If false (half-duplex), the device
   * echoes back written bytes which must be read and discarded.
   * Default: true.
   */
  duplex?: boolean;
}

/** Definition of a memory region on the device. */
export interface RegionDef {
  /** Region number (0–15). */
  number: number;

  /** Starting address offset. */
  offset: number;

  /** Length in addressable units. */
  length: number;

  /** Byte order for 16-bit reads/writes. Default: [0, 1] (little-endian). */
  byteOrder16?: ByteOrder16;

  /** Byte order for 32-bit reads/writes. Default: [0, 1, 2, 3] (little-endian). */
  byteOrder32?: ByteOrder32;

  /**
   * Wire address divisor for chunked reads/writes. The wire address is
   * computed as `byteOffset / addressDivisor`. Default: 1 (byte addressing).
   * Set to 2 for word-addressed regions where the ESC expects word addresses
   * on the wire but the data payload is still in bytes.
   */
  addressDivisor?: number;
}

/**
 * A transport abstraction. Users supply an implementation that matches their
 * environment (Node.js serialport, WebSerial, WebUSB polyfill, etc.).
 */
export interface Transport {
  /** Write bytes to the device. Resolves when all bytes have been sent. */
  write(data: Uint8Array): Promise<void>;

  /**
   * Read exactly `length` bytes from the device.
   * Must reject with a timeout error if the bytes don't arrive in time.
   */
  read(length: number): Promise<Uint8Array>;

  /** Discard any buffered unread data. */
  clear(): Promise<void>;
}
