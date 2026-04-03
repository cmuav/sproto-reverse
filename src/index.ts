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
  DeviceModes,
  BecVoltages,
  Protocols,
  RotationDirections,
  GovernorModes,
  PwmModes,
  ExternalControls,
  IGainCorrections,
  TemperatureUnits,
  SoundConfigurations,
  SyncStates,
  ResetCodes,
  // Property maps
  TribunusSystemProps,
  TribunusStateProps,
  TribunusSettingsProps,
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
  // Config & signature
  TRIBUNUS_DEVICE_CONFIG,
  TRIBUNUS_FW_SIGNATURE,
  TRIBUNUS_FW_SIGNATURE_OFFSET,
  // Factory
  createTribunusDevice,
  // Utility
  extractBits,
  // Types
  type PropertyDef,
  type TribunusDevice,
} from "./tribunus.js";
