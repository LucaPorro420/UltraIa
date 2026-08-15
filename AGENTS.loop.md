# AGENTS.loop.md — Opencode Minimal Loop (scaffold de referencia)

> Contenido original del starter `minimal-loop-opencode` de loop-engineering.
> El AGENTS.md del proyecto (UltraIa) conserva sus reglas propias; este archivo
> documenta el contrato L1/L2 del scaffold para referencia.

## Loop Mode

- Start in L1 report-only mode.
- Read `STATE.md` before any triage.
- Update `STATE.md` after every loop run.
- Do not edit source code until the human explicitly enables L2.

## Safety

- Never push or merge without human approval.
- Never edit `.env`, `.env.*`, `auth/`, `payments/`, `secrets/`, or `credentials/`.
- Use a git worktree for every code-changing attempt.
- Max 3 fix attempts per item; escalate after that.

## Verification

- For L2+ changes, dispatch a verifier sub-agent after implementation.
- Run the project's documented tests before proposing a fix.
- Record test evidence in `STATE.md`.