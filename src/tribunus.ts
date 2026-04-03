/**
 * Tribunus ESC definitions — region layout, parameter maps, enum constants,
 * and a convenience factory for creating a fully-configured SprotoDevice.
 */

import { SprotoDevice } from "./device.js";
import { Region } from "./region.js";
import type { DeviceConfig, RegionDef, Transport } from "./types.js";

// ── Enum Constants ───────────────────────────────────────────────────────────

export const TribunusTypes = {
  "6S_120": 0x12,
  "12S_80": 0x14,
  "12S_130": 0x16,
  "16S_300": 0x1a,
  "14S_200": 0x1c,
} as const;
export type TribunusType = (typeof TribunusTypes)[keyof typeof TribunusTypes];

export const DeviceModes = {
  PID_RECALCULATED: 0,
  PID_PRESTORED: 1,
  PID_VBAR: 2,
  PID_EXTERNAL: 3,
  AIRPLANE: 4,
  BOAT: 5,
  AIRPLANE_WITH_REVERSE: 6,
} as const;
export type DeviceMode = (typeof DeviceModes)[keyof typeof DeviceModes];

export const BecVoltages = {
  BEC_5_1: 0,
  BEC_6_1: 1,
  BEC_7_3: 2,
  BEC_8_3: 3,
  BEC_DISABLED: 4,
} as const;
export type BecVoltage = (typeof BecVoltages)[keyof typeof BecVoltages];

export const Protocols = {
  STANDARD: 0,
  VBAR: 1,
  JETI_EXBUS: 2,
  UNSOLICITED: 3,
  FUTABA: 4,
} as const;
export type Protocol = (typeof Protocols)[keyof typeof Protocols];

export const RotationDirections = {
  CCW: 0,
  CW: 1,
} as const;
export type RotationDirection = (typeof RotationDirections)[keyof typeof RotationDirections];

export const GovernorModes = {
  SOFT: 0,
  MEDIUM: 1,
  HARD: 2,
  CUSTOM: 3,
} as const;
export type GovernorMode = (typeof GovernorModes)[keyof typeof GovernorModes];

export const PwmModes = {
  REGULAR: 0,
  COMPLIMENTARY: 1,
} as const;
export type PwmMode = (typeof PwmModes)[keyof typeof PwmModes];

export const ExternalControls = {
  DISABLED: 0,
  ENABLED: 1,
} as const;
export type ExternalControl = (typeof ExternalControls)[keyof typeof ExternalControls];

export const IGainCorrections = {
  DISABLED: 0,
  ENABLED: 1,
} as const;
export type IGainCorrection = (typeof IGainCorrections)[keyof typeof IGainCorrections];

export const TemperatureUnits = {
  CELSIUS: 0,
  FAHRENHEIT: 1,
} as const;
export type TemperatureUnit = (typeof TemperatureUnits)[keyof typeof TemperatureUnits];

export const SoundConfigurations = {
  ENABLED: 0,
  DISABLED: 1,
} as const;
export type SoundConfiguration = (typeof SoundConfigurations)[keyof typeof SoundConfigurations];

export const SyncStates = {
  OK: 0x00,
  ERR: 0x40,
} as const;
export type SyncState = (typeof SyncStates)[keyof typeof SyncStates];

export const ResetCodes = {
  OK: 0x00,
  FIN: 0x01,
  FLASH: 0x02,
  LIMP: 0x03,
  SPARE_INT: 0x04,
  ILGL_ERR: 0x05,
  WDT_ERR: 0x06,
  SETISR_ERR: 0x07,
  MEM_ALLOC: 0x08,
  MEM_OVF: 0x09,
  TASK_OVF: 0x0a,
  STK_OVF: 0x0b,
  WP_ERR: 0x0c,
  NO_TASKS: 0x0d,
  PROTO_ACC: 0x0e,
  UINIT: 0x0f,
  WRNG_EFXN: 0x10,
  CLK_ERR: 0x11,
  UNKN: 0x7f,
} as const;
export type ResetCode = (typeof ResetCodes)[keyof typeof ResetCodes];

// ── Property Definition ──────────────────────────────────────────────────────

