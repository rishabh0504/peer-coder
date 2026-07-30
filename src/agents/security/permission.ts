export enum ToolPermission {
  READ = "read",
  WRITE = "write",
  EXECUTE = "execute",
  NETWORK = "network",
}

/**
 * Defines which permissions are covered by each granted level.
 *
 * WRITE grants READ (reads are implicit in write access)
 * EXECUTE grants READ + WRITE + EXECUTE (full local system access)
 * NETWORK is isolated — does NOT escalate to/from filesystem permissions
 */
export const PERMISSION_MATRIX: Record<ToolPermission, ToolPermission[]> = {
  [ToolPermission.READ]:    [ToolPermission.READ],
  [ToolPermission.WRITE]:   [ToolPermission.READ, ToolPermission.WRITE],
  [ToolPermission.EXECUTE]: [ToolPermission.READ, ToolPermission.WRITE, ToolPermission.EXECUTE],
  [ToolPermission.NETWORK]: [ToolPermission.NETWORK],
};

export function isPermissionGranted(granted: ToolPermission, requested: ToolPermission): boolean {
  return PERMISSION_MATRIX[granted].includes(requested);
}
