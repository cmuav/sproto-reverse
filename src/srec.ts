/**
 * Motorola S-Record parser and generator.
 *
 * Sproto uses S-Records (S1/S2/S3) for firmware files and config save/load.
 * In the S3 format used for config, the first byte of the address field
 * encodes the region number.
 */

function hexByte(b: number): string {
  return b.toString(16).padStart(2, "0").toUpperCase();
}

function parseHexByte(hex: string, offset: number): number {
  return parseInt(hex.substring(offset, offset + 2), 16);
}

/** A single parsed S-Record entry. */
export interface SRecEntry {
  region: number;
  address: number;
  data: Uint8Array;
}

/**
 * Parse an S-Record string into entries.
 *
 * Supports S1 (16-bit address), S2 (24-bit address), and S3 (32-bit address).
 * For S3 records, the first address byte is treated as the region number
 * (matching Sproto's convention).
 */
export function parseSRec(content: string): SRecEntry[] {
  const entries: SRecEntry[] = [];

  for (const raw of content.split("\n")) {
    const line = raw.trim();
    if (!line) continue;

    const type = line.substring(0, 2);
    const byteCount = parseHexByte(line, 2);

    switch (type) {
      case "S3": {
        const region = parseHexByte(line, 4);
        const address =
          (parseHexByte(line, 6) << 16) |
          (parseHexByte(line, 8) << 8) |
          parseHexByte(line, 10);
        const dataLen = byteCount - 5; // minus 4-byte addr + 1-byte checksum
        const data = new Uint8Array(dataLen);
        for (let i = 0; i < dataLen; i++) {
          data[i] = parseHexByte(line, 12 + i * 2);
        }
        entries.push({ region, address, data });
        break;
      }
      case "S2": {
        const address =
          (parseHexByte(line, 4) << 16) |
          (parseHexByte(line, 6) << 8) |
          parseHexByte(line, 8);
        const dataLen = byteCount - 4; // minus 3-byte addr + 1-byte checksum
        const data = new Uint8Array(dataLen);
        for (let i = 0; i < dataLen; i++) {
          data[i] = parseHexByte(line, 10 + i * 2);
        }
        entries.push({ region: 0, address, data });
        break;
      }
      case "S1": {
        const address = (parseHexByte(line, 4) << 8) | parseHexByte(line, 6);
        const dataLen = byteCount - 3; // minus 2-byte addr + 1-byte checksum
        const data = new Uint8Array(dataLen);
        for (let i = 0; i < dataLen; i++) {
          data[i] = parseHexByte(line, 8 + i * 2);
        }
        entries.push({ region: 0, address, data });
        break;
      }
    }
  }

  return entries;
}

/**
 * Generate S3-format S-Record content from region data.
 *
 * @param entries - Array of {region, address, data} entries to encode.
 * @param lineSize - Max data bytes per S-Record line. Default: 16.
 */
export function generateSRec(entries: SRecEntry[], lineSize = 16): string {
  const lines: string[] = [];

  for (const entry of entries) {
    let offset = 0;
    while (offset < entry.data.length) {
      const chunk = Math.min(lineSize, entry.data.length - offset);
      const addr = entry.address + offset;
      const byteCount = chunk + 5; // 4-byte addr + data + checksum placeholder

      let line = "S3" + hexByte(byteCount);
      line += hexByte(entry.region);
      line += hexByte((addr >> 16) & 0xff);
      line += hexByte((addr >> 8) & 0xff);
      line += hexByte(addr & 0xff);

      for (let i = 0; i < chunk; i++) {
        line += hexByte(entry.data[offset + i]);
      }

      lines.push(line);
      offset += chunk;
    }
  }

  return lines.join("\n");
}

/**
 * Convert raw S-Record firmware content into a flat byte array.
 * Strips addresses and concatenates all data segments in order.
 */
export function srecToBuffer(content: string): Uint8Array {
  const entries = parseSRec(content);
  const totalLen = entries.reduce((sum, e) => sum + e.data.length, 0);
  const result = new Uint8Array(totalLen);
  let offset = 0;
  for (const entry of entries) {
    result.set(entry.data, offset);
    offset += entry.data.length;
  }
  return result;
}
