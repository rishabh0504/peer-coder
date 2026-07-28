# 🚀 Peer Coder CLI (`peer-coder`)

> A production-grade Node.js CLI & AI Coding Agent Architecture scaffold built with TypeScript, ESM, Commander, `@clack/prompts`, Zod, `tsup`, Biome, Vitest, and GitHub Actions.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)
![Node](https://img.shields.io/badge/Node.js-%3E%3D18-brightgreen)
![pnpm](https://img.shields.io/badge/pnpm-%3E%3D10-orange)

---

## ✨ Features

- ⚡ **Lightning Fast Bundling**: Powered by [`tsup`](https://tsup.egoist.dev/) (built on `esbuild`).
- 🎨 **Interactive UI & Prompts**: Built with [`@clack/prompts`](https://github.com/natemoo-re/clack), `boxen`, and `picocolors`.
- 🛡️ **Schema & Env Validation**: Strongly-typed runtime validation powered by [`zod`](https://zod.dev/).
- 🗺️ **Comprehensive Path Aliases**: Configured `@agents/*`, `@cli/*`, `@config/*`, `@context/*`, `@tools/*`, `@utils/*`, and more.
- 🔗 **Global Link Command**: Pre-configured `pnpm run link` command for testing globally as `peer-coder`.
- 🔍 **Code Quality & Linting**: Built-in [`biome`](https://biomejs.dev/) for instant linting & formatting.
- 🧪 **Testing Framework**: Fast test runner with [`vitest`](https://vitest.dev/).
- 🪝 **Git Workflow**: Integrated [`husky`](https://typicode.github.io/husky/), [`lint-staged`](https://github.com/lint-staged/lint-staged), and [`commitlint`](https://commitlint.js.org/).

---

## 📁 Project Structure

```text
peer-coder/
├── .github/
│   └── workflows/
│       └── ci.yml            # GitHub Actions CI Workflow
├── docs/
│   └── requirements.md       # Architecture specifications
├── src/
│   ├── agents/               # Specialist AI Agents (analyzer, planner, executor, validator, reflection)
│   ├── cli/                  # CLI command handlers (init, info)
│   ├── config/               # Environment & configuration (Zod env validator)
│   ├── context/              # Context engineering pipeline
│   ├── models/               # LLM provider abstractions
│   ├── observability/        # Logging & telemetry
│   ├── orchestration/        # LangGraph workflow orchestration
│   ├── prompts/              # Agent system prompts
│   ├── repository/           # Repository intelligence & indexing
│   ├── runtime/              # Agent runtime engine
│   ├── security/             # Security scanner & sandbox
│   ├── state/                # State management
│   ├── tools/                # Execution tool system
│   ├── utils/                # Utilities (logger, error handling)
│   ├── validation/           # Validation pipeline
│   ├── cli.ts                # Commander routing & CLI entry point
│   └── index.ts              # Exportable library entry point
├── tests/                    # Vitest test suite
├── biome.json                # Biome linter & formatter config
├── tsup.config.ts            # Bundler configuration
├── tsconfig.json             # TypeScript configuration with path aliases
└── package.json
```

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Global Link

Build and link `peer-coder` globally to your path:

```bash
pnpm run link
```

Now run the CLI directly from anywhere in your terminal:

```bash
peer-coder --help
peer-coder info
peer-coder init
```

To unlink globally:

```bash
pnpm run unlink
```

---

## 🛠️ Scripts & Commands

| Command | Description |
| :--- | :--- |
| `pnpm dev` | Rebuild bundle automatically on file change |
| `pnpm build` | Bundle CLI into `./dist/cli.js` & `./dist/index.js` |
| `pnpm run link` | Build and link `peer-coder` globally to system path |
| `pnpm run unlink` | Remove global binary link |
| `pnpm typecheck` | Run TypeScript type safety checks |
| `pnpm lint` | Run Biome linter check |
| `pnpm lint:fix` | Fix Biome linting & formatting issues |
| `pnpm test` | Run Vitest test suite |
| `pnpm test:coverage` | Generate test code coverage report |

---

## 📝 License

[MIT](./LICENSE)

