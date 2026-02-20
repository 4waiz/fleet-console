import { kv } from "@vercel/kv";
import type { FleetData } from "@/lib/types";

const DATA_KEY = "fleet-console:data";
const hasKvEnv = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

type FleetGlobals = typeof globalThis & {
  __fleetConsoleKvAvailable?: boolean;
  __fleetConsoleMemoryStore?: FleetData | null;
};

const globalForFleet = globalThis as FleetGlobals;
if (typeof globalForFleet.__fleetConsoleKvAvailable === "undefined") {
  globalForFleet.__fleetConsoleKvAvailable = hasKvEnv;
}
if (typeof globalForFleet.__fleetConsoleMemoryStore === "undefined") {
  globalForFleet.__fleetConsoleMemoryStore = null;
}

function getKvAvailable(): boolean {
  return Boolean(globalForFleet.__fleetConsoleKvAvailable);
}

function setKvAvailable(value: boolean): void {
  globalForFleet.__fleetConsoleKvAvailable = value;
}

function getMemoryStore(): FleetData | null {
  return globalForFleet.__fleetConsoleMemoryStore ?? null;
}

function setMemoryStore(data: FleetData | null): void {
  globalForFleet.__fleetConsoleMemoryStore = data;
}

function logFallback(error: unknown) {
  if (!getKvAvailable()) {
    return;
  }
  console.error("KV unavailable, using in-memory fallback.", error);
}

export async function readFleetData(): Promise<FleetData | null> {
  if (!getKvAvailable()) {
    return getMemoryStore();
  }

  try {
    const data = await kv.get<FleetData>(DATA_KEY);
    if (data) {
      setMemoryStore(data);
      return data;
    }
    return getMemoryStore();
  } catch (error) {
    setKvAvailable(false);
    logFallback(error);
    return getMemoryStore();
  }
}

export async function writeFleetData(data: FleetData): Promise<void> {
  setMemoryStore(data);
  if (!getKvAvailable()) {
    return;
  }

  try {
    await kv.set(DATA_KEY, data);
  } catch (error) {
    setKvAvailable(false);
    logFallback(error);
  }
}

export function isUsingKv(): boolean {
  return getKvAvailable();
}
