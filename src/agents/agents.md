You are right to call this out. I was refining terminology instead of giving you a **final architecture decision**. For a project like Peer-Coder, we should freeze the cognitive architecture first and build against it.

I will give you the list I would actually commit to for a **production-grade Cursor/Claude-Code-style coding agent**, especially considering:

* Local Ollama-first execution
* LangGraph orchestration
* Tool Runtime already built
* Future AST/LSP/code intelligence
* Future IDE integration
* Avoiding unnecessary agent explosion

No more renaming after this.

# Final Cognitive Agent Set

## 1. Orchestrator Agent

**Role:** Agent manager / workflow controller

Responsibilities:

* Receive user request
* Decide task type
* Select workflow
* Coordinate other agents
* Maintain task lifecycle
* Handle approvals
* Handle retries
* Decide completion

Tools:

* No direct coding tools

---

## 2. Workspace Intelligence Agent

**Role:** Understand the environment

Responsibilities:

* Detect language
* Detect frameworks
* Detect runtime
* Detect package manager
* Detect project structure
* Detect configuration
* Detect conventions
* Build workspace profile

Examples:

* Next.js + TypeScript + pnpm
* NestJS + PostgreSQL
* Python FastAPI
* Rust workspace

Tools:

* workspace_info
* list_files
* read_file
* search_code

---

## 3. Code Intelligence Agent

**Role:** Understand the codebase

Responsibilities:

* Find relevant files
* Find symbols
* Find references
* Trace execution paths
* Understand dependencies
* Build context graph
* Identify impacted code areas
* Summarize existing implementation

Tools:

* find_symbol
* find_references
* search_code
* AST
* LSP
* read_file

---

## 4. Planning Agent

**Role:** Software architect

Responsibilities:

* Convert requirement into implementation strategy
* Break work into tasks
* Define order of changes
* Decide files affected
* Identify risks
* Define acceptance criteria
* Decide testing strategy

Tools:

* No direct modification tools

---

## 5. Implementation Agent

**Role:** Senior developer

Responsibilities:

* Execute the plan
* Modify code
* Create files
* Refactor code
* Execute commands
* Follow repository conventions
* Produce clean diffs

Tools:

* read_file
* create_file
* apply_patch
* delete_file
* execute_command
* git_diff

---

## 6. Test & Verification Agent

**Role:** QA + CI engineer

Responsibilities:

* Review changes
* Run tests
* Run build
* Run type checks
* Run lint
* Validate requirements
* Analyze failures
* Produce verification report

Tools:

* execute_command
* get_command_output
* git_diff
* read_file

---

## 7. Debugging Agent

**Role:** Root-cause engineer

Responsibilities:

* Analyze failures
* Understand stack traces
* Find root cause
* Investigate runtime issues
* Propose fixes
* Coordinate with Implementation Agent

Tools:

* read_file
* search_code
* find_symbol
* find_references
* execute_command

---

## 8. Review Agent

**Role:** Senior code reviewer

Responsibilities:

* Review implementation quality
* Check architecture
* Check maintainability
* Check security issues
* Check performance concerns
* Suggest improvements

Tools:

* read_file
* git_diff
* search_code

---

## 9. Research Agent

**Role:** External knowledge specialist

Responsibilities:

* Research libraries
* Read documentation
* Understand APIs
* Compare approaches
* Bring external knowledge into planning

Tools:

* web_search
* fetch_webpage

---

## 10. Memory Agent

**Role:** Long-term knowledge manager

Responsibilities:

* Store project knowledge
* Store previous decisions
* Store architecture decisions
* Store user preferences
* Store failed approaches
* Retrieve relevant history

Important:
This is not normal chat memory.

It stores:

```
Project Memory
Architecture Memory
Task Memory
Decision Memory
```

---

# Final Architecture

```text
                    Orchestrator Agent
                            |
        ------------------------------------------------
        |              |              |                |
 Workspace        Code          Planning          Memory
 Intelligence     Intelligence

                            |
                            |
                  Implementation Agent

                            |
                            |
             Test & Verification Agent

                            |
              -------------------------
              |                       |
        Debugging Agent        Review Agent


                 Research Agent
                      |
              (used when required)
```

---

# Why these 10 and not 20?

Because these are the actual independent reasoning responsibilities.

I would NOT create separate:

* Git Agent ❌ → Git is a tool
* Security Agent ❌ → Review capability
* Documentation Agent ❌ → Implementation task
* Refactoring Agent ❌ → Implementation capability
* Testing Agent ❌ → Verification capability
* Architecture Agent ❌ → Planning/Review capability

---

# Build order for Peer-Coder

Do not build all 10 immediately.

Production order:

### Phase 1 — Core autonomous loop

1. Orchestrator
2. Workspace Intelligence
3. Code Intelligence
4. Planning
5. Implementation
6. Test & Verification

At this point:

```
Understand → Plan → Code → Verify
```

You have a real coding agent.

---

### Phase 2 — Self-healing

7. Debugging Agent

Adds:

```
Failure → Diagnose → Fix → Verify
```

---

### Phase 3 — Quality

8. Review Agent

Adds senior engineer behavior.

---

### Phase 4 — Intelligence

9. Research Agent
10. Memory Agent

---

This is the architecture I would freeze and build against. Your existing Tool Runtime, Workspace Manager, Policy Engine, Change Manager, and Validation infrastructure fit underneath these agents cleanly.
