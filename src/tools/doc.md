# Tools Module Architecture

> **Module:** `@tools/*` (`src/tools/`)  
> **Purpose:** Provides executable capabilities and system interactions (file manipulation, shell command execution, code search, Git operations, and workspace telemetry) for autonomous AI coding agents.

---

## 1. Directory Structure

```text
src/tools/
├── file-system/              # File I/O and surgical patch tools
│   ├── apply_patch.ts        # Line-based surgical patching engine
│   ├── create_file.ts        # File creation helper
│   ├── delete_file.ts        # Safe file deletion helper
│   ├── list_files.ts         # Directory tree & glob file listing
│   └── read_file.ts          # Safe file reader
├── execution/                # System command execution tools
│   ├── execute_command.ts    # Shell command runner with timeout
│   └── get_command_output.ts # Background process stdout/stderr reader
├── search-indexing/          # Codebase search & symbol lookup tools
│   ├── find_references.ts    # Symbol reference lookup
│   ├── find_symbol.ts        # AST / symbol definition finder
│   └── search_code.ts        # Ripgrep-backed regex & literal code search
├── git/                      # Git repository version control tools
│   ├── git_diff.ts           # Working directory & branch diff analyzer
│   └── git_status.ts         # Repository branch state & status
├── workspace/                # Workspace metadata tools
│   └── workspace_info.ts     # Workspace context & root configuration
├── web-search/               # External web search tools
├── doc.md                    # Module documentation
└── index.ts                  # Central tool exports
```

---

## 2. Categorization Matrix

| Category | Subdirectory | Exported Tools | Primary Responsibility |
| :--- | :--- | :--- | :--- |
| **File System** | `file-system/` | `read_file`, `create_file`, `delete_file`, `apply_patch`, `list_files` | Safe file manipulation & surgical code edits |
| **Execution** | `execution/` | `execute_command`, `get_command_output` | Controlled terminal execution & process output monitoring |
| **Search & Indexing** | `search-indexing/` | `search_code`, `find_symbol`, `find_references` | Fast codebase search & symbol lookup |
| **Git Operations** | `git/` | `git_status`, `git_diff` | Version control inspection & change tracking |
| **Workspace** | `workspace/` | `workspace_info` | Repository metadata & environment configuration |
| **Web Search** | `web-search/` | — | External web search & documentation fetching |

---

## 3. Usage & Imports

```typescript
import { read_file, execute_command, search_code, git_status } from "@tools/index.js";
```
