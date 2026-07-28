# 🚀 Modern Production-Grade Node.js CLI Template

> A feature-complete, modern TypeScript CLI template powered by ESM, Commander, `@clack/prompts`, Zod, Tsup, Biome, Vitest, and GitHub Actions.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)
![Node](https://img.shields.io/badge/Node.js-%3E%3D18-brightgreen)

---

## ✨ Features

- ⚡ **Lightning Fast Bundling**: Powered by [`tsup`](https://tsup.egoist.dev/) (built on `esbuild`).
- 🎨 **Beautiful UI & Interactive Prompts**: Powered by [`@clack/prompts`](https://github.com/natemoo-re/clack), `boxen`, and `picocolors`.
- 🛡️ **Schema & Env Validation**: Strongly-typed runtime validation using [`zod`](https://zod.dev/).
- 🔍 **Instant Linting & Formatting**: Configured with [`biome`](https://biomejs.dev/).
- 🧪 **Unit & Integration Testing**: Modern fast runner [`vitest`](https://vitest.dev/).
- 🪝 **Git Hooks & Conventional Commits**: Pre-configured with [`husky`](https://typicode.github.io/husky/), [`lint-staged`](https://github.com/lint-staged/lint-staged), and [`commitlint`](https://commitlint.js.org/).
- 📦 **Dual Output**: Formatted as both a CLI binary (`bin`) and an importable TypeScript library export (`dist/index.js`).
- 👷 **Continuous Integration**: GitHub Actions workflow for multi-version Node testing & verification.

---

## 📁 Project Structure

```text
.
├── .github/
│   └── workflows/
│       └── ci.yml          # GitHub Actions CI Workflow
├── bin/
│   └── cli.js              # Executable entry script wrapper
├── src/
│   ├── commands/           # CLI command handlers
│   │   ├── info.ts         # System & env diagnostic command
│   │   └── init.ts         # Interactive wizard command
│   ├── config/             # Environment & app configurations
│   │   └── env.ts          # Zod env parser
│   ├── utils/              # Utilities (logger, error handling)
│   │   ├── errors.ts
│   │   └── logger.ts
│   ├── cli.ts              # Commander routing & CLI entry point
│   └── index.ts            # Library export entry point
├── tests/                  # Vitest test suite
│   └── cli.test.ts
├── biome.json              # Biome linter & formatter config
├── tsup.config.ts          # Bundler configuration
├── tsconfig.json           # TypeScript configuration
└── package.json
```

---

## 🚦 Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Development Mode

Watch for changes and continuously rebuild the executable:

```bash
pnpm dev
```

Run local CLI commands directly with Node:

```bash
pnpm start -- --help
pnpm start -- init
pnpm start -- info
```

### 3. Build & Test Executable

```bash
# Build production bundle
pnpm build

# Test the generated binary
./dist/cli.js --help
./dist/cli.js init -y
./dist/cli.js info
```

---

## 🛠️ Scripts & Commands

| Command | Description |
| :--- | :--- |
| `pnpm dev` | Rebuild bundle automatically on file change |
| `pnpm build` | Bundle CLI into `./dist/cli.js` & `./dist/index.js` |
| `pnpm typecheck` | Run TypeScript type safety checks |
| `pnpm lint` | Run Biome linter & formatter check |
| `pnpm lint:fix` | Automatically fix Biome linting/formatting issues |
| `pnpm test` | Run Vitest unit tests |
| `pnpm test:coverage` | Generate code coverage report |

---

## 📝 License

[MIT](./LICENSE)