export interface PropertyDef {
  /** Byte offset within the region buffer. */
  offset: number;
  /** Data type accessor. */
  type: "uint8" | "uint16" | "uint32" | "int8" | "int16" | "int32" | "iq22" | "sprc" | "smeas" | "ascii";
  /** Byte length for ASCII fields. */
  size?: number;
  /** Bit extraction [startBit, endBit] within the value at offset. */
  bits?: [number, number];
  /** Divisor applied after reading (e.g. 10 means value/10). */
  div?: number;
  /** Bitmask applied before interpreting. */
  mask?: number;
  /** Human-readable unit. */
  unit?: string;
  /** If true, field is read-only. */
  readOnly?: boolean;
  /** Valid range [min, max]. */
  range?: [number, number];
  /** Name of the enum constant object this maps to (for documentation). */
  enumName?: string;
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

// ── State Properties (Region 1) — bit-packed live telemetry ──────────────────

export const TribunusStateProps = {
  activeTime:  { offset: 0,  type: "uint32", bits: [0, 23],  div: 1000, unit: "s",  readOnly: true },
  throttle:    { offset: 0,  type: "uint32", bits: [24, 31], div: 2,    unit: "%",  readOnly: true },
  current:     { offset: 4,  type: "int16",  div: 10, unit: "A",  readOnly: true },
  batVolt:     { offset: 6,  type: "int16",  div: 10, unit: "V",  readOnly: true },
  consumption: { offset: 8,  type: "int16",  div: 1000, unit: "Ah", readOnly: true },
  mosfetTemp:  { offset: 10, type: "int16",  bits: [0, 7],   unit: "C",  readOnly: true },
  outputPower: { offset: 10, type: "int16",  bits: [8, 15],  div: 2, unit: "%", readOnly: true },
  becVolt:     { offset: 12, type: "uint32", bits: [0, 7],   div: 10, unit: "V", readOnly: true },
  motorRPM:    { offset: 12, type: "uint32", bits: [8, 23],  readOnly: true },
  errors:      { offset: 12, type: "uint32", bits: [24, 31], readOnly: true },
  cpuTemp:     { offset: 18, type: "uint16", bits: [0, 7],   unit: "C",  readOnly: true },
  timingAdv:   { offset: 18, type: "uint16", bits: [8, 15],  unit: "deg", readOnly: true },
} as const satisfies Record<string, PropertyDef>;

// ── Settings Properties (Region 3) — writable configuration ──────────────────

export const TribunusSettingsProps = {
  deviceName:          { offset: 0,   type: "ascii", size: 32 },
  mode:                { offset: 32,  type: "uint16", enumName: "DeviceModes" },
  becVoltage:          { offset: 34,  type: "uint16", enumName: "BecVoltages" },
  rotationDirection:   { offset: 36,  type: "uint16", enumName: "RotationDirections" },
  protocol:            { offset: 38,  type: "uint16", enumName: "Protocols" },
  startTime:           { offset: 40,  type: "uint16", unit: "ms", range: [3000, 20000] },
  rampTime:            { offset: 42,  type: "uint16", unit: "ms", range: [3000, 20000] },
  bailoutTime:         { offset: 44,  type: "uint16", unit: "ms", range: [100, 10000] },
  pGain:               { offset: 48,  type: "iq22",   range: [0.3, 1.8] },
  iGain:               { offset: 52,  type: "iq22",   range: [1.5, 2.5] },
  dGain:               { offset: 56,  type: "iq22",   range: [0.35, 0.5] },
  smooth:              { offset: 60,  type: "iq22" },
  dragBrake:           { offset: 64,  type: "sprc",   unit: "%", range: [0, 100] },
  acceleration:        { offset: 66,  type: "uint16", unit: "ms", range: [100, 1000] },
  pwmMode:             { offset: 68,  type: "uint16", enumName: "PwmModes" },
  cutoffDelay:         { offset: 70,  type: "uint16", unit: "ms", range: [0, 60000] },
  minVoltage:          { offset: 72,  type: "smeas",  unit: "V", range: [0, 70] },
  maxTemperature:      { offset: 74,  type: "smeas",  unit: "C", range: [0, 150] },
  maxCurrent:          { offset: 76,  type: "smeas",  unit: "A", range: [0, 320] },
  cutoffPower:         { offset: 78,  type: "smeas",  unit: "%", range: [0, 100] },
  maxConsumption:      { offset: 80,  type: "smeas",  unit: "Ah", range: [0, 60] },
  soundConfiguration:  { offset: 82,  type: "uint16", range: [0, 100] },
  storedRpm:           { offset: 88,  type: "uint32" },
  throttleMaxCal:      { offset: 92,  type: "uint32", div: 60000, unit: "ms", range: [0.8, 2.5] },
  throttleZeroCal:     { offset: 96,  type: "uint32", div: 60000, unit: "ms", range: [0.8, 2.5] },
  sensitivityGain:     { offset: 102, type: "sprc",   unit: "%", range: [-70, 70] },
  dynamicProtection:   { offset: 104, type: "uint16" },
  rpmCorrection:       { offset: 106, type: "sprc",   unit: "%", range: [-10, 10] },
  gearRatio:           { offset: 110, type: "smeas",  range: [1, 100] },
  polePairs:           { offset: 112, type: "uint16", range: [1, 100] },
  iGainCorrection:     { offset: 114, type: "uint16", enumName: "IGainCorrections" },
  throttleMinCal:      { offset: 120, type: "uint32", div: 60000, unit: "ms", readOnly: true },
  protectionMargin:    { offset: 124, type: "sprc",   unit: "%", range: [0, 100] },
} as const satisfies Record<string, PropertyDef>;

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
export const TRIBUNUS_SETTINGS_REGION: RegionDef = { number: 3, offset: 0, length: 128 };
export const TRIBUNUS_FIRMWARE_REGION: RegionDef = { number: 4, offset: 0, length: 32752 };
export const TRIBUNUS_LOG_REGION:      RegionDef = { number: 5, offset: 0, length: 128000 };
export const TRIBUNUS_USER_REGION:     RegionDef = { number: 6, offset: 0, length: 12 };
export const TRIBUNUS_ERASE_REGION:    RegionDef = { number: 7, offset: 0, length: 32752 };

export const TRIBUNUS_REGIONS = [
  TRIBUNUS_SYSTEM_REGION,
  TRIBUNUS_STATE_REGION,
  TRIBUNUS_CONTROL_REGION,
  TRIBUNUS_SETTINGS_REGION,
  TRIBUNUS_FIRMWARE_REGION,
  TRIBUNUS_LOG_REGION,
  TRIBUNUS_USER_REGION,
  TRIBUNUS_ERASE_REGION,
] as const;

// ── Device Configuration Defaults ────────────────────────────────────────────

/** Proven serial settings from hardware testing. */
export const TRIBUNUS_DEVICE_CONFIG: Required<DeviceConfig> = {
  baudRate: 38400,
  addressBits: 8,
  messageTimeout: 3000,
  resendCount: 3,
  maxDataLength: 16,
  duplex: false,
};

// ── Firmware Signature ───────────────────────────────────────────────────────

/** Byte offset in the system region where the firmware signature lives. */
export const TRIBUNUS_FW_SIGNATURE_OFFSET = 14;
/** Expected signature value: 0x4E42 = "BN" in ASCII. */
export const TRIBUNUS_FW_SIGNATURE = 0x4e42;

// ── Factory ──────────────────────────────────────────────────────────────────

export interface TribunusDevice {
  device: SprotoDevice;
  regions: {
    system: Region;
    state: Region;
    control: Region;
    settings: Region;
    firmware: Region;
    log: Region;
    user: Region;
    erase: Region;
  };
}

/**
 * Create a fully-configured SprotoDevice for a Tribunus ESC with all
 * regions pre-registered.
 */
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

/**
 * Extract a range of bits from a value.
 * Used for reading the bit-packed State region fields.
 *
 * @param value    - The raw integer value
 * @param startBit - First bit (inclusive, 0-based from LSB)
 * @param endBit   - Last bit (inclusive)
 */
export function extractBits(value: number, startBit: number, endBit: number): number {
  const mask = (1 << (endBit - startBit + 1)) - 1;
  return (value >>> startBit) & mask;
}
