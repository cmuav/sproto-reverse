export { SprotoDevice } from "./device.js";
export { Region } from "./region.js";
export {
  HEADER_SIZE,
  encodeSig,
  decodeSig,
  encodeHeader,
  decodeHeader,
  buildReadPacket,
  buildWritePacket,
} from "./packet.js";
export { parseSRec, generateSRec, srecToBuffer, type SRecEntry } from "./srec.js";
export type {
  AddressBits,
  ByteOrder16,
  ByteOrder32,
  DeviceConfig,
  RegionDef,
  Transport,
} from "./types.js";
export {
  // Enums
  TribunusTypes,
  TribunusIIITypes,
  DeviceModes,
  BecVoltages,
  BecVoltagesIII,
  Protocols,
  ProtocolsIII,
  RotationDirections,
  GovernorModes,
  PwmModes,
  ExternalControls,
  IGainCorrections,
  TemperatureUnits,
  SoundConfigurations,
  SyncStates,
  VoltageLimitModes,
  CpuTempLogging,
  ResetCodes,
  // Property maps
  TribunusSystemProps,
  TribunusStateProps,
  TribunusSettingsProps,
  TRIBUNUS_SETTINGS_ORDER,
  TribunusUserProps,
  // Region defs
  TRIBUNUS_SYSTEM_REGION,
  TRIBUNUS_STATE_REGION,
  TRIBUNUS_CONTROL_REGION,
  TRIBUNUS_SETTINGS_REGION,
  TRIBUNUS_FIRMWARE_REGION,
  TRIBUNUS_LOG_REGION,
  TRIBUNUS_USER_REGION,
  TRIBUNUS_ERASE_REGION,
  TRIBUNUS_REGIONS,
  // Config & signatures
  TRIBUNUS_DEVICE_CONFIG,
  TRIBUNUS_FW_SIGNATURE,
  TRIBUNUS_FW_SIGNATURE_OFFSET,
  TRIBUNUS_SETTINGS_SIGNATURE,
  TRIBUNUS_SETTINGS_SIGNATURE_OFFSET,
  // Factory
  createTribunusDevice,
  // Utility
  extractBits,
  // Tribunus II
  TribunusIISystemProps,
  TribunusIIStateProps,
  TribunusIISettingsProps,
  TRIBUNUS_II_SETTINGS_ORDER,
  TRIBUNUS_II_SYSTEM_REGION,
  TRIBUNUS_II_STATE_REGION,
  TRIBUNUS_II_SETTINGS_REGION,
  TRIBUNUS_II_FIRMWARE_REGION,
  createTribunusIIDevice,
  // Types
  type PropertyDef,
  type TribunusDevice,
  type TribunusIIDevice,
} from "./tribunus.js";
