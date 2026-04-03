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

// ── Tribunus module tests ────────────────────────────────────────────────────

console.log("Tribunus enums...");

import {
  TribunusTypes, DeviceModes, BecVoltages, Protocols, RotationDirections,
  ResetCodes, PwmModes, GovernorModes,
  TribunusSystemProps, TribunusStateProps, TribunusSettingsProps, TribunusUserProps,
  TRIBUNUS_SYSTEM_REGION, TRIBUNUS_STATE_REGION, TRIBUNUS_SETTINGS_REGION,
  TRIBUNUS_USER_REGION, TRIBUNUS_REGIONS, TRIBUNUS_DEVICE_CONFIG,
  TRIBUNUS_FW_SIGNATURE,
  createTribunusDevice, extractBits,
  type PropertyDef,
} from "./tribunus.js";
import type { Transport } from "./types.js";

eq(TribunusTypes["6S_120"], 0x12, "TribunusTypes 6S_120");
eq(TribunusTypes["14S_200"], 0x1c, "TribunusTypes 14S_200");
eq(DeviceModes.AIRPLANE, 4, "DeviceModes AIRPLANE");
eq(DeviceModes.AIRPLANE_WITH_REVERSE, 6, "DeviceModes AIRPLANE_WITH_REVERSE");
eq(BecVoltages.BEC_5_1, 0, "BecVoltages BEC_5_1");
eq(BecVoltages.BEC_DISABLED, 4, "BecVoltages BEC_DISABLED");
eq(Protocols.STANDARD, 0, "Protocols STANDARD");
eq(Protocols.FUTABA, 4, "Protocols FUTABA");
eq(RotationDirections.CCW, 0, "RotationDirections CCW");
eq(ResetCodes.OK, 0x00, "ResetCodes OK");
eq(ResetCodes.UNKN, 0x7f, "ResetCodes UNKN");
eq(PwmModes.COMPLIMENTARY, 1, "PwmModes COMPLIMENTARY");
eq(GovernorModes.CUSTOM, 3, "GovernorModes CUSTOM");

console.log("Tribunus region defs...");

eq(TRIBUNUS_SYSTEM_REGION.number, 0, "system region number");
eq(TRIBUNUS_SYSTEM_REGION.length, 20, "system region length");
eq(TRIBUNUS_STATE_REGION.number, 1, "state region number");
eq(TRIBUNUS_STATE_REGION.length, 20, "state region length");
eq(TRIBUNUS_SETTINGS_REGION.number, 3, "settings region number");
eq(TRIBUNUS_SETTINGS_REGION.length, 128, "settings region length");
eq(TRIBUNUS_USER_REGION.number, 6, "user region number");
eq(TRIBUNUS_USER_REGION.length, 12, "user region length");
eq(TRIBUNUS_REGIONS.length, 8, "total region count");

console.log("Tribunus config defaults...");

eq(TRIBUNUS_DEVICE_CONFIG.baudRate, 38400, "default baudRate");
eq(TRIBUNUS_DEVICE_CONFIG.duplex, false, "default duplex");
eq(TRIBUNUS_DEVICE_CONFIG.maxDataLength, 16, "default maxDataLength");
eq(TRIBUNUS_FW_SIGNATURE, 0x4e42, "firmware signature");

console.log("Tribunus property maps...");

const settingsKeys = Object.keys(TribunusSettingsProps);
assert(settingsKeys.length >= 30, `settings has ${settingsKeys.length} params (>=30)`);
eq(TribunusSettingsProps.deviceName.offset, 0, "deviceName offset");
eq(TribunusSettingsProps.deviceName.type, "ascii", "deviceName type");
eq(TribunusSettingsProps.mode.offset, 32, "mode offset");
eq(TribunusSettingsProps.pGain.type, "iq22", "pGain type");
eq(TribunusSettingsProps.polePairs.offset, 112, "polePairs offset");
eq(TribunusSettingsProps.minVoltage.unit, "V", "minVoltage unit");

eq(TribunusSystemProps.serialNumber.offset, 4, "serialNumber offset");
eq(TribunusSystemProps.firmwareVersion.offset, 10, "firmwareVersion offset");

eq(TribunusStateProps.batVolt.div, 10, "batVolt div");
eq(TribunusStateProps.throttle.bits![0], 24, "throttle bits start");
eq(TribunusStateProps.motorRPM.bits![0], 8, "motorRPM bits start");

eq(TribunusUserProps.motorRunCount.offset, 2, "motorRunCount offset");
eq(TribunusUserProps.totalMotorTime.div, 10, "totalMotorTime div");

console.log("Tribunus factory...");

const mockTransport: Transport = {
  write: async () => {},
  read: async (n: number) => new Uint8Array(n),
  clear: async () => {},
};

const trib = createTribunusDevice(mockTransport);
assert(trib.device !== null, "factory creates device");
eq(trib.regions.system.number, 0, "factory system region");
eq(trib.regions.system.byteLength, 20, "factory system byteLength");
eq(trib.regions.state.number, 1, "factory state region");
eq(trib.regions.settings.number, 3, "factory settings region");
eq(trib.regions.settings.byteLength, 128, "factory settings byteLength");
eq(trib.regions.user.number, 6, "factory user region");
eq(trib.regions.firmware.number, 4, "factory firmware region");
eq(trib.regions.log.number, 5, "factory log region");

console.log("extractBits...");

eq(extractBits(0xff000000, 24, 31), 0xff, "extractBits high byte");
eq(extractBits(0x00ffff00, 8, 23), 0xffff, "extractBits mid 16 bits");
eq(extractBits(0x000000ff, 0, 7), 0xff, "extractBits low byte");
eq(extractBits(0xabcdef12, 0, 23), 0xcdef12, "extractBits 24-bit low");

// Simulate reading bit-packed state data
const stateRegion = trib.regions.state;
// Write a known pattern: offset 0 = uint32 with activeTime in bits[0:23] and throttle in bits[24:31]
const activeTimeTicks = 5000; // 5 seconds * 1000
const throttleRaw = 150;     // 150/2 = 75%
const packed = (throttleRaw << 24) | activeTimeTicks;
const bytes = new Uint8Array(4);
bytes[0] = packed & 0xff;
bytes[1] = (packed >> 8) & 0xff;
bytes[2] = (packed >> 16) & 0xff;
bytes[3] = (packed >> 24) & 0xff;
stateRegion.writeRaw(0, bytes);
const raw32 = stateRegion.readUint32(0);
eq(extractBits(raw32, 0, 23), activeTimeTicks, "state activeTime extraction");
eq(extractBits(raw32, 24, 31), throttleRaw, "state throttle extraction");

// ── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
