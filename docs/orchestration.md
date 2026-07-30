# Orchestration (Production)

Peer-Coder coordinates specialists with a **slim Orchestrator**. Task state, context assembly, and the code graph are **shared substrate** — not rebuilt per agent.

## Hard boundaries

| Component | Owns | Must not |
|-----------|------|----------|
| **Repository Analysis** (`workspace_intelligence`) | `repository_profile` artifact (languages, PM, frameworks) | Symbol indexing |
| **Code Intelligence** | Query **Workspace Graph** → `code_intel` artifact | Stack/package detection |
| **Workspace Graph** | Shared IndexEngine + profile cache | Ad-hoc re-walk inside Plan/Impl |
| **Task Manager** | L1 create/update/close + artifact links | Workflow routing |
| **Execution Journal** | Append-only step log | Business logic |
| **Context Engine** | Prompt packs from typed artifacts | Tool calls / repo edits |
| **Orchestrator** | Classify → dispatch → failure matrix | Edit files, web search, rebuild graph |

## Typed artifacts

Zod envelopes in `src/agents/artifacts/` (`repository_profile`, `code_intel`, `research`, `plan`, `implementation`, `verification`, `orchestrator`). Agents pass `artifactIds` / Context Engine slices — not free-text handoffs.

## Workflows

| ID | Trigger | Steps |
|----|---------|-------|
| `workspace_analyze` | analyze / stack | Repo Analysis |
| `status_query` | progress / what's left | Task Manager + Journal |
| `research_only` | docs / how does X work | Research |
| `coding_change` | add/fix/implement (default) | Analysis → Graph index once → Code Intel → ResearchGate → Plan → Impl → Verify |

## Research gate

Runs Research before Planning when docs/API intent, weak Code Intel + external tokens, or `NEED_RESEARCH`. Skips pure local edits (typo/rename).

## Failure matrix

| Signal | Action |
|--------|--------|
| Missing agent | `PARTIAL` + `blockedOn` |
| `BLOCKED` | Stop |
| `NEED_RESEARCH` | Research → retry Impl once (Journal-guarded) |
| Verify knowledge-gap | Research → Impl once → re-verify |
| Research soft-fail | Continue unless required |

## CLI

```bash
peer-coder orchestrate "add feature X"
peer-coder research "zod coerce"
# REPL freeform → Orchestrator (PEER_CODER_LEGACY_INTERACT=1 for old interact)
```

## Local Ollama

Peer-Coder binds Implementation/Research tools onto the ChatOllama model (`bindTools`).

| Env | Purpose |
|-----|---------|
| `OLLAMA_LOCAL=true` | Use local Ollama host/model |
| `OLLAMA_HOST_LOCAL` / `OLLAMA_MODEL_LOCAL` | Local endpoint + model |
| `PEER_CODER_IMPL_SCAFFOLD=1` | Force markdown scaffold (tests only) |
| `PEER_CODER_HITL=1` | Prompt before WRITE/EXECUTE tools |
| `PEER_CODER_LEGACY_INTERACT=1` | REPL freeform uses old interact |

Use a **tool-capable** model (e.g. `qwen2.5-coder`, `llama3.1`). Smoke:

```bash
peer-coder orchestrate "add hello.ts that exports hello()" -p /path/to/fixture
```

Failed tool loops return FAILED/PARTIAL — never SUCCESS with an empty diff.
