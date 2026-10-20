// Sends simulated telemetry to the backend, the way the gateway will. Usage:
//   npm run simulate -- [--node node-01,node-02] [--interval 10] [--count 5] [--url http://localhost:3000]
// It only talks to the HTTP API; it never opens a database connection.
import {
  BASE_BATTERY_VOLTAGE,
  BASE_REGISTERS,
  buildPayload,
  nextBatteryVoltage,
  nextRegisters,
  parseArgs,
} from "../src/simulator/payload.js";

const { options, errors } = parseArgs(process.argv.slice(2));
if (errors.length > 0) {
  for (const error of errors) console.error(error);
  process.exit(1);
}

const state = new Map(
  options.nodes.map((code) => [
    code,
    { rawRegisters: [...BASE_REGISTERS], batteryVoltage: BASE_BATTERY_VOLTAGE },
  ]),
);
const endpoint = `${options.url}/api/v1/telemetry`;
let stopping = false;
let timer;

function clock() {
  return new Date().toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour12: false });
}

async function send(nodeCode) {
  const node = state.get(nodeCode);
  node.rawRegisters = nextRegisters(node.rawRegisters);
  node.batteryVoltage = nextBatteryVoltage(node.batteryVoltage);
  const payload = buildPayload(nodeCode, node.rawRegisters, node.batteryVoltage);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => null);
    if (res.status === 201) {
      console.log(
        `${clock()} ${nodeCode} 201 id=${body.data.id} [${payload.rawRegisters}] ${payload.batteryVoltage.toFixed(2)} V`,
      );
    } else if (body?.error?.code === "unknown_node") {
      console.log(`${clock()} ${nodeCode} 422 not registered: INSERT INTO nodes (code) VALUES ('${nodeCode}');`);
    } else {
      console.log(`${clock()} ${nodeCode} ${res.status} ${body?.error?.code ?? "no JSON body"}`);
    }
  } catch {
    console.log(`${clock()} ${nodeCode} backend unreachable at ${options.url}`);
  }
}

async function tick(remaining) {
  for (const nodeCode of options.nodes) await send(nodeCode);
  const left = remaining === null ? null : remaining - 1;
  if (stopping || left === 0) return;
  timer = setTimeout(() => tick(left), options.intervalSeconds * 1000);
}

process.on("SIGINT", () => {
  stopping = true;
  clearTimeout(timer);
  console.log("Simulator stopped.");
});

console.log(
  `Sending to ${endpoint} for ${options.nodes.join(", ")} every ${options.intervalSeconds} s` +
    (options.count === null ? " (Ctrl+C to stop)" : `, ${options.count} time(s)`),
);
await tick(options.count);
