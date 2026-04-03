/**
 * Sproto Transport over a TCP socket (for bridging serial via socat).
 */
import { Socket } from "net";
import type { Transport } from "../src/types.js";

export class TcpTransport implements Transport {
  private socket: Socket;
  private readBuffer: Buffer = Buffer.alloc(0);
  private waiters: Array<{ resolve: (data: Buffer) => void; length: number }> =
    [];
  private timeoutMs: number;
  private connected = false;

  constructor(timeoutMs = 2000) {
    this.socket = new Socket();
    this.timeoutMs = timeoutMs;

    this.socket.on("data", (chunk: Buffer) => {
      this.readBuffer = Buffer.concat([this.readBuffer, chunk]);
      this.drainWaiters();
    });

    this.socket.on("error", (err) => {
      console.error("TCP error:", err.message);
      // Reject all pending reads
      for (const w of this.waiters) {
        w.resolve(Buffer.alloc(0));
      }
      this.waiters = [];
    });

    this.socket.on("close", () => {
      this.connected = false;
    });
  }

  async connect(host: string, port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket.connect(port, host, () => {
        this.connected = true;
        resolve();
      });
      this.socket.once("error", reject);
    });
  }

  async disconnect(): Promise<void> {
    this.socket.destroy();
    this.connected = false;
  }

  async write(data: Uint8Array): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket.write(Buffer.from(data), (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async read(length: number): Promise<Uint8Array> {
    // Check if we already have enough buffered
    if (this.readBuffer.length >= length) {
      const result = this.readBuffer.subarray(0, length);
      this.readBuffer = this.readBuffer.subarray(length);
      return new Uint8Array(result);
    }

    // Wait for more data
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        // Remove this waiter
        this.waiters = this.waiters.filter((w) => w.resolve !== resolveWrapper);
        reject(new Error(`Read timeout waiting for ${length} bytes (got ${this.readBuffer.length})`));
      }, this.timeoutMs);

      const resolveWrapper = (data: Buffer) => {
        clearTimeout(timer);
        resolve(new Uint8Array(data));
      };

      this.waiters.push({ resolve: resolveWrapper, length });
    });
  }

  async clear(): Promise<void> {
    this.readBuffer = Buffer.alloc(0);
  }

  private drainWaiters(): void {
    while (this.waiters.length > 0) {
      const w = this.waiters[0];
      if (this.readBuffer.length >= w.length) {
        const data = this.readBuffer.subarray(0, w.length);
        this.readBuffer = this.readBuffer.subarray(w.length);
        this.waiters.shift();
        w.resolve(data);
      } else {
        break;
      }
    }
  }
}
