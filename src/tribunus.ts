/**
 * Tribunus ESC definitions — region layout, parameter maps, enum constants,
 * and a convenience factory for creating a fully-configured SprotoDevice.
 *
 * Supports both Tribunus (original) and Tribunus III ESCs.
 */

import { SprotoDevice } from "./device.js";
import { Region } from "./region.js";
import type { DeviceConfig, RegionDef, Transport } from "./types.js";

// ── Enum Constants ───────────────────────────────────────────────────────────

export const TribunusTypes = {
  "6S_120": 0x12, "12S_80": 0x14, "12S_130": 0x16,
  "16S_300": 0x1a, "14S_200": 0x1c,
} as const;
export type TribunusType = (typeof TribunusTypes)[keyof typeof TribunusTypes];

export const TribunusIIITypes = {
  UNDEFINED: 0x00, "6S_80": 0x01, "6S_100": 0x02, "6S_160": 0x03,
  "8S_120": 0x04, "8S_160": 0x05, "12S_130": 0x06, "14S_200": 0x07,
  "16S_200": 0x08, "16S_300": 0x09, "12S_130_DOBC": 0x0a,
} as const;
export type TribunusIIIType = (typeof TribunusIIITypes)[keyof typeof TribunusIIITypes];

export const DeviceModes = {
  PID_RECALCULATED: 0, PID_PRESTORED: 1, PID_VBAR: 2, PID_EXTERNAL: 3,
  AIRPLANE: 4, BOAT: 5, AIRPLANE_WITH_REVERSE: 6,
} as const;
export type DeviceMode = (typeof DeviceModes)[keyof typeof DeviceModes];

export const BecVoltages = {
  BEC_5_1: 0, BEC_6_1: 1, BEC_7_3: 2, BEC_8_3: 3, BEC_DISABLED: 4,
} as const;
export type BecVoltage = (typeof BecVoltages)[keyof typeof BecVoltages];

export const BecVoltagesIII = {
  BEC_0: 0, BEC_1: 1, BEC_2: 2, BEC_3: 3, BEC_4: 4,
  BEC_5: 5, BEC_6: 6, BEC_7: 7, BEC_8: 8,
} as const;
export type BecVoltageIII = (typeof BecVoltagesIII)[keyof typeof BecVoltagesIII];

export const Protocols = {
  STANDARD: 0, VBAR: 1, JETI_EXBUS: 2, UNSOLICITED: 3, FUTABA: 4,
} as const;

export const ProtocolsIII = {
  ...Protocols,
  FRSKY_SMART_PORT: 5, JR_DMSS: 6, TRIGGER: 7, SLEEP_BUTTON: 8,
} as const;
export type Protocol = (typeof ProtocolsIII)[keyof typeof ProtocolsIII];

export const RotationDirections = { CCW: 0, CW: 1 } as const;
export type RotationDirection = (typeof RotationDirections)[keyof typeof RotationDirections];

export const GovernorModes = { SOFT: 0, MEDIUM: 1, HARD: 2, CUSTOM: 3 } as const;
export type GovernorMode = (typeof GovernorModes)[keyof typeof GovernorModes];

export const PwmModes = { REGULAR: 0, COMPLIMENTARY: 1 } as const;
export type PwmMode = (typeof PwmModes)[keyof typeof PwmModes];

export const ExternalControls = { DISABLED: 0, ENABLED: 1 } as const;
export type ExternalControl = (typeof ExternalControls)[keyof typeof ExternalControls];

export const IGainCorrections = { DISABLED: 0, ENABLED: 1 } as const;
export type IGainCorrection = (typeof IGainCorrections)[keyof typeof IGainCorrections];

export const TemperatureUnits = { CELSIUS: 0, FAHRENHEIT: 1 } as const;
export type TemperatureUnit = (typeof TemperatureUnits)[keyof typeof TemperatureUnits];

export const SoundConfigurations = { ENABLED: 0, DISABLED: 1 } as const;
export type SoundConfiguration = (typeof SoundConfigurations)[keyof typeof SoundConfigurations];

export const SyncStates = { OK: 0x00, ERR: 0x40 } as const;
export type SyncState = (typeof SyncStates)[keyof typeof SyncStates];

export const VoltageLimitModes = { ENABLED: 0, DISABLED: 1 } as const;
export type VoltageLimitMode = (typeof VoltageLimitModes)[keyof typeof VoltageLimitModes];

