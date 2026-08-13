# 05 — Driving a live After Effects session from Claude

Three levels. Start at the lowest one that does the job.

## Level 0 — one-shot script (no setup)

```powershell
& "C:\Program Files\Adobe\Adobe After Effects 2026\Support Files\AfterFX.com" -r "C:\Dev\AfterEffectClaude\scripts\probe-environment.jsx"
```

or `scripts/run-jsx.ps1 -Script <path>` which wraps it.

- If AE is **not** running: launches it, runs the script, leaves it open (set
  `app.exitAfterLaunchAndEval = true` inside the script to quit after).
- If AE **is** running: the script executes **inside that live instance, against whatever
  project is open**. This is the dangerous case — always ask before running a mutating script.
- No return channel. The script must write its result to a file under `exports/data/`.

Good for: probes, batch jobs on a project we opened ourselves, build-then-render pipelines.
Bad for: iterative back-and-forth (every call has AE-launch latency and steals focus).

## Level 1 — the file-IPC bridge panel (recommended)

`scripts/bridge/AP-Bridge.jsx` is a dockable ScriptUI panel that polls a folder for command
files, runs them, and writes results back. Claude writes JSON, reads JSON. No sockets, no CEP,
no registry changes, no admin rights.

**Install** (per-user, no elevation):

```bash
copy "C:\Dev\AfterEffectClaude\scripts\bridge\AP-Bridge.jsx" "%APPDATA%\Adobe\After Effects\26.2\Scripts\ScriptUI Panels\AP-Bridge.jsx"
```

Restart AE, then Window ▸ AP-Bridge.jsx, dock it, tick **Listen**.

**Protocol** — IPC root `C:\Dev\AfterEffectClaude\.tmp\bridge\`:

```
inbox/<id>.json     Claude writes    {"id":"…","action":"eval","code":"…","undo":"label"}
outbox/<id>.json    panel writes     {"id":"…","ok":true,"result":…,"log":[…],"error":null,"ms":12}
status.json         panel writes     heartbeat: version, project, activeItem, listening, lastTick
```

Actions: `eval` (arbitrary ExtendScript, result is the last expression), `ping`, `probe`
(environment dump), `render` (queue + render, blocking — the panel will be frozen during it).

Flow for Claude:
1. Write `inbox/<uuid>.json`.
2. Poll `outbox/<uuid>.json` for up to N seconds (default poll interval is 750 ms).
3. Read result, delete both files.

Every `eval` is wrapped in an undo group named from `undo`, so Fakhrul can Ctrl+Z anything we do.

**Limits:** the panel runs on AE's main thread — a long script freezes the UI, and nothing is
processed while a modal dialog is open. Keep commands short and idempotent. If AE is busy
rendering, commands queue up until it's free.

## Level 2 — CEP panel or an off-the-shelf MCP server

Only if we need a real socket, npm packages, or streaming progress.

- **CEP 12 panel**: HTML/JS with Node.js, `CSInterface.evalScript()` into ExtendScript, can hold
  a WebSocket to a local server. Requires `HKCU:\Software\Adobe\CSXS.12 → PlayerDebugMode = "1"`
  for unsigned panels.
- **Existing AE MCP servers** (all use the same panel + file/socket IPC idea underneath, all
  Node-based):
  - `kumoproductions/mcp-aftereffects` — TypeScript, Win+macOS, AE 2024–2026, project/comp/layer
    introspection, atomic undo-grouped ops, JSON project export/import, single-frame render via
    file IPC, plus arbitrary-ExtendScript escape hatch. Closest to what we'd build.
  - `Dakkshin/after-effects-mcp` (+ forks) — comps, text, shapes, solids, properties via a
    `mcp-bridge-auto.jsx` panel with an auto-run checkbox.
  - `a-y-ibrahim/after-effects-mcp` — 47 tools, background rendering, deep inspection.

  Vet before installing: they all execute arbitrary ExtendScript inside AE, and Node isn't
  currently on PATH here.

## Choosing

| Need | Use |
|---|---|
| Inspect the open project once | Level 0 probe, or Level 1 `probe` |
| Build a comp / apply changes iteratively | Level 1 |
| Render a file | `aerender` (see [04](04-rendering.md)) — not the bridge |
| Batch 50 projects overnight | Level 0 script + `aerender`, no GUI interaction |
| Streaming progress, npm deps, sockets | Level 2 |
