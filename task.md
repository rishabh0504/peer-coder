# Tasks

## Setup
- [x] `pnpm add semver && pnpm add -D @types/semver`

## Phase 1 — Domain Model
- [x] `src/agents/domain/agent_definition.ts` — full definition with aliases, AgentRuntimeConfig, freezeDefinition()
- [x] `src/agents/domain/tool_definition.ts` — ToolDefinition with requiredPermission, ToolRegistry

## Phase 2 — Core Contracts
- [x] `src/agents/core/agent_result.ts` — AgentOutcome enum, AgentResult (handler), AgentExecutionResult (runtime wrapper)
- [x] `src/agents/core/execution_context.ts` — all services with AbortSignal, traceId on context, signal always present
- [x] `src/agents/core/lifecycle.ts` — AgentLifecycleHooks, AgentLifecycleManager, safeCall()

## Phase 3 — Registry Layer
- [x] `src/agents/registry/agent_registry.ts` — immutable (freezeDefinition), semver.rcompare, aliases
- [x] `src/agents/registry/capability_registry.ts` — byOutput + byInput indexes, unregister
- [x] `src/agents/registry/prompt_registry.ts` — versioned, frozen entries

## Phase 4 — Security Layer
- [x] `src/agents/security/permission.ts` — ToolPermission enum, PERMISSION_MATRIX (not linear), isPermissionGranted
- [x] `src/agents/security/tool_policy.ts` — glob match + validate(agent, toolDef) using tool.requiredPermission

## Phase 5 — Dependency Resolver
- [x] `src/agents/dependency/resolver.ts` — topo sort, circular detection, parallel levels, resolvedVersions snapshot

## Phase 6 — Execution Storage
- [x] `src/agents/runtime/execution_store.ts` — records only, includes traceId + resolvedDependencies
- [x] `src/agents/runtime/event_store.ts` — events only, traceId + spanId + parentEventId (OTel-compatible)
- [x] `src/agents/runtime/execution_tracker.ts` — bridges both stores, all event types

## Phase 7 — Health Check
- [x] `src/agents/runtime/health.ts` — AgentHealth, checkAgentHealth()

## Phase 8 — Middleware & Runtime
- [x] `src/core/utils/id_generator.ts` — createExecutionId + createTraceId using randomUUID()
- [x] `src/agents/runtime/middleware.ts` — AgentMiddleware with priority, buildMiddlewareChain (descending sort)
- [x] `src/agents/handlers/handler_registry.ts` — version-keyed, AgentHandler with optional hooks
- [x] `src/agents/runtime/agent_runtime.ts` — race-free (microtask), real AbortController, session memory isolation, tool.requiredPermission, isolated safeCall hooks, traceId propagation
- [x] `src/agents/runtime/instance.ts` — singleton wiring (includes toolRegistry)

## Phase 9 — Workspace Intelligence Migration
- [x] `src/agents/workspace_intelligence/schema.ts`
- [x] `src/agents/workspace_intelligence/definition.ts` (no runtime imports)
- [x] `src/agents/workspace_intelligence/handler.ts` (AgentHandler + optional hooks)
- [x] `src/agents/workspace_intelligence/graph.ts` (no registry/runtime imports)

## Phase 10 — Manifests
- [x] `src/agents/manifests/workspace.ts`
- [x] `src/agents/manifests/index.ts` — registerModule, bootstrapAgentRegistry with health check

## REPL Connection (NEW)
- [x] Make `bootstrapAgentRegistry()` idempotent in `src/agents/manifests/index.ts`
- [x] Create `src/agents/runtime/container_factory.ts`
- [x] Create `src/cli/renderers/workspace_renderer.ts`
- [x] Create `src/cli/analyze.ts`
- [x] Modify `src/cli/repl.ts` to dispatch `/analyze` command
- [x] Modify `src/cli.ts` to add `analyze` sub-command
- [x] Create `tests/cli/analyze.test.ts`

## Verify
- [x] `pnpm typecheck && pnpm lint && pnpm test`

---

## FUTURE PHASES (not blocking Phase 1)
- [ ] `src/agents/runtime/state_machine.ts` — Phase 2
- [ ] `src/agents/sandbox/tool_sandbox.ts` — Phase 2 (before terminal.execute exposed)
- [ ] `src/agents/observability/tracer.ts` — Phase 3 (OTel export)
- [ ] `src/agents/observability/metrics.ts` — Phase 3
- [ ] PostgreSQL/SQLite ExecutionStore adapter — Phase 3
- [ ] Distributed execution workers — Phase 4
