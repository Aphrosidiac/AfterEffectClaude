# AfterEffectClaude — Project Instructions

This is Fakhrul's After Effects automation workspace. Load this project whenever the work
involves After Effects: scripting, automation, rendering, template building, motion graphics
data-merge, or anything exported out of AE.

**Read `docs/` before answering AE questions.** It is written so you never have to re-research
the AE scripting surface from scratch. If something in `docs/` turns out to be wrong or the AE
version changes, fix the doc in the same session — that is the point of this project.

## Read order

| File | When |
|---|---|
| [docs/01-environment.md](docs/01-environment.md) | Always — machine paths, AE version, what's installed |
| [docs/02-control-surfaces.md](docs/02-control-surfaces.md) | Deciding *how* to drive AE for a task |
| [docs/03-extendscript-cookbook.md](docs/03-extendscript-cookbook.md) | Writing any `.jsx` |
| [docs/04-rendering.md](docs/04-rendering.md) | Anything that outputs a file |
| [docs/05-agent-bridge.md](docs/05-agent-bridge.md) | Driving a *live* AE session from Claude |
| [docs/06-gotchas.md](docs/06-gotchas.md) | Before debugging anything weird |
| [docs/07-reference.md](docs/07-reference.md) | Need the upstream doc URL |

## Directory contract

```
AfterEffectClaude/
  docs/         guidance (this is the knowledge base — keep it current)
  scripts/      reusable .jsx we write; lib/ = shared helpers; bridge/ = live-control panel
  projects/     .aep / .aepx project files
  assets/       footage, images, audio, fonts going INTO After Effects
  exports/      everything coming OUT of After Effects
    renders/    video/image output
    mogrt/      Essential Graphics templates
    data/       JSON dumps from probe/inspection scripts
  .tmp/         bridge IPC scratch (git-ignored)
```

Anything exported from After Effects goes under `exports/`. Never write AE output into
`scripts/` or `docs/`.

## Hard rules

1. **After Effects is usually already running with Fakhrul's work open.** `AfterFX.exe -r` and
   `aerender -reuse` execute inside that live instance. Never run a mutating script against a
   live instance without asking first. Read-only probes are fine; say what you're running.
2. **Always wrap mutations in an undo group** (`app.beginUndoGroup` / `endUndoGroup`) so one
   Ctrl+Z reverts the whole script.
3. **ExtendScript is ES3.** No `let`/`const`, no arrow functions, no `JSON`, no `Array.forEach`
   / `map` / `indexOf`, no trailing commas. Use `scripts/lib/aejson.jsx`. See gotchas doc.
4. **Effects and properties are addressed by matchName, not display name.** Display names are
   localised; matchNames are stable.
5. **Never guess a template or effect name.** Run `scripts/probe-environment.jsx` and read the
   real list out of `exports/data/`.
6. Prefer `aerender.exe` (its own headless instance) over rendering in the live GUI instance.

## Quick commands

```bash
powershell -File "C:\Dev\AfterEffectClaude\scripts\run-jsx.ps1" -Script "C:\Dev\AfterEffectClaude\scripts\probe-environment.jsx"
```

```bash
"C:\Program Files\Adobe\Adobe After Effects 2026\Support Files\aerender.exe" -help
```
