import { HEADER_SIZE, buildReadPacket, buildWritePacket, decodeHeader } from "./packet.js";
import { Region } from "./region.js";
import type { AddressBits, DeviceConfig, RegionDef, Transport } from "./types.js";

const DEFAULT_CONFIG: Required<DeviceConfig> = {
  baudRate: 38400,
  addressBits: 8,
  messageTimeout: 3000,
  resendCount: 3,
  maxDataLength: 16,
  duplex: false,
};

function bitsFromAddressBits(ab: AddressBits): number {
  switch (ab) {
    case 8: return 1;
    case 16: return 2;
    case 32: return 4;
  }
}

/**
 * High-level Sproto device interface.
 *
 * Wraps a {@link Transport} and provides typed region read/write operations
 * with automatic chunking, retries, and half-duplex echo handling.
 *
 * @example
 * ```ts
 * import { SprotoDevice } from "sproto-protocol";
 *
 * const device = new SprotoDevice(myTransport, {
 *   baudRate: 38400,
 *   addressBits: 16,
 *   maxDataLength: 64,
 * });
 *
 * const configRegion = device.addRegion({ number: 1, offset: 0, length: 256 });
 *
 * // Read the entire region from the device
 * await device.readRegion(configRegion);
 *
 * // Access typed values
 * const voltage = configRegion.readSmeas(0x10);
 * console.log(`Voltage: ${voltage}V`);
 *
 * // Write a value and push to device
 * configRegion.writeSprc(0x20, 75.5);
 * await device.writeRegion(configRegion);
 * ```
 */
export class SprotoDevice {
  private readonly _transport: Transport;
  private readonly _config: Required<DeviceConfig>;
  private readonly _bits: number;
  private readonly _regions: Map<number, Region> = new Map();

  constructor(transport: Transport, config?: DeviceConfig) {
    this._transport = transport;
    this._config = { ...DEFAULT_CONFIG, ...config };
    this._bits = bitsFromAddressBits(this._config.addressBits);
  }

  /** The resolved device configuration. */
  get config(): Readonly<Required<DeviceConfig>> {
    return this._config;
  }

  /** Bytes per addressable unit. */
  get unitSize(): number {
    return this._bits;
  }

  // ── Region management ──────────────────────────────────────────────────

  /**
   * Register a memory region. Returns the created {@link Region} instance
   * which can be used for typed access to the local buffer.
   */
  addRegion(def: RegionDef): Region {
    if (this._regions.has(def.number)) {
      throw new Error(`Region ${def.number} already registered`);
    }
    const region = new Region(def, this._bits);
    this._regions.set(def.number, region);
    return region;
  }

  /** Remove a previously registered region. */
  removeRegion(regionNumber: number): void {
    this._regions.delete(regionNumber);
  }

  /** Get a registered region by number. */
  getRegion(regionNumber: number): Region | undefined {
    return this._regions.get(regionNumber);
  }

  // ── Low-level transaction ──────────────────────────────────────────────

  /**
   * Execute a raw read transaction.
   *
   * Sends a read header, reads the response header, then reads the data payload.
   * Handles half-duplex echo if configured.
   *
   * @returns The data bytes read from the device.
   */
  async rawRead(region: number, address: number, length: number): Promise<Uint8Array> {
    const packet = buildReadPacket(region, address, length);

    await this._transport.write(packet);

    // Half-duplex: device echoes our write back
    if (!this._config.duplex) {
      await this._transport.read(packet.length);
    }

    // Read response header
    const respHeader = await this._transport.read(HEADER_SIZE);
    const resp = decodeHeader(respHeader);

    // Read data payload
    const data = await this._transport.read(resp.length);
    return data;
  }

  /**
   * Execute a raw write transaction.
   *
   * Sends a write header + data, reads the response header to confirm.
   *
   * @returns The acknowledged length from the device.
   */
  async rawWrite(region: number, address: number, data: Uint8Array): Promise<number> {
    const packet = buildWritePacket(region, address, data);

    await this._transport.write(packet);

    // Half-duplex: device echoes our write back
    if (!this._config.duplex) {
      await this._transport.read(packet.length);
    }

    // Read response header
    const respHeader = await this._transport.read(HEADER_SIZE);
    const resp = decodeHeader(respHeader);
    return resp.length;
  }

  // ── Chunked region operations ──────────────────────────────────────────

  /**
   * Read the entire region (or a sub-range) from the device into the local
   * region buffer. Automatically chunks large reads.
   *
   * @param region  - The region to read into.
   * @param start   - Start address. Defaults to region offset.
   * @param length  - Byte count to read. Defaults to full region.
   * @param onProgress - Optional callback with 0–100 progress.
   */
  async readRegion(
    region: Region,
    start?: number,
    length?: number,
    onProgress?: (pct: number) => void,
  ): Promise<void> {
    const startAddr = start ?? region.offset;
    const totalBytes = length ?? region.length * this._bits;
    const maxChunk = this._config.maxDataLength;
    const addrDiv = region.addressDivisor;

    let remaining = totalBytes;
    let byteOffset = startAddr;

    while (remaining > 0) {
      const chunkLen = Math.min(remaining, maxChunk);
      const wireAddr = byteOffset / addrDiv;
      const data = await this._transact(() => this.rawRead(region.number, wireAddr, chunkLen));

      region.load(data, byteOffset);

      byteOffset += chunkLen;
      remaining -= chunkLen;

      if (onProgress) {
        const pct = Math.round(((totalBytes - remaining) / totalBytes) * 100);
        onProgress(pct);
      }
    }
  }

  /**
   * Write the entire region (or a sub-range) from the local buffer to the
   * device. Automatically chunks large writes.
   *
   * @param region  - The region to write from.
   * @param start   - Start address. Defaults to region offset.
   * @param length  - Byte count to write. Defaults to full region.
   * @param onProgress - Optional callback with 0–100 progress.
   */
  async writeRegion(
    region: Region,
    start?: number,
    length?: number,
    onProgress?: (pct: number) => void,
  ): Promise<void> {
    const startAddr = start ?? region.offset;
    const totalBytes = length ?? region.length * this._bits;
    const maxChunk = this._config.maxDataLength;
    const addrDiv = region.addressDivisor;

    let remaining = totalBytes;
    let byteOffset = startAddr;

    while (remaining > 0) {
      const chunkLen = Math.min(remaining, maxChunk);
      const wireAddr = byteOffset / addrDiv;
      const data = region.readRaw(byteOffset, chunkLen);
      const acked = await this._transact(() => this.rawWrite(region.number, wireAddr, data));

      if (acked !== chunkLen) {
        throw new Error(
          `Write to region ${region.number} at 0x${byteOffset.toString(16)}: ` +
          `expected ack ${chunkLen}, got ${acked}`,
        );
      }

      byteOffset += chunkLen;
      remaining -= chunkLen;

      if (onProgress) {
        const pct = Math.round(((totalBytes - remaining) / totalBytes) * 100);
        onProgress(pct);
      }
    }
  }

  // ── Retry wrapper ──────────────────────────────────────────────────────

  private async _transact<T>(fn: () => Promise<T>): Promise<T> {
    let lastErr: unknown;

    for (let attempt = 0; attempt < this._config.resendCount; attempt++) {
      try {
        return await fn();
      } catch (e) {
        lastErr = e;
        if (attempt < this._config.resendCount - 1) {
          await sleep(500);
          await this._transport.clear();
        }
      }
    }

    throw lastErr;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