export const CpuTempLogging = { DISABLED: 0, ENABLED: 1 } as const;
export type CpuTempLog = (typeof CpuTempLogging)[keyof typeof CpuTempLogging];

export const ResetCodes = {
  OK: 0x00, FIN: 0x01, FLASH: 0x02, LIMP: 0x03, SPARE_INT: 0x04,
  ILGL_ERR: 0x05, WDT_ERR: 0x06, SETISR_ERR: 0x07, MEM_ALLOC: 0x08,
  MEM_OVF: 0x09, TASK_OVF: 0x0a, STK_OVF: 0x0b, WP_ERR: 0x0c,
  NO_TASKS: 0x0d, PROTO_ACC: 0x0e, UINIT: 0x0f, WRNG_EFXN: 0x10,
  CLK_ERR: 0x11, UNKN: 0x7f,
} as const;
export type ResetCode = (typeof ResetCodes)[keyof typeof ResetCodes];

// ── Property Definition ──────────────────────────────────────────────────────

export interface PropertyDef {
  offset: number;
  type: "uint8" | "uint16" | "uint32" | "int8" | "int16" | "int32" | "iq22" | "sprc" | "smeas" | "ascii";
  size?: number;
  bits?: [number, number];
  div?: number;
  mask?: number;
  unit?: string;
  readOnly?: boolean;
  range?: [number, number];
  enumName?: string;
  group?: "main" | "heli" | "plane" | "protection" | "configuration";
}

// ── System Properties (Region 0) ─────────────────────────────────────────────

export const TribunusSystemProps = {
  serialNumber:      { offset: 4,  type: "uint32", readOnly: true },
  deviceType:        { offset: 7,  type: "uint8",  readOnly: true, enumName: "TribunusTypes" },
  bootloaderVersion: { offset: 8,  type: "uint16", readOnly: true },
  firmwareVersion:   { offset: 10, type: "uint16", readOnly: true },
  resetCode:         { offset: 12, type: "uint16", readOnly: true, mask: 0x7f, enumName: "ResetCodes" },
  logSize:           { offset: 16, type: "uint32", readOnly: true },
} as const satisfies Record<string, PropertyDef>;

// ── State Properties (Region 1) ──────────────────────────────────────────────

export const TribunusStateProps = {
  activeTime:  { offset: 0,  type: "uint32", bits: [0, 23],  div: 1000, unit: "s",   readOnly: true },
  throttle:    { offset: 0,  type: "uint32", bits: [24, 31], div: 2,    unit: "%",   readOnly: true },
  current:     { offset: 4,  type: "int16",  div: 10, unit: "A",  readOnly: true },
  batVolt:     { offset: 6,  type: "int16",  div: 10, unit: "V",  readOnly: true },
  consumption: { offset: 8,  type: "int16",  div: 1000, unit: "Ah", readOnly: true },
  mosfetTemp:  { offset: 10, type: "int16",  bits: [0, 7],   unit: "C",   readOnly: true },
  outputPower: { offset: 10, type: "int16",  bits: [8, 15],  div: 2, unit: "%", readOnly: true },
  becVolt:     { offset: 12, type: "uint32", bits: [0, 7],   div: 10, unit: "V", readOnly: true },
  motorRPM:    { offset: 12, type: "uint32", bits: [8, 23],  readOnly: true },
  errors:      { offset: 12, type: "uint32", bits: [24, 31], readOnly: true },
  cpuTemp:     { offset: 18, type: "uint16", bits: [0, 7],   unit: "C",   readOnly: true },
  timingAdv:   { offset: 18, type: "uint16", bits: [8, 15],  unit: "deg", readOnly: true },
} as const satisfies Record<string, PropertyDef>;

// ── Settings Properties (Region 3) ───────────────────────────────────────────
// Offsets are byte offsets as read from the wire.

