# 02 — Every way to control After Effects, ranked

This is the map. Pick the surface first, then write code.

| # | Surface | Reach | Headless? | Use when |
|---|---|---|---|---|
| 1 | **ExtendScript (.jsx)** | Full project DOM — everything the UI can do except a short blacklist | Only via `aerender`/`-r` into an instance | Default for anything |
| 2 | **aerender.exe CLI** | Render queue, render/output overrides | ✅ true headless | Any file output, batch, farm |
| 3 | **Expressions** | Per-property runtime logic inside the comp | n/a | Behaviour that must live in the project |
| 4 | **CEP 12 panel** (HTML/JS + jsx) | Everything ExtendScript can, plus Node.js, sockets, npm | ❌ needs GUI | Persistent UI, live agent bridge |
| 5 | **Menu commands** `app.executeCommand()` | Menu-only features unreachable from the DOM | ❌ | Auto-trace, Save Frame As, workspace ops |
| 6 | **.aepx (XML project)** | Text surgery on a saved project | ✅ | Bulk path/text rewrites, version downgrade, diffing |
| 7 | **Watch folder / render engine** | Distributed rendering | ✅ | Multi-machine farm |
| 8 | **Presets (.ffx) + templates** | Reusable effect stacks, render/output settings | ✅ via script | Repeatable looks and outputs |
| 9 | **BridgeTalk** | Drive AE from another Adobe app (e.g. Illustrator) | ❌ | Cross-app pipelines |
| 10 | **C++ SDK (AEGP / effect plugins)** | Absolute maximum, incl. pixel access | ✅ | Only if 1–9 genuinely can't do it |
| — | **UXP** | — | — | Not available for AE. Don't plan around it |

## 1. ExtendScript — the main surface

An ES3 JavaScript dialect with a DOM rooted at `app`. Six ways to execute it:

```powershell
# one-shot, file  (runs INSIDE a running instance if one exists)
& "…\Support Files\AfterFX.com" -r "C:\path\script.jsx"

# one-shot, inline code
& "…\Support Files\AfterFX.com" -s "alert(app.version)"
```

- **File ▸ Scripts ▸ Run Script File…** — manual, no install
- **`…\Scripts\*.jsx`** — appears in the File ▸ Scripts menu after restart
- **`…\Scripts\ScriptUI Panels\*.jsx`** — dockable panel in the Window menu (this is how you get
  a persistent, always-on script — the basis of the agent bridge)
- **`…\Scripts\Startup\*.jsx`** — auto-runs at launch, before the UI settles
- **VS Code + Adobe "ExtendScript Debugger" extension** — attach to AE, breakpoints, eval in a
  live session. Best interactive dev loop; you don't need CEP for it.

What the DOM covers: project & items, folders, footage & import, compositions, all layer types
(AV, text, shape, camera, light, 3D model), transforms, masks, effects, keyframes and
interpolation, expressions, markers, text documents down to character ranges, fonts, Essential
Graphics export, render queue and output modules, preferences, and menu command dispatch.

`app` highlights worth remembering:

| Member | Note |
|---|---|
| `app.project` | the whole project tree |
| `app.beginUndoGroup(s)` / `endUndoGroup()` | one Ctrl+Z for a whole script — always use |
| `app.beginSuppressDialogs()` / `endSuppressDialogs(alert)` | required for unattended runs |
| `app.executeCommand(id)` / `app.findMenuCommandId(str)` | menu bridge (string is locale-dependent) |
| `app.scheduleTask(code, delayMs, repeat)` / `cancelTask(id)` | timer → polling loops |
| `app.exitAfterLaunchAndEval`, `app.exitCode` | CLI exit control |
| `app.setMultiFrameRenderingConfig(on, maxCpuPct)` | MFR |
| `app.setMemoryUsageLimits(cachePct, maxPct)`, `app.purge(PurgeTarget.ALL_CACHES)` | memory |
| `app.effects` | array of every installed effect: `displayName`, `matchName`, `category`, `version` |
| `app.fonts` | full font enumeration (24.0+) |
| `app.availableGPUAccelTypes`, `app.isRenderEngine`, `app.version`, `app.buildName` | environment |
| `app.preferences` / `app.settings` | read+write prefs, persist your own settings |
| `app.openFast(file)` | faster project open, skips validation |
| `app.watchFolder(folder)`, `app.pauseWatchFolder()`, `app.endWatchFolder()` | farm |
| `app.onError` | callback for render errors |
| `app.saveProjectOnCrash`, `app.setSavePreferencesOnQuit(bool)`, `app.restart()`, `app.quit()` | lifecycle |

