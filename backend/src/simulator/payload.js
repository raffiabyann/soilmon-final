// Payloads for the development simulator (01 FR-20, FR-21). They follow the same provisional
// contract as the gateway: seven raw uint16 registers and the node's battery voltage.

import { RAW_REGISTER_MAX, isValidNodeCode } from "../telemetry/validate.js";

// Starting point: the registers of the first manually sent record. Only the shape is reused;
// what each register means is not verified, so the walk below treats them all alike.
export const BASE_REGISTERS = Object.freeze([512, 268, 1200, 65, 30, 12, 45]);
export const BASE_BATTERY_VOLTAGE = 3.31;

export const DEFAULTS = Object.freeze({
  url: "http://localhost:3000",
  nodes: ["node-01"],
  intervalSeconds: 10,
  count: null,
});

// Moves each register by up to ±2% of its value (at least ±1), kept inside uint16.
export function nextRegisters(previous, random = Math.random) {
  return previous.map((value) => {
    const step = Math.max(1, Math.round(value * 0.02));
    const next = value + Math.round((random() * 2 - 1) * step);
    return Math.min(RAW_REGISTER_MAX, Math.max(0, next));
  });
}

// Slow drain with small noise, kept between 2.8 V and 4.2 V.
export function nextBatteryVoltage(previous, random = Math.random) {
  const next = previous - 0.002 + (random() * 2 - 1) * 0.01;
  return Math.round(Math.min(4.2, Math.max(2.8, next)) * 100) / 100;
}

// No measuredAt: the prototype gateway has no synchronised clock, so the server's received_at is
// the only timestamp, as it will be for real gateway deliveries.
export function buildPayload(nodeCode, rawRegisters, batteryVoltage) {
  return { nodeCode, rawRegisters, batteryVoltage };
}

// Returns { options, errors }. Accepts --url, --node (repeatable or comma-separated),
// --interval seconds and --count ticks.
export function parseArgs(argv) {
  const options = { ...DEFAULTS, nodes: [] };
  const errors = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const value = argv[i + 1];
    const takeValue = () => {
      i += 1;
      if (value === undefined || value.startsWith("--")) {
        errors.push(`${arg} needs a value`);
        return null;
      }
      return value;
    };

    if (arg === "--url") {
      const url = takeValue();
      if (url !== null) {
        try {
          const parsed = new URL(url);
          if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error();
          options.url = url.replace(/\/+$/, "");
        } catch {
          errors.push("--url must be an http(s) URL");
        }
      }
    } else if (arg === "--node") {
      const codes = takeValue();
      if (codes !== null) {
        for (const code of codes.split(",")) {
          if (isValidNodeCode(code)) options.nodes.push(code);
          else errors.push(`--node "${code}" is not a valid node code`);
        }
      }
    } else if (arg === "--interval" || arg === "--count") {
      const text = takeValue();
      if (text !== null) {
        const number = Number(text);
        if (!Number.isInteger(number) || number < 1) {
          errors.push(`${arg} must be a whole number of at least 1`);
        } else if (arg === "--interval") {
          options.intervalSeconds = number;
        } else {
          options.count = number;
        }
      }
    } else {
      errors.push(`Unknown argument: ${arg}`);
    }
  }

  if (options.nodes.length === 0) options.nodes = [...DEFAULTS.nodes];
  return { options, errors };
}
