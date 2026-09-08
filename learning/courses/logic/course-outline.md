# Logic Course — UltraIa Learning

## Course Overview
Structured logic course covering mathematical logic, reasoning patterns, and logical frameworks used in software development and AI engineering. Based on verified learning from UltraIa.

## Module 1: Mathematical Foundations
### 1.1 Propositional Logic
- Propositions and truth values (True/False)
- Logical connectives: AND (∧), OR (∨), NOT (¬), IMPLIES (→), IFF (↔)
- Truth tables for all connectives
- Tautologies and contradictions

### 1.2 Predicate Logic
- Quantifiers: ∀ (for all), ∃ (there exists)
- Predicates and propositions with variables
- Scope and binding of variables
- Negation of quantifiers: ¬∀x P(x) ≡ ∃x ¬P(x)

### 1.3 Logical Equivalences
- De Morgan's laws: ¬(A ∧ B) ≡ ¬A ∨ ¬B
- Distributive laws: A ∧ (B ∨ C) ≡ (A ∧ B) ∨ (A ∧ C)
- Associative and commutative properties

## Module 2: Reasoning Patterns (from UltraIa Learning)
### 2.1 IA Loop 4-Phase Pattern
- **Sensado**: Read real state, problem, STATE.md, LEARNINGS.md
- **Razonamiento**: Plan reasoning, prediction, [P] marker
- **Acción**: Execute plan, implement, stage commits
- **Ajuste**: Measure results, learn, adjust rules

### 2.2 Verification Logic
- **API directa > web search**: For numeric live data, use APIs not web search
- **Exact fields**: When requesting raw data, specify exact field names
- **Truth separate from responses**: Verified truth stored apart from model responses
- **Type-driven comparison**: Comparison type (exact/approx/dict/text) comes from truth

### 2.3 RICE Prioritization
- **Reach**: How many users affected?
- **Impact**: How big is the effect?
- **Confidence**: How sure are we?
- **Effort**: How much work required?
- Prioritize: P0 (seguridad/gates RED), P1-P5 scale

### 2.4 Budget-aware Decision Making
- Token budget per cycle (early exit at 80%, stop at 100%)
- Time budget per day (6h max PIVR)
- Early exit: report-only at 80%, stop at 100%
- Token/time tracking and enforcement

### 2.5 Gap Detection and Prioritization
- Detect gaps between current state and desired state
- RICE/META-IA experiment matrix (A/B/C/D)
- Prioritize by: impact × confidence ÷ effort
- Motor META-IA de experimentos A/B/C/D

## Module 3: Logical Frameworks in UltraIa
### 3.1 State Integrity Check (from `state-integrity-check`)
- 13 structural checks on STATE.md
- ID duplication detection
- Row outside table detection
- Kill switch detection (`loop-pause-all`)
- Encoding anomaly detection
- Critical files at 0 bytes
- Mass wipe detection (shared mtime)
- Truncated blobs (<50% HEAD)
- Skills desync (SHA-1 mirrors)
- Lock state (active/stale/missing)
- Staged deletions (.ts/.test.ts batch > 50)
- Log drift (last entry without [R]/hash/JSON)
- Plan file collisions (2+ loop-<id>-*.md)

### 3.2 Loop Triage Logic
- Step 0: Run state-integrity-check first
- Analyze git log (24-48h)
- Working tree analysis
- STATE.md analysis
- Lock concurrency analysis
- 24h budget analysis
- run-log analysis
- Enlaces.txt analysis (<48h without source)
- Push divergence (`origin/master..HEAD`)
- "Proxima acción recomendada" JSON output
- Permissions: edit allow only STATE.md + run-log (headless)

### 3.3 Auto-learn Gap Detection
- Parse LEARNINGS.md (`parseLearnings`)
- Scan truth verified (`scanTruthStats`)
- Semantic memory scan
- Gap detection (`detectGaps`)
- Prioritize (RICE simplified + META-IA motor)
- 70/20/10 budget allocation

## Module 4: Logical Fallacies to Avoid
### 4.1 Common Errors in AI/LLM Prompts
- **Inventing timestamps**: Never create timestamps de novo
- **Web search for numeric data**: Use APIs instead
- **Assuming response accuracy**: Verify against truth
- **PowerShell JSON breaking**: Use Write tool, not Set-Content
- **Encoding issues**: BOM from Set-Content corrupts UTF-8

### 4.2 Logical Fallacies
- **Correlation ≠ Causation**: Just because two metrics move together doesn't mean one causes the other
- **Gambler's fallacy**: Past independent events don't affect future probabilities
- **Availability bias**: Using readily available examples instead of statistical analysis
- **Anthropomorphism**: Attributing human intent to model behavior

## Module 5: Logic in Code
### 5.1 Conventional Commits
- Format: `feat|fix|chore(scope): description`
- Types: feat, fix, chore, docs, style, refactor, perf, test, build
- Scope: optional, e.g., `(auth)`, `(.next)`, `(api)`
- Required: `git commit -m "...` -- <paths>``

### 5.2 Gate Logic
- Order: typecheck → lint → test → build
- Gates must be GREEN before commit
- Kill dev servers before build (`taskkill /T /F`)
- Maximum 3 retry attempts on RED
- Escalate to High Priority after 3 failures

### 5.3 Error Handling Patterns
- **Fail-soft**: Degrade gracefully, never crash
- **Timing-safe comparison**: sha256 + timingSafeEqual
- **Host/Origin validation**: Only loopback (127.0.0.1|localhost|[::1])
- **Rate limiting**: Fixed window default 120 req/min → 429 + Retry-After
- **Body cap**: 64 KiB → 413 with Connection: close