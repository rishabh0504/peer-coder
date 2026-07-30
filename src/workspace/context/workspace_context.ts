export interface WorkspacePermissions {
  read: boolean;
  write: boolean;
  delete: boolean;
  execute: boolean;
}

export interface WorkspaceConfig {
  maxFileSizeByte: number; // e.g. 10MB
  binaryCheckLimitByte: number; // e.g. 8KB
}

export interface WorkspaceContext {
  workspaceRoot: string;
  sessionId: string;
  permissions: WorkspacePermissions;
  configuration: WorkspaceConfig;
  projectName?: string;
  languages?: string[];
  frameworks?: string[];
  runtimes?: string[];
  packageManager?: string;
  testFrameworks?: string[];
  importantFiles?: string[];
}

export function createDefaultWorkspaceContext(
  workspaceRoot: string = process.cwd(),
  sessionId = `session_${Date.now()}`,
): WorkspaceContext {
  return {
    workspaceRoot,
    sessionId,
    permissions: {
      read: true,
      write: true,
      delete: true,
      execute: true,
    },
    configuration: {
      maxFileSizeByte: 10 * 1024 * 1024, // 10 MB limit
      binaryCheckLimitByte: 8 * 1024, // 8 KB
    },
  };
}
