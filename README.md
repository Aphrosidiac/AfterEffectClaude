# AfterEffectClaude

After Effects automation workspace for Fakhrul + AP. Load this project for any After Effects
work — the knowledge base in `docs/` means the AE control surface doesn't have to be
re-researched every session.

**Target: After Effects 2026 (26.2) on Windows.** Verified against the actual install
2026-08-13.

## What's here

```
docs/       the knowledge base — read CLAUDE.md for the order
scripts/    reusable ExtendScript + PowerShell helpers
projects/   .aep / .aepx files
assets/     footage going INTO After Effects
exports/    everything coming OUT (renders/, mogrt/, data/)
```

## First run

1. **Turn on file writing** — Edit ▸ Preferences ▸ Scripting & Expressions ▸
   *Allow Scripts to Write Files and Access Network*. Nothing here works without it.
2. **Probe the machine** (read-only, safe with a project open):

```bash
powershell -ExecutionPolicy Bypass -File "C:\Dev\AfterEffectClaude\scripts\run-jsx.ps1" -Script "C:\Dev\AfterEffectClaude\scripts\probe-environment.jsx"
```

   Writes `exports/data/ae-environment.json` — every installed effect with its matchName, fonts,
   GPU, prefs, and the open project's shape.

3. **Optional: install the live bridge** so Claude can drive the open AE session:

```bash
copy "C:\Dev\AfterEffectClaude\scripts\bridge\AP-Bridge.jsx" "%APPDATA%\Adobe\After Effects\26.2\Scripts\ScriptUI Panels\AP-Bridge.jsx"
```

   Restart AE → Window ▸ AP-Bridge.jsx → tick **Listen**. Then:

```bash
powershell -ExecutionPolicy Bypass -File "C:\Dev\AfterEffectClaude\scripts\ae-send.ps1" -Action ping
```

## Everyday commands

| Task | Command |
|---|---|
| Run a script | `scripts\run-jsx.ps1 -Script <file.jsx>` |
| Run one line | `scripts\run-jsx.ps1 -Code "alert(app.version)"` |
| Is AE running? | `scripts\run-jsx.ps1 -CheckOnly` |
| Talk to the bridge | `scripts\ae-send.ps1 -Code "app.project.numItems"` |
| Bridge alive? | `scripts\ae-send.ps1 -Action status` |
| Headless render | `"…\Support Files\aerender.exe" -project X.aep -comp MAIN -output out[####].png` |

## Safety

After Effects is usually open with real client work. `run-jsx.ps1` and `aerender -reuse` run
**inside that live instance**. Read-only probes are fine; anything that mutates the project gets
asked about first, and always runs inside an undo group.
