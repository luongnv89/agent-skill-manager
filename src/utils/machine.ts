// ─── Machine Output (v1 envelope) ──────────────────────────────────────────
//
// Stable, versioned JSON envelope for programmatic consumption by AI agents.
// See: https://github.com/luongnv89/agent-skill-manager/issues/109

import { VERSION } from "./version";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface MachineEnvelopeMeta {
  timestamp: string;
  asm_version: string;
  duration_ms: number;
}

export interface MachineOutput<T = unknown> {
  version: 1;
  command: string;
  status: "ok" | "error";
  data?: T;
  error?: { code: string; message: string; details?: unknown };
  meta: MachineEnvelopeMeta;
}

// ─── Error Codes ────────────────────────────────────────────────────────────

export const ErrorCodes = {
  SKILL_NOT_FOUND: "SKILL_NOT_FOUND",
  AUDIT_FAILED: "AUDIT_FAILED",
  INSTALL_FAILED: "INSTALL_FAILED",
  PUBLISH_FAILED: "PUBLISH_FAILED",
  NETWORK_ERROR: "NETWORK_ERROR",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// ─── Formatting ─────────────────────────────────────────────────────────────

function buildMeta(startTime: number): MachineEnvelopeMeta {
  return {
    timestamp: new Date().toISOString(),
    asm_version: VERSION,
    duration_ms: Math.round(performance.now() - startTime),
  };
}

/**
 * Format a successful machine-readable v1 envelope.
 *
 * Output is compact JSON when stdout is not a TTY, pretty-printed otherwise.
 */
export function formatMachineOutput<T>(
  command: string,
  data: T,
  startTime: number,
): string {
  const envelope: MachineOutput<T> = {
    version: 1,
    command,
    status: "ok",
    data,
    meta: buildMeta(startTime),
  };
  const indent = process.stdout.isTTY ? 2 : 0;
  return JSON.stringify(envelope, null, indent);
}

/**
 * Format an error machine-readable v1 envelope.
 *
 * Output is compact JSON when stdout is not a TTY, pretty-printed otherwise.
 */
export function formatMachineError(
  command: string,
  code: ErrorCode,
  message: string,
  startTime: number,
  details?: unknown,
): string {
  const envelope: MachineOutput = {
    version: 1,
    command,
    status: "error",
    error: { code, message, ...(details !== undefined ? { details } : {}) },
    meta: buildMeta(startTime),
  };
  const indent = process.stdout.isTTY ? 2 : 0;
  return JSON.stringify(envelope, null, indent);
}
