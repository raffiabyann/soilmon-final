// Forwards the gateway's Serial output to the backend, for testing real nodes without WiFi.
//   npm run bridge -- --port COM5 [--baud 115200] [--url http://127.0.0.1:3000]
//   npm run bridge -- --list
// Only lines that start with "JSON:" are posted to /api/v1/telemetry; every other line is ignored.
// Each node needs its key in SIMULATOR_API_KEYS (from npm run seed), in the environment or .env.
// A failed POST is logged and dropped, not retried. Opening the port can reset the ESP32 (DTR).
import { ReadlineParser, SerialPort } from "serialport";
import { forwardPacket, parseBridgeArgs, parseSerialLine } from "../src/bridge/bridge.js";
import { parseApiKeys } from "../src/simulator/payload.js";

const REOPEN_DELAY_MS = 3000;

const { options, errors: argErrors } = parseBridgeArgs(process.argv.slice(2));
if (argErrors.length > 0) {
  for (const error of argErrors) console.error(error);
  process.exit(1);
}

if (options.list) {
  const ports = await SerialPort.list();
  if (ports.length === 0) console.log("No serial ports found.");
  for (const p of ports) console.log(`${p.path}  ${p.manufacturer ?? ""} ${p.friendlyName ?? ""}`.trimEnd());
  process.exit(0);
}

const { keys: apiKeys, errors: keyErrors } = parseApiKeys(process.env.SIMULATOR_API_KEYS);
if (keyErrors.length > 0 || apiKeys.size === 0) {
  for (const error of keyErrors) console.error(error);
  if (apiKeys.size === 0) console.error("SIMULATOR_API_KEYS has no keys. Run npm run seed and copy its output to .env.");
  process.exit(1);
}

const endpoint = `${options.url}/api/v1/telemetry`;
let stopping = false;
let port = null;
let reopenTimer = null;
// Packets are posted one at a time, in the order the gateway printed them.
let queue = Promise.resolve();

function log(text) {
  const time = new Date().toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour12: false });
  console.log(`${time} ${text}`);
}

function handleLine(line) {
  const parsed = parseSerialLine(line);
  if (parsed.kind === "ignore") return;
  if (parsed.kind === "invalid") {
    log(`line skipped, ${parsed.reason}`);
    return;
  }
  queue = queue.then(async () => log(await forwardPacket(parsed, { endpoint, apiKeys })));
}

function scheduleReopen() {
  if (stopping || reopenTimer) return;
  reopenTimer = setTimeout(() => {
    reopenTimer = null;
    open();
  }, REOPEN_DELAY_MS);
}

function open() {
  port = new SerialPort({ path: options.port, baudRate: options.baud, autoOpen: false });
  const lines = port.pipe(new ReadlineParser({ delimiter: "\n", encoding: "utf8" }));
  lines.on("data", handleLine);
  port.on("error", (err) => log(`serial error on ${options.port}: ${err.message}`));
  port.on("close", () => {
    if (stopping) return;
    log(`${options.port} closed, retrying in ${REOPEN_DELAY_MS / 1000} s`);
    scheduleReopen();
  });
  port.open((err) => {
    if (err) {
      log(`cannot open ${options.port}: ${err.message}. Retrying in ${REOPEN_DELAY_MS / 1000} s`);
      scheduleReopen();
      return;
    }
    log(`listening on ${options.port} at ${options.baud} baud, posting to ${endpoint} (Ctrl+C to stop)`);
  });
}

process.on("SIGINT", async () => {
  stopping = true;
  clearTimeout(reopenTimer);
  await queue;
  if (port?.isOpen) port.close();
  console.log("Bridge stopped.");
  process.exit(0);
});

log(`keys loaded for ${[...apiKeys.keys()].join(", ")}`);
open();
