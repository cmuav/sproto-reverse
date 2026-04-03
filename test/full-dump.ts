/**
 * Full ESC memory dump — reads all regions and prints a formatted hex dump.
 *
 * Usage:
 *   1. Start bridge:  ./test/bridge.sh /dev/tty.usbserial-210
 *   2. docker compose run --rm test bun run test/full-dump.ts
 */
import { TcpTransport } from "./tcp-transport.js";
import { SprotoDevice } from "../src/device.js";

const HOST = process.env.SERIAL_HOST || "host.docker.internal";
const PORT = parseInt(process.env.SERIAL_PORT || "9876", 10);
const TIMEOUT = parseInt(process.env.TIMEOUT || "3000", 10);

function hexDumpFormatted(data: Uint8Array, baseAddr = 0): string {
  const lines: string[] = [];
  for (let i = 0; i < data.length; i += 16) {
    const addr = (baseAddr + i).toString(16).padStart(4, "0");
    const hex = Array.from(data.slice(i, i + 16))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(" ");
    const ascii = Array.from(data.slice(i, i + 16))
      .map((b) => (b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : "."))
      .join("");
    lines.push(`  ${addr}  ${hex.padEnd(47)}  |${ascii}|`);
  }
  return lines.join("\n");
}

async function main() {
  const transport = new TcpTransport(TIMEOUT);
  console.log(`Connecting to ${HOST}:${PORT}...`);
  await transport.connect(HOST, PORT);
  await new Promise((r) => setTimeout(r, 300));
  await transport.clear();

  const device = new SprotoDevice(transport, {
    baudRate: 38400,
    addressBits: 8,
    maxDataLength: 16,
    duplex: false,
    messageTimeout: TIMEOUT,
    resendCount: 3,
  });

  // Try multiple region sizes to discover actual region extents
  const regionDefs = [
    { num: 0, label: "Region 0 (Info/Status)", sizes: [64, 128, 256] },
    { num: 1, label: "Region 1 (Config)", sizes: [64, 128, 256, 512] },
    { num: 2, label: "Region 2", sizes: [64, 128] },
    { num: 3, label: "Region 3", sizes: [64] },
    { num: 4, label: "Region 4", sizes: [64] },
  ];

  for (const rdef of regionDefs) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`  ${rdef.label}`);
    console.log(`${"=".repeat(60)}`);

    for (const size of rdef.sizes) {
      // Need a fresh device per attempt since regions can't be re-added
      const dev = new SprotoDevice(transport, {
        baudRate: 38400,
        addressBits: 8,
        maxDataLength: 16,
        duplex: false,
        messageTimeout: TIMEOUT,
        resendCount: 2,
      });

      const region = dev.addRegion({ number: rdef.num, offset: 0, length: size });

      process.stdout.write(`  Reading ${size} bytes... `);
      try {
        await dev.readRegion(region);
        const data = region.readRaw(0, size);
        const nonZero = data.filter((b) => b !== 0).length;
        console.log(`OK (${nonZero} non-zero bytes)`);
        console.log(hexDumpFormatted(data));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.log(`FAILED at this size (${msg})`);
        break; // Don't try larger sizes
      }

      await new Promise((r) => setTimeout(r, 200));
      await transport.clear();
    }
  }

  console.log("\nDone.");
  await transport.disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
