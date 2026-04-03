/**
 * Low-level Sproto packet encoding/decoding.
 *
 * The Sproto wire protocol uses a fixed 6-byte header for every transaction:
 *
 * ```
 * Byte 0 - Signature:  [W][1][0][1][R3][R2][R1][R0]
 *            W     = 1 for write, 0 for read
 *            101   = fixed marker
 *            R3–R0 = region number (0–15)
 *
 * Byte 1 - Address high   (bits 23–16)
 * Byte 2 - Address mid    (bits 15–8)
 * Byte 3 - Address low    (bits  7–0)
 * Byte 4 - Length (number of addressable units)
 * Byte 5 - Reserved (0x00)
 * ```
 */

export const HEADER_SIZE = 6;

/**
 * Build the signature byte.
 *
 * @param write  - true for a write operation, false for read
 * @param region - region number (0–15)
 * @returns The signature byte
 */
export function encodeSig(write: boolean, region: number): number {
  if (region < 0 || region > 15) {
    throw new RangeError(`Region must be 0–15, got ${region}`);
  }
  //  [W] [1] [0] [1] [R3 R2 R1 R0]
  return ((write ? 1 : 0) << 7) | (0b101 << 4) | (region & 0x0f);
}

/**
 * Decode a signature byte into its write flag and region number.
 */
export function decodeSig(sig: number): { write: boolean; region: number } {
  return {
    write: (sig & 0x80) !== 0,
    region: sig & 0x0f,
  };
}

/**
 * Encode a 6-byte Sproto header.
 *
 * @param region  - region number (0–15)
 * @param address - start address (up to 24 bits)
 * @param length  - number of addressable units to read/write
 * @param write   - true for write, false for read
 * @returns A 6-byte Uint8Array
 */
export function encodeHeader(
  region: number,
  address: number,
  length: number,
  write: boolean,
): Uint8Array {
  const buf = new Uint8Array(HEADER_SIZE);
  buf[0] = encodeSig(write, region);
  buf[1] = (address >> 16) & 0xff;
  buf[2] = (address >> 8) & 0xff;
  buf[3] = address & 0xff;
  buf[4] = length & 0xff;
  buf[5] = 0x00;
  return buf;
}

/**
 * Decode a 6-byte Sproto header.
 */
export function decodeHeader(buf: Uint8Array): {
  write: boolean;
  region: number;
  address: number;
  length: number;
} {
  if (buf.length < HEADER_SIZE) {
    throw new Error(`Header must be ${HEADER_SIZE} bytes, got ${buf.length}`);
  }
  const { write, region } = decodeSig(buf[0]);
  const address = (buf[1] << 16) | (buf[2] << 8) | buf[3];
  const length = buf[4];
  return { write, region, address, length };
}

/**
 * Build a complete read-request packet (header only, no data payload).
 */
export function buildReadPacket(
  region: number,
  address: number,
  length: number,
): Uint8Array {
  return encodeHeader(region, address, length, false);
}

/**
 * Build a complete write packet (header + data payload).
 */
export function buildWritePacket(
  region: number,
  address: number,
  data: Uint8Array,
): Uint8Array {
  const header = encodeHeader(region, address, data.length, true);
  const packet = new Uint8Array(HEADER_SIZE + data.length);
  packet.set(header, 0);
  packet.set(data, HEADER_SIZE);
  return packet;
}
