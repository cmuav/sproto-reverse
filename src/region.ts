import type { ByteOrder16, ByteOrder32, RegionDef } from "./types.js";

const DEFAULT_BYTE_ORDER_16: ByteOrder16 = [0, 1];
const DEFAULT_BYTE_ORDER_32: ByteOrder32 = [0, 1, 2, 3];

/**
 * An in-memory buffer representing one device memory region.
 *
 * Data is stored as a flat byte array. Typed accessors (int8, int16, etc.)
 * apply the region's byte ordering.
 */
export class Region {
  /** Region number (0–15). */
  readonly number: number;

  /** Bytes per addressable unit (derived from device AddressBits). */
  readonly bits: number;

  /** Start address offset. */
  readonly offset: number;

  /** Length in addressable units. */
  readonly length: number;

  readonly byteOrder16: ByteOrder16;
  readonly byteOrder32: ByteOrder32;

  /** Raw buffer - `length * bits` bytes. */
  private readonly _data: Uint8Array;

  constructor(def: RegionDef, bits: number) {
    this.number = def.number;
    this.bits = bits;
    this.offset = def.offset;
    this.length = def.length;
    this.byteOrder16 = def.byteOrder16 ?? DEFAULT_BYTE_ORDER_16;
    this.byteOrder32 = def.byteOrder32 ?? DEFAULT_BYTE_ORDER_32;
    this._data = new Uint8Array(this.length * this.bits);
  }

  /** Total byte size of this region's buffer. */
  get byteLength(): number {
    return this._data.length;
  }

  /** Read raw bytes starting at `address` for `byteCount` bytes. */
  readRaw(address: number, byteCount: number): Uint8Array {
    const byteOffset = (address - this.offset) * this.bits;
    return this._data.slice(byteOffset, byteOffset + byteCount);
  }

  /** Write raw bytes starting at `address`. */
  writeRaw(address: number, data: Uint8Array): void {
    const byteOffset = (address - this.offset) * this.bits;
    this._data.set(data, byteOffset);
  }

  /** Overwrite the entire region buffer (e.g. after a bulk device read). */
  load(data: Uint8Array, address: number): void {
    const byteOffset = (address - this.offset) * this.bits;
    this._data.set(data, byteOffset);
  }

  // ── Typed accessors ──────────────────────────────────────────────────────

  readUint8(address: number): number {
    return this.readRaw(address, 1)[0];
  }

  readInt8(address: number): number {
    const v = this.readUint8(address);
    return v > 127 ? v - 256 : v;
  }

  readUint16(address: number): number {
    const b = this.readRaw(address, 2);
    return (b[this.byteOrder16[1]] << 8) | b[this.byteOrder16[0]];
  }

  readInt16(address: number): number {
    const v = this.readUint16(address);
    return v > 32767 ? v - 65536 : v;
  }

  readUint32(address: number): number {
    const b = this.readRaw(address, 4);
    return (
      ((b[this.byteOrder32[3]] << 24) |
        (b[this.byteOrder32[2]] << 16) |
        (b[this.byteOrder32[1]] << 8) |
        b[this.byteOrder32[0]]) >>>
      0
    );
  }

  readInt32(address: number): number {
    const b = this.readRaw(address, 4);
    return (
      (b[this.byteOrder32[3]] << 24) |
      (b[this.byteOrder32[2]] << 16) |
      (b[this.byteOrder32[1]] << 8) |
      b[this.byteOrder32[0]]
    );
  }

  readAscii(address: number, length: number): string {
    const bytes = this.readRaw(address, length);
    let s = "";
    for (let i = 0; i < bytes.length; i++) {
      if (bytes[i] === 0) break;
      s += String.fromCharCode(bytes[i]);
    }
    return s;
  }

  /** Read IQ22 fixed-point (int32 / 2^22). */
  readIQ22(address: number): number {
    return this.readInt32(address) / (1 << 22);
  }

  /** Read Sprc_t percentage (int16 / 100). */
  readSprc(address: number): number {
    return this.readInt16(address) / 100;
  }

  /** Read Smeas_t measurement (int16 / 100). */
  readSmeas(address: number): number {
    return this.readInt16(address) / 100;
  }

  writeUint8(address: number, value: number): void {
    this.writeRaw(address, new Uint8Array([value & 0xff]));
  }

  writeInt8(address: number, value: number): void {
    this.writeUint8(address, value < 0 ? value + 256 : value);
  }

  writeUint16(address: number, value: number): void {
    const b = new Uint8Array(2);
    b[this.byteOrder16[0]] = value & 0xff;
    b[this.byteOrder16[1]] = (value >> 8) & 0xff;
    this.writeRaw(address, b);
  }

  writeInt16(address: number, value: number): void {
    this.writeUint16(address, value < 0 ? value + 65536 : value);
  }

  writeUint32(address: number, value: number): void {
    const b = new Uint8Array(4);
    b[this.byteOrder32[0]] = value & 0xff;
    b[this.byteOrder32[1]] = (value >> 8) & 0xff;
    b[this.byteOrder32[2]] = (value >> 16) & 0xff;
    b[this.byteOrder32[3]] = (value >> 24) & 0xff;
    this.writeRaw(address, b);
  }

  writeInt32(address: number, value: number): void {
    this.writeUint32(address, value < 0 ? value + 4294967296 : value);
  }

  writeAscii(address: number, value: string, length: number): void {
    const b = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      b[i] = i < value.length ? value.charCodeAt(i) : 0;
    }
    this.writeRaw(address, b);
  }

  writeIQ22(address: number, value: number): void {
    this.writeInt32(address, Math.round(value * (1 << 22)));
  }

  writeSprc(address: number, value: number): void {
    this.writeInt16(address, Math.round(value * 100));
  }

  writeSmeas(address: number, value: number): void {
    this.writeInt16(address, Math.round(value * 100));
  }
}
