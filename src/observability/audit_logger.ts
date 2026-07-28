import type { DangerLevel } from "@security/policy_engine.js";

export interface AuditLogEntry {
  timestamp: string;
  sessionId: string;
  toolName: string;
  args: Record<string, unknown>;
  durationMs: number;
  success: boolean;
  dangerLevel: DangerLevel;
  error?: string;
}

export class AuditLogger {
  private logs: AuditLogEntry[] = [];

  public log(entry: Omit<AuditLogEntry, "timestamp">): void {
    const fullEntry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      ...entry,
    };
    this.logs.push(fullEntry);
  }

  public getLogs(): AuditLogEntry[] {
    return [...this.logs];
  }

  public clear(): void {
    this.logs = [];
  }
}

export const defaultAuditLogger = new AuditLogger();