## 2. aerender — see [04-rendering.md](04-rendering.md)

The only genuinely headless path. Spawns its own AE instance by default (`-reuse` to hijack the
running one). Full verbatim flag list for 26.2 is in `aerender-help-26.2.txt`.

## 3. Expressions

JavaScript evaluated per-frame inside the project. Two engines: **JavaScript** (default,
AE 16.0+) and **Legacy ExtendScript** — set per project in File ▸ Project Settings ▸
Expressions, readable as `app.project.expressionEngine`.

Set from a script: `prop.expression = "wiggle(2,30)"`. Read back errors with
`prop.expressionError`. Toggle with `prop.expressionEnabled`.

`prop.valueAtTime(t, preExpression)` — pass `false` to get the **post-expression** value, i.e.
you can evaluate expression output from a script. That is the only way to read what an
expression produces without rendering.

Expressions can also *drive* things scripts can't easily: `sourceRectAtTime()` for text metrics,
`thisComp.layer(...)`, `posterizeTime()`, `timeRemap`, `toComp/fromComp` space conversion.

## 4. CEP 12 panels

HTML/CSS/JS panel + Node.js runtime, calls into ExtendScript via
`CSInterface.evalScript(code, callback)`. Gives you: real `require()`, `fs`, `http`, WebSocket,
npm packages — i.e. a socket to an external process, which ExtendScript alone cannot hold open.

Install: unsigned panels need debug mode —
`HKCU:\Software\Adobe\CSXS.12 → PlayerDebugMode = "1"` (string), panel folder under
`%APPDATA%\Adobe\CEP\extensions\<bundle-id>\` with a `CSXS/manifest.xml`.

For our purposes a ScriptUI panel + file IPC (surface 5 in [05-agent-bridge.md](05-agent-bridge.md))
is simpler and needs no registry change. Reach for CEP only if we need sockets or npm.

## 5. Menu commands

`app.executeCommand(app.findMenuCommandId("Auto-trace..."))`. Reaches things with no DOM API:
Auto-trace, Save Frame As, Convert Audio to Keyframes, Create Shapes from Vector Layer, Warp
Stabilizer application, workspace switching, Reveal in Explorer, etc.

Caveats: the lookup string must match the UI language exactly, IDs are not stable across
versions (find them at runtime, never hardcode), and some commands open a modal dialog that
will hang an unattended run.

## 6. .aepx

**File ▸ Save As ▸ Save a Copy As XML** produces a text project. Still supported in 26.x. Useful
for: rewriting footage paths in bulk, diffing two projects, downgrading to an older AE, or
generating projects from a template without opening AE. Binary blobs stay base64-encoded inside,
so only structural/textual edits are practical.

## 7. Watch folder & render engine

`app.watchFolder(Folder)` puts an instance into farm-slave mode. A machine with
`ae_render_only_node.txt` in the AE user folder starts as a render engine (no serial, no UI
editing). Relevant only if we ever build a render farm across the VPS boxes — note AE is not
licensed for headless cloud rendering on Linux, and none of Fakhrul's VPSs run Windows.

## 8. Presets and templates

- `.ffx` animation presets: `layer.applyPreset(new File(path))` — applies a saved effect/keyframe
  stack. Save presets from the UI (Animation ▸ Save Animation Preset), apply them by script.
- Render Settings / Output Module templates: named, applied by
  `rqItem.applyTemplate(name)` / `om.applyTemplate(name)`, created by
  `rqItem.saveAsTemplate(name)` / `om.saveAsTemplate(name)`.

## 9. BridgeTalk

```javascript
var bt = new BridgeTalk();
bt.target = "aftereffects-26.0";   // target spec; verify with BridgeTalk.getSpecifier
bt.body = "app.project.numItems";
bt.onResult = function (r) { $.writeln(r.body); };
bt.send();
```
Only relevant for Illustrator→AE pipelines (Illustrator 2026 *is* installed here).

## 10. C++ SDK

AEGP (After Effects General Plug-in) and effect plugins. Gives pixel access, custom effects,
hooks the scripting DOM has no equivalent for. Big lift — only if a task truly needs pixel-level
or performance-critical work.

## What you genuinely cannot do

- Read rendered pixels from a script (no framebuffer access) — you must render a frame to disk
  and read the file
- Roto Brush, Content-Aware Fill, Warp Stabilizer analysis, Mocha tracking: **not scriptable**
  (some can be *applied* via menu commands, but the analysis is interactive)
- Puppet pin creation is only partially scriptable and fragile
- Render one comp while the same instance is doing something else (single-threaded UI)
- Run AE on Linux, or on a machine with no display/session
