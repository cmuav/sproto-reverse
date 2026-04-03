/**
 * Raw serial probe — sends handcrafted packets and logs every byte back.
 * Used to discover the actual wire behavior of the Tribunus ESC.
 *
 * Usage (via docker compose):
 *   1. Start socat bridge on host:  ./test/bridge.sh /dev/tty.usbserial-210
 *   2. docker compose run --rm test bun run test/raw-probe.ts
 */
import { TcpTransport } from "./tcp-transport.js";
import { encodeHeader, decodeHeader, HEADER_SIZE, encodeSig } from "../src/packet.js";

const HOST = process.env.SERIAL_HOST || "host.docker.internal";
const PORT = parseInt(process.env.SERIAL_PORT || "9876", 10);
const TIMEOUT = parseInt(process.env.TIMEOUT || "3000", 10);

function hexDump(data: Uint8Array): string {
  return Array.from(data)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(" ");
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const transport = new TcpTransport(TIMEOUT);

  console.log(`Connecting to ${HOST}:${PORT}...`);
  await transport.connect(HOST, PORT);
  console.log("Connected to serial bridge.\n");

  // Let the connection settle
  await sleep(500);

  // Clear any stale data
  await transport.clear();

  // ── Test 1: Read region 0 (Info), offset 0, length 1 ──────────────────

  console.log("=== Test 1: Read region 0, offset 0, length 1 ===");
  const pkt1 = encodeHeader(0, 0, 1, false);
  console.log(`TX: ${hexDump(pkt1)}`);
  await transport.write(pkt1);

  try {
    const resp1 = await transport.read(HEADER_SIZE);
    console.log(`RX header: ${hexDump(resp1)}`);
    const h1 = decodeHeader(resp1);
    console.log(`   parsed: region=${h1.region} addr=${h1.address} len=${h1.length} write=${h1.write}`);

    if (h1.length > 0) {
      const data1 = await transport.read(h1.length);
      console.log(`RX data:   ${hexDump(data1)}`);
    }
  } catch (e: unknown) {
    console.error(`   ERROR: ${e instanceof Error ? e.message : e}`);
  }

  await sleep(300);
  await transport.clear();

  // ── Test 2: Read region 0, offset 0, length 16 ────────────────────────

  console.log("\n=== Test 2: Read region 0, offset 0, length 16 ===");
  const pkt2 = encodeHeader(0, 0, 16, false);
  console.log(`TX: ${hexDump(pkt2)}`);
  await transport.write(pkt2);

  try {
    const resp2 = await transport.read(HEADER_SIZE);
    console.log(`RX header: ${hexDump(resp2)}`);
    const h2 = decodeHeader(resp2);
    console.log(`   parsed: region=${h2.region} addr=${h2.address} len=${h2.length} write=${h2.write}`);

    if (h2.length > 0) {
      const data2 = await transport.read(h2.length);
      console.log(`RX data:   ${hexDump(data2)}`);
    }
  } catch (e: unknown) {
    console.error(`   ERROR: ${e instanceof Error ? e.message : e}`);
  }

  await sleep(300);
  await transport.clear();

  // ── Test 3: Read region 1 (Config), offset 0, length 8 ────────────────

  console.log("\n=== Test 3: Read region 1, offset 0, length 8 ===");
  const pkt3 = encodeHeader(1, 0, 8, false);
  console.log(`TX: ${hexDump(pkt3)}`);
  await transport.write(pkt3);

  try {
    const resp3 = await transport.read(HEADER_SIZE);
    console.log(`RX header: ${hexDump(resp3)}`);
    const h3 = decodeHeader(resp3);
    console.log(`   parsed: region=${h3.region} addr=${h3.address} len=${h3.length} write=${h3.write}`);

    if (h3.length > 0) {
      const data3 = await transport.read(h3.length);
      console.log(`RX data:   ${hexDump(data3)}`);
    }
  } catch (e: unknown) {
    console.error(`   ERROR: ${e instanceof Error ? e.message : e}`);
  }

  await sleep(300);
  await transport.clear();

  // ── Test 4: Try half-duplex — read echo then response ─────────────────

  console.log("\n=== Test 4: Half-duplex read (region 0, offset 0, length 1) ===");
  const pkt4 = encodeHeader(0, 0, 1, false);
  console.log(`TX: ${hexDump(pkt4)}`);
  await transport.write(pkt4);

  try {
    // Try to read echo first (half-duplex)
    console.log("   Attempting to read echo...");
    const echo = await transport.read(HEADER_SIZE);
    console.log(`RX echo:   ${hexDump(echo)}`);

    // Then read response
    const resp4 = await transport.read(HEADER_SIZE);
    console.log(`RX header: ${hexDump(resp4)}`);
    const h4 = decodeHeader(resp4);
    console.log(`   parsed: region=${h4.region} addr=${h4.address} len=${h4.length} write=${h4.write}`);

    if (h4.length > 0) {
      const data4 = await transport.read(h4.length);
      console.log(`RX data:   ${hexDump(data4)}`);
    }
  } catch (e: unknown) {
    console.error(`   ERROR: ${e instanceof Error ? e.message : e}`);
  }

  await sleep(300);
  await transport.clear();

  // ── Test 5: Raw byte sniff — send nothing, just listen ────────────────

  console.log("\n=== Test 5: Passive listen for 3s (any unsolicited data?) ===");
  try {
    const passive = await transport.read(1);
    console.log(`RX: ${hexDump(passive)} (got unsolicited data)`);
  } catch {
    console.log("   No unsolicited data (timeout — expected).");
  }

  // ── Test 6: Sweep signature byte variants ─────────────────────────────

  console.log("\n=== Test 6: Signature byte sweep ===");
  for (const sig of [0x50, 0x51, 0x52, 0xa0, 0xa1, 0xd0, 0xd1]) {
    await transport.clear();
    const pkt = new Uint8Array([sig, 0x00, 0x00, 0x00, 0x01, 0x00]);
    console.log(`TX [sig=0x${sig.toString(16)}]: ${hexDump(pkt)}`);
    await transport.write(pkt);
    await sleep(200);

    try {
      const resp = await transport.read(1);
      // Read remaining bytes if any
      await sleep(100);
      let all = new Uint8Array(resp);
      try {
        const more = await transport.read(32);
        const combined = new Uint8Array(all.length + more.length);
        combined.set(all);
        combined.set(more, all.length);
        all = combined;
      } catch {}
      console.log(`   RX: ${hexDump(all)}`);
    } catch {
      console.log(`   RX: (no response)`);
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
