import {
  encodeSig,
  decodeSig,
  encodeHeader,
  decodeHeader,
  buildReadPacket,
  buildWritePacket,
  HEADER_SIZE,
} from "./packet.js";
import { Region } from "./region.js";
import { parseSRec, generateSRec } from "./srec.js";

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`  FAIL: ${name}`);
  }
}

function eq(a: unknown, b: unknown, name: string) {
  assert(a === b, `${name} - expected ${b}, got ${a}`);
}

// ── Packet tests ─────────────────────────────────────────────────────────────

console.log("Packet encoding...");

// Read from region 1 → sig = 0_101_0001 = 0x51
eq(encodeSig(false, 1), 0x51, "read sig region 1");
// Write to region 1 → sig = 1_101_0001 = 0xD1
eq(encodeSig(true, 1), 0xd1, "write sig region 1");
// Read from region 15 → 0_101_1111 = 0x5F
eq(encodeSig(false, 15), 0x5f, "read sig region 15");

const decoded = decodeSig(0xd1);
eq(decoded.write, true, "decodeSig write");
eq(decoded.region, 1, "decodeSig region");

const header = encodeHeader(1, 0x001234, 16, false);
eq(header.length, HEADER_SIZE, "header length");
eq(header[0], 0x51, "header sig");
eq(header[1], 0x00, "header addr high");
eq(header[2], 0x12, "header addr mid");
eq(header[3], 0x34, "header addr low");
eq(header[4], 16, "header length field");
eq(header[5], 0, "header reserved");

const dh = decodeHeader(header);
eq(dh.write, false, "decoded write");
eq(dh.region, 1, "decoded region");
eq(dh.address, 0x001234, "decoded address");
eq(dh.length, 16, "decoded length");

const readPkt = buildReadPacket(2, 0, 32);
eq(readPkt.length, 6, "read packet length");

const writeData = new Uint8Array([0xaa, 0xbb, 0xcc]);
const writePkt = buildWritePacket(3, 0x100, writeData);
eq(writePkt.length, 6 + 3, "write packet length");
eq(writePkt[6], 0xaa, "write packet data[0]");

// ── Region tests ─────────────────────────────────────────────────────────────

console.log("Region typed access...");

const region = new Region(
  { number: 1, offset: 0, length: 64, byteOrder16: [0, 1], byteOrder32: [0, 1, 2, 3] },
  1, // 8-bit addressing
);

region.writeUint8(0, 42);
eq(region.readUint8(0), 42, "uint8 roundtrip");

region.writeInt8(1, -5);
eq(region.readInt8(1), -5, "int8 roundtrip");

region.writeUint16(2, 0x1234);
eq(region.readUint16(2), 0x1234, "uint16 roundtrip");

region.writeInt16(4, -1000);
eq(region.readInt16(4), -1000, "int16 roundtrip");

region.writeUint32(6, 0xdeadbeef);
eq(region.readUint32(6), 0xdeadbeef, "uint32 roundtrip");

region.writeInt32(10, -123456);
eq(region.readInt32(10), -123456, "int32 roundtrip");

region.writeAscii(14, "HELLO", 8);
eq(region.readAscii(14, 8), "HELLO", "ascii roundtrip");

region.writeIQ22(22, 3.14);
const iq22 = region.readIQ22(22);
assert(Math.abs(iq22 - 3.14) < 0.001, `IQ22 roundtrip - got ${iq22}`);

region.writeSprc(26, 75.5);
eq(region.readSprc(26), 75.5, "Sprc_t roundtrip");

region.writeSmeas(28, -12.34);
const smeas = region.readSmeas(28);
assert(Math.abs(smeas - -12.34) < 0.01, `Smeas_t roundtrip - got ${smeas}`);

// ── S-Record tests ───────────────────────────────────────────────────────────

console.log("S-Record parse/generate...");

// S3: bytecount=0x15(21) region=0x01 addr=0x000000 data=16 bytes checksum=1
const srec = "S315010000001122334455667788990011223344556677\nS310010001001122334455667788990011";
const entries = parseSRec(srec);
eq(entries.length, 2, "srec entry count");
eq(entries[0].region, 1, "srec entry 0 region");
eq(entries[0].address, 0, "srec entry 0 address");
eq(entries[0].data.length, 16, "srec entry 0 data length");
eq(entries[0].data[0], 0x11, "srec entry 0 data[0]");
eq(entries[1].address, 0x000100, "srec entry 1 address");

const regenerated = generateSRec(entries);
assert(regenerated.includes("S3"), "regenerated contains S3 lines");
const reparsed = parseSRec(regenerated);
eq(reparsed.length, 2, "re-parsed entry count");
eq(reparsed[0].data[0], 0x11, "re-parsed data preserved");

// ── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