export const TribunusSettingsProps = {
  // ── Main ──
  deviceName:        { offset: 0,   type: "ascii", size: 32, group: "main" },
  mode:              { offset: 32,  type: "uint16", enumName: "DeviceModes", group: "main" },
  becVoltage:        { offset: 34,  type: "uint16", enumName: "BecVoltages", group: "main" },
  rotationDirection: { offset: 36,  type: "uint16", enumName: "RotationDirections", group: "main" },
  protocol:          { offset: 38,  type: "uint16", enumName: "Protocols", group: "main" },
  fanOnTemperature:  { offset: 128, type: "smeas",  unit: "C", range: [0, 100], group: "main" },
  // ── Heli ──
  startTime:         { offset: 40,  type: "uint16", unit: "ms", range: [3000, 20000], group: "heli" },
  rampTime:          { offset: 42,  type: "uint16", unit: "ms", range: [3000, 20000], group: "heli" },
  bailoutTime:       { offset: 44,  type: "uint16", unit: "ms", range: [100, 10000], group: "heli" },
  pGain:             { offset: 48,  type: "iq22",   range: [0.3, 1.8], group: "heli" },
  iGain:             { offset: 52,  type: "iq22",   range: [1.5, 2.5], group: "heli" },
  dGain:             { offset: 56,  type: "iq22",   range: [0.35, 0.5], group: "heli" },
  iGainCorrection:   { offset: 114, type: "uint16", bits: [0, 0], enumName: "IGainCorrections", group: "heli" },
  storedRpm:         { offset: 88,  type: "uint32", group: "heli" },
  // ── Plane ──
  dragBrake:         { offset: 64,  type: "sprc",   unit: "%", range: [0, 100], group: "plane" },
  acceleration:      { offset: 66,  type: "uint16", unit: "ms", range: [100, 1000], group: "plane" },
  pwmMode:           { offset: 68,  type: "uint16", enumName: "PwmModes", group: "plane" },
  // ── Protection ──
  cutoffDelay:       { offset: 70,  type: "uint16", unit: "ms", range: [0, 60000], group: "protection" },
  minVoltage:        { offset: 72,  type: "smeas",  unit: "V", range: [0, 70], group: "protection" },
  maxTemperature:    { offset: 74,  type: "smeas",  unit: "C", range: [0, 150], group: "protection" },
  maxCurrent:        { offset: 76,  type: "smeas",  unit: "A", range: [0, 320], group: "protection" },
  cutoffPower:       { offset: 78,  type: "sprc",   unit: "%", range: [0, 100], group: "protection" },
  maxConsumption:    { offset: 80,  type: "smeas",  unit: "Ah", range: [0, 60], group: "protection" },
  protectionMargin:  { offset: 124, type: "sprc",   unit: "%", range: [0, 100], group: "protection" },
  voltageLimitMode:  { offset: 104, type: "uint16", bits: [15, 15], enumName: "VoltageLimitModes", group: "protection" },
  voltageLimit:      { offset: 104, type: "smeas",  unit: "V", range: [1, 70], group: "protection" },
  // ── Configuration ──
  soundConfiguration: { offset: 82,  type: "uint16", range: [0, 100], group: "configuration" },
  gearRatio:          { offset: 110, type: "smeas",  range: [1, 100], group: "configuration" },
  polePairs:          { offset: 112, type: "uint16", range: [1, 100], group: "configuration" },
  sensitivityGain:    { offset: 102, type: "sprc",   unit: "%", range: [-70, 70], group: "configuration" },
  rpmCorrection:      { offset: 106, type: "sprc",   unit: "%", range: [-10, 10], group: "configuration" },
  minThrottle:        { offset: 120, type: "uint32", div: 60000, unit: "ms", range: [0.8, 2.5], group: "configuration" },
  zeroThrottle:       { offset: 96,  type: "uint32", div: 60000, unit: "ms", range: [0.8, 2.5], group: "configuration" },
  maxThrottle:        { offset: 92,  type: "uint32", div: 60000, unit: "ms", range: [0.8, 2.5], group: "configuration" },
  cpuTempLogging:     { offset: 114, type: "uint16", bits: [1, 1], enumName: "CpuTempLogging", group: "configuration" },
  telemetryId:        { offset: 100, type: "uint16", range: [0, 255], group: "configuration" },
} as const satisfies Record<string, PropertyDef>;

export const TRIBUNUS_SETTINGS_ORDER: (keyof typeof TribunusSettingsProps)[] = [
  "deviceName", "mode", "becVoltage", "rotationDirection", "protocol", "fanOnTemperature",
  "startTime", "rampTime", "bailoutTime", "pGain", "iGain", "dGain", "iGainCorrection", "storedRpm",
  "dragBrake", "acceleration", "pwmMode",
  "cutoffDelay", "minVoltage", "maxTemperature", "maxCurrent", "cutoffPower", "maxConsumption",
  "protectionMargin", "voltageLimitMode", "voltageLimit",
  "soundConfiguration", "gearRatio", "polePairs", "sensitivityGain", "rpmCorrection",
  "minThrottle", "zeroThrottle", "maxThrottle", "cpuTempLogging", "telemetryId",
];

