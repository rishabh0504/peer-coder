export class WorkspaceLockManager {
  private activeLocks = new Set<string>();

  public acquireLock(targetPath: string): boolean {
    if (this.activeLocks.has(targetPath)) {
      return false;
    }
    this.activeLocks.add(targetPath);
    return true;
  }

  public releaseLock(targetPath: string): void {
    this.activeLocks.delete(targetPath);
  }

  public isLocked(targetPath: string): boolean {
    return this.activeLocks.has(targetPath);
  }
}

export const defaultWorkspaceLockManager = new WorkspaceLockManager();
