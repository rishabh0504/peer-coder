# CLI Module Architecture

> **Module:** `@cli/*` (`src/cli/`)  
> **Purpose:** Handles the command-line interface entry point, interactive REPL shell, brand header rendering, and subcommand routing for `peer-coder`.

---

## 1. Overview

The CLI layer acts as the primary interface between the user and the agent runtime. It supports two modes of execution:

1. **Interactive REPL Shell** (Default mode): Launched when `peer-coder` is run without any subcommands. Powered by Node.js `readline`, featuring command autocompletion (TAB key), pastel gradient banner, and live input handling.
2. **Direct Subcommand Execution**: Executed via Commander (`peer-coder info`, `peer-coder --help`).

---

## 2. File Structure

```text
src/cli/
├── brand.ts        # ASCII gradient banner rendering & workspace header
├── info.ts         # Environment & system diagnostic command (`peer-coder info`)
├── repl.ts         # Readline REPL interactive shell with command autocompletion
└── doc.md          # Module documentation
```

---

## 3. Component Details

### `brand.ts`
Renders the high-impact banner on startup using:
- **`figlet`**: Generates big ASCII text for `PEER CODER` (`ANSI Shadow` font).
- **`gradient-string`**: Applies a multi-line pastel color fill across the ASCII text.
- **Header info**: Displays the human engineer icon `🧑‍💻`, version tag `v1.0.0`, and active working directory path `📍`.

```typescript
import { printBrandBanner } from "@cli/brand.js";
```

### `repl.ts`
Engineers the interactive REPL lifecycle:
- Autocompletes available slash commands (`/info`, `/help`, `/clear`, `/exit`) using a custom Readline `completer`.
- Handles REPL line inputs and gracefully intercepts process signals (`SIGINT`, `close`).

```typescript
import { startRepl } from "@cli/repl.js";
await startRepl();
```

### `info.ts`
Outputs system diagnostic data formatted inside a clean box:
- OS Architecture & platform version
- Node.js runtime version
- Environment mode & log levels
- System memory & CPU cores

---

## 4. Path Alias Mapping

Imported across the codebase via the `@cli/*` alias configured in `tsconfig.json`:

```typescript
import { printBrandBanner } from "@cli/brand.js";
import { infoCommand } from "@cli/info.js";
import { startRepl } from "@cli/repl.js";
```