// ── User Properties (Region 6) ──────────────────────────────────────────────

export const TribunusUserProps = {
  motorRunCount:  { offset: 2, type: "uint16", readOnly: true },
  totalMotorTime: { offset: 4, type: "uint16", readOnly: true, div: 10, unit: "s" },
  totalDischarge: { offset: 8, type: "uint16", readOnly: true, unit: "mAh" },
} as const satisfies Record<string, PropertyDef>;

// ── Region Definitions ───────────────────────────────────────────────────────

export const TRIBUNUS_SYSTEM_REGION:   RegionDef = { number: 0, offset: 0, length: 20 };
export const TRIBUNUS_STATE_REGION:    RegionDef = { number: 1, offset: 0, length: 20 };
export const TRIBUNUS_CONTROL_REGION:  RegionDef = { number: 2, offset: 0, length: 16 };
/** Settings uses word-addressed reads on the wire (addressDivisor: 2). */
export const TRIBUNUS_SETTINGS_REGION: RegionDef = { number: 3, offset: 0, length: 132, addressDivisor: 2 };
export const TRIBUNUS_FIRMWARE_REGION: RegionDef = { number: 4, offset: 0, length: 32752 };
export const TRIBUNUS_LOG_REGION:      RegionDef = { number: 5, offset: 0, length: 128000 };
export const TRIBUNUS_USER_REGION:     RegionDef = { number: 6, offset: 0, length: 12 };
export const TRIBUNUS_ERASE_REGION:    RegionDef = { number: 7, offset: 0, length: 32752 };

export const TRIBUNUS_REGIONS = [
  TRIBUNUS_SYSTEM_REGION, TRIBUNUS_STATE_REGION, TRIBUNUS_CONTROL_REGION,
  TRIBUNUS_SETTINGS_REGION, TRIBUNUS_FIRMWARE_REGION, TRIBUNUS_LOG_REGION,
  TRIBUNUS_USER_REGION, TRIBUNUS_ERASE_REGION,
] as const;

// ── Device Configuration Defaults ────────────────────────────────────────────

export const TRIBUNUS_DEVICE_CONFIG: Required<DeviceConfig> = {
  baudRate: 38400, addressBits: 8, messageTimeout: 3000,
  resendCount: 3, maxDataLength: 32, duplex: false,
};

// ── Firmware Signatures ──────────────────────────────────────────────────────

export const TRIBUNUS_FW_SIGNATURE_OFFSET = 14;
export const TRIBUNUS_FW_SIGNATURE = 0x4e42;

export const TRIBUNUS_SETTINGS_SIGNATURE_OFFSET = 84;
export const TRIBUNUS_SETTINGS_SIGNATURE = 0x356a;

// ── Factory ──────────────────────────────────────────────────────────────────

export interface TribunusDevice {
  device: SprotoDevice;
  regions: {
    system: Region; state: Region; control: Region; settings: Region;
    firmware: Region; log: Region; user: Region; erase: Region;
  };
}

export function createTribunusDevice(transport: Transport): TribunusDevice {
  const device = new SprotoDevice(transport, TRIBUNUS_DEVICE_CONFIG);
  return {
    device,
    regions: {
      system:   device.addRegion(TRIBUNUS_SYSTEM_REGION),
      state:    device.addRegion(TRIBUNUS_STATE_REGION),
      control:  device.addRegion(TRIBUNUS_CONTROL_REGION),
      settings: device.addRegion(TRIBUNUS_SETTINGS_REGION),
      firmware: device.addRegion(TRIBUNUS_FIRMWARE_REGION),
      log:      device.addRegion(TRIBUNUS_LOG_REGION),
      user:     device.addRegion(TRIBUNUS_USER_REGION),
      erase:    device.addRegion(TRIBUNUS_ERASE_REGION),
    },
  };
}

// ── Bit-field Utility ────────────────────────────────────────────────────────

