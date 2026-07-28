import { gitDiffTool } from "./git_diff.js";
import { gitStatusTool } from "./git_status.js";

export const gitTools = [gitStatusTool, gitDiffTool];

export { gitStatusTool, gitDiffTool };
