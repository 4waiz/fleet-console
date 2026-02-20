import { kv } from "@vercel/kv";
import type { FleetData } from "@/lib/types";

const DATA_KEY = "fleet-console:data";
const hasKvEnv = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
let kvAvailable = hasKvEnv;
let memoryStore: FleetData | null = null;

function logFallback(error: unknown) {
  if (!kvAvailable) {
    return;
  }
  console.error("KV unavailable, using in-memory fallback.", error);
}

export async function readFleetData(): Promise<FleetData | null> {
  if (!kvAvailable) {
    return memoryStore;
  }

  try {
    const data = await kv.get<FleetData>(DATA_KEY);
    if (data) {
      memoryStore = data;
      return data;
    }
    return memoryStore;
  } catch (error) {
    kvAvailable = false;
    logFallback(error);
    return memoryStore;
  }
}

export async function writeFleetData(data: FleetData): Promise<void> {
  memoryStore = data;
  if (!kvAvailable) {
    return;
  }

  try {
    await kv.set(DATA_KEY, data);
  } catch (error) {
    kvAvailable = false;
    logFallback(error);
  }
}

export function isUsingKv(): boolean {
  return kvAvailable;
}