export function extractBits(value: number, startBit: number, endBit: number): number {
  const mask = (1 << (endBit - startBit + 1)) - 1;
  return (value >>> startBit) & mask;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRIBUNUS II — Original Tribunus / Tribunus II+ ESCs
//
// Key differences from III:
//   - ALL regions use word addressing on the wire (addressDivisor: 2)
//   - State uses IQ22 fixed-point for all telemetry values (not bit-packed)
//   - Settings offsets are different (name=16 words, mode=W16, BEC=W17, etc.)
//   - Smaller regions: system=7 words, state=18 words, settings=58 words
//   - Fewer BEC options (5 vs 9), fewer protocols (4 vs 9)
//   - No user region, no control region, no fan temp, no voltage limit
// ═══════════════════════════════════════════════════════════════════════════════

// W(n) helper: Lua word offset → byte offset in the word-addressed buffer
const W = (n: number) => n * 2;

// ── Tribunus II System Properties (Region 0, 7 words = 14 bytes) ─────────────

export const TribunusIISystemProps = {
  activeTime:        { offset: W(0), type: "uint32", readOnly: true, div: 1000, unit: "s" },
  serialNumber:      { offset: W(2), type: "uint32", readOnly: true },
  escType:           { offset: 7,    type: "uint8",  readOnly: true, enumName: "TribunusTypes" },
  bootloaderVersion: { offset: W(4), type: "uint16", readOnly: true },
  firmwareVersion:   { offset: W(5), type: "uint16", readOnly: true },
} as const satisfies Record<string, PropertyDef>;

// ── Tribunus II State Properties (Region 1, 18 words = 36 bytes) ─────────────
// All values are IQ22 fixed-point (int32 / 2^22).

export const TribunusIIStateProps = {
  throttle:         { offset: W(0),  type: "iq22", readOnly: true, unit: "%" },   // multiply by 100
  motorRPM:         { offset: W(2),  type: "uint32", readOnly: true },
  supplyVoltage:    { offset: W(4),  type: "iq22", readOnly: true, unit: "V" },
  current:          { offset: W(6),  type: "iq22", readOnly: true, unit: "A" },
  cpuTemperature:   { offset: W(8),  type: "iq22", readOnly: true, unit: "C" },
  mosfetTemperature:{ offset: W(10), type: "iq22", readOnly: true, unit: "C" },
  outputPower:      { offset: W(12), type: "iq22", readOnly: true, unit: "%" },   // multiply by 100
  becVoltage:       { offset: W(14), type: "iq22", readOnly: true, unit: "V" },
  powerConsumption: { offset: W(16), type: "iq22", readOnly: true, unit: "Ah" },
} as const satisfies Record<string, PropertyDef>;

// ── Tribunus II Settings Properties (Region 3, 58 words = 116 bytes) ─────────

export const TribunusIISettingsProps = {
  // Name: 32 bytes (16 words) at word 0
  deviceName:            { offset: W(0),  type: "ascii", size: 32, group: "main" as const },
  mode:                  { offset: W(16), type: "uint16", enumName: "DeviceModes", group: "main" as const },
  becVoltage:            { offset: W(17), type: "uint16", enumName: "BecVoltages", group: "main" as const },
  rotationDirection:     { offset: W(18), type: "uint16", enumName: "RotationDirections", group: "main" as const },
  protocol:              { offset: W(19), type: "uint16", enumName: "Protocols", group: "main" as const },
  // Heli
  startTime:             { offset: W(20), type: "uint16", unit: "ms", range: [3000, 20000] as [number,number], group: "heli" as const },
  rampTime:              { offset: W(21), type: "uint16", unit: "ms", range: [3000, 20000] as [number,number], group: "heli" as const },
  bailoutTime:           { offset: W(22), type: "uint16", unit: "ms", range: [100, 10000] as [number,number], group: "heli" as const },
  // word 23 unused
  pGain:                 { offset: W(24), type: "iq22", range: [0.3, 1.8] as [number,number], group: "heli" as const },
  iGain:                 { offset: W(26), type: "iq22", range: [1.5, 2.5] as [number,number], group: "heli" as const },
  dGain:                 { offset: W(28), type: "iq22", range: [0.35, 0.5] as [number,number], group: "heli" as const },
  smooth:                { offset: W(30), type: "iq22", group: "heli" as const },
  // Plane
  dragBrake:             { offset: W(32), type: "sprc", unit: "%", range: [0, 100] as [number,number], group: "plane" as const },
  acceleration:          { offset: W(33), type: "uint16", unit: "ms", range: [100, 1000] as [number,number], group: "plane" as const },
  pwmMode:               { offset: W(34), type: "uint16", enumName: "PwmModes", group: "plane" as const },
  // Protection
  cutoffDelay:           { offset: W(35), type: "uint16", unit: "ms", range: [0, 60000] as [number,number], group: "protection" as const },
  minVoltage:            { offset: W(36), type: "smeas", unit: "V", range: [0, 70] as [number,number], group: "protection" as const },
  maxTemperature:        { offset: W(37), type: "smeas", unit: "C", range: [0, 150] as [number,number], group: "protection" as const },
  maxCurrent:            { offset: W(38), type: "smeas", unit: "A", range: [0, 320] as [number,number], group: "protection" as const },
  cutoffPower:           { offset: W(39), type: "smeas", unit: "%", range: [0, 100] as [number,number], group: "protection" as const },
  maxConsumption:        { offset: W(40), type: "smeas", unit: "Ah", range: [0, 60] as [number,number], group: "protection" as const },
  // Configuration
  soundConfiguration:    { offset: W(41), type: "uint16", range: [0, 100] as [number,number], group: "configuration" as const },
  // words 42-43: signature + FW version (read-only)
  settingsSignature:     { offset: W(42), type: "uint16", readOnly: true },
  settingsFwVersion:     { offset: W(43), type: "uint16", readOnly: true },
  storedRpm:             { offset: W(44), type: "uint32", group: "heli" as const },
  throttleMaxCal:        { offset: W(46), type: "uint32", div: 60000, unit: "ms", range: [0.8, 2.5] as [number,number], group: "configuration" as const },
  throttleZeroCal:       { offset: W(48), type: "uint32", div: 60000, unit: "ms", range: [0.8, 2.5] as [number,number], group: "configuration" as const },
  // word 50 unused
  sensitivityGain:       { offset: W(51), type: "sprc", unit: "%", range: [-70, 70] as [number,number], group: "configuration" as const },
  dynamicProtection:     { offset: W(52), type: "uint16", group: "configuration" as const },
  rpmCorrection:         { offset: W(53), type: "sprc", unit: "%", range: [-10, 10] as [number,number], group: "configuration" as const },
  throttleMinCal:        { offset: W(54), type: "uint32", div: 60000, unit: "ms", readOnly: true, group: "configuration" as const },
} as const satisfies Record<string, PropertyDef>;

export const TRIBUNUS_II_SETTINGS_ORDER: (keyof typeof TribunusIISettingsProps)[] = [
  "deviceName", "mode", "becVoltage", "rotationDirection", "protocol",
  "startTime", "rampTime", "bailoutTime", "pGain", "iGain", "dGain", "smooth", "storedRpm",
  "dragBrake", "acceleration", "pwmMode",
  "cutoffDelay", "minVoltage", "maxTemperature", "maxCurrent", "cutoffPower", "maxConsumption",
  "soundConfiguration", "sensitivityGain", "rpmCorrection",
  "throttleMaxCal", "throttleZeroCal", "throttleMinCal",
];

// ── Tribunus II Region Definitions ───────────────────────────────────────────
// ALL regions use word addressing (addressDivisor: 2).

export const TRIBUNUS_II_SYSTEM_REGION:   RegionDef = { number: 0, offset: 0, length: 7,  addressDivisor: 2 };
export const TRIBUNUS_II_STATE_REGION:    RegionDef = { number: 1, offset: 0, length: 18, addressDivisor: 2 };
export const TRIBUNUS_II_SETTINGS_REGION: RegionDef = { number: 3, offset: 0, length: 58, addressDivisor: 2 };
export const TRIBUNUS_II_FIRMWARE_REGION: RegionDef = { number: 4, offset: 0x3F2000, length: 0x3FF8, addressDivisor: 2 };

// ── Tribunus II Factory ──────────────────────────────────────────────────────

export interface TribunusIIDevice {
  device: SprotoDevice;
  regions: {
    system: Region;
    state: Region;
    settings: Region;
    firmware: Region;
  };
}

export function createTribunusIIDevice(transport: Transport): TribunusIIDevice {
  const device = new SprotoDevice(transport, TRIBUNUS_DEVICE_CONFIG);
  return {
    device,
    regions: {
      system:   device.addRegion(TRIBUNUS_II_SYSTEM_REGION),
      state:    device.addRegion(TRIBUNUS_II_STATE_REGION),
      settings: device.addRegion(TRIBUNUS_II_SETTINGS_REGION),
      firmware: device.addRegion(TRIBUNUS_II_FIRMWARE_REGION),
    },
  };
}
