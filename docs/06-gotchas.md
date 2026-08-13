# 06 — Gotchas

Read this before debugging. Most "AE scripting is broken" moments are on this list.

## Language

- **ExtendScript is ECMA-262 3rd edition.** No `let`/`const`, arrow functions, template
  literals, `JSON`, `Array.prototype.forEach/map/filter/indexOf/reduce`, `Object.keys`,
  `String.trim`, default params, or trailing commas in literals. A trailing comma is a **syntax
  error**, not a warning.
- `try { } catch (e) { }` works; `e.line`, `e.fileName`, `e.toString()` are your stack trace.
- There is no `console`. `$.writeln()` goes to the ExtendScript console (VS Code ExtendScript
  Debugger / ESTK), **not** to the shell that launched `AfterFX.com`. To report to a shell:
  write a file, or set `app.exitCode`.
- `#include "path.jsx"` and `$.evalFile(file)` for imports. `$.fileName` = path of the running
  script; `File($.fileName).parent` for script-relative paths — **but this is unreliable inside
  ScriptUI panels installed elsewhere**, so keep panels self-contained.

## Files and paths

- ExtendScript `File`/`Folder` take **URI-ish paths with forward slashes**;
  `new File("C:/Dev/x.aep")` is right, `"C:\Dev\x.aep"` in a literal is an escape mess.
- `file.fsName` gives the OS path (backslashes on Windows); wrap in `decodeURI()` when a path
  came from the DOM, since spaces arrive as `%20`.
- **Writing any file requires Preferences ▸ Scripting & Expressions ▸ "Allow Scripts to Write
  Files and Access Network".** Without it `file.open("w")` returns false and scripts fail
  silently. See [01-environment.md](01-environment.md) for the pref key.
- Non-ASCII paths: set `f.encoding = "UTF-8"` before writing, and remember AE writes a BOM if
  you ask for `"UTF-8"` on some builds — read back with the same encoding.

## Time, frames, indices

- Every time value in the API is **seconds**, never frames. Convert with `comp.frameDuration`.
- Floating-point time drift: comparing `keyTime(i) == 1.0` will fail. Compare with a tolerance
  of half a frame.
- **Collections are 1-based** (`comp.layer(1)`, `proj.item(1)`, `prop.property(1)`), but
  `app.effects`, `comp.selectedLayers`, `Shape.vertices` are ordinary **0-based arrays**. This
  is the single most common bug.
- Removing layers/keys while looping: iterate **backwards**, or collect then delete.

## Properties

- `setValue()` on a property that already has keyframes throws. Use `setValueAtTime()`, or check
  `prop.numKeys === 0` first.
- `setTemporalEaseAtKey` needs **one `KeyframeEase` per dimension** — 1 for spatial position, 2
  for `scale`, 3 for a 3D non-spatial. Wrong length throws a useless error.
- Colour is `[r,g,b]` floats 0–1. Passing 0–255 gives you white and no error.
- 2D→3D: enabling `threeDLayer` changes `position` from 2 to 3 components; set the flag first,
  then the values.
- Display names are localised; **matchNames are stable**. Always ship matchNames.
- `prop.canSetExpression`, `prop.canVaryOverTime`, `prop.isModified` exist — check before
  assuming.
- Effect properties can be addressed by index or by name, but names change with `fx.name`; index
  is stable within one effect type.

## Text

- `sourceText.value` returns a **copy** of the `TextDocument`. Mutating it does nothing until you
  `setValue()` it back.
- `td.font` wants the **PostScript name** ("Inter-Bold"), not the family+style shown in the UI.
  Enumerate with `app.fonts.allFonts` and read `postScriptName`.
- Changing `td.text` on a keyframed source text sets the value at the current time only if you
  use `setValueAtTime`.

## Undo, dialogs, unattended runs

- Always `app.beginUndoGroup(...)` / `endUndoGroup()`. Without it AE creates one undo step per
  operation and Fakhrul has to Ctrl+Z 400 times.
- Some operations (project close/save, importing with prompts) show modal dialogs that hang an
  unattended run. Guard with `app.beginSuppressDialogs()` / `endSuppressDialogs(false)`.
- Scripts run on the **main thread**. Anything long freezes the UI — no progress bar unless you
  build a ScriptUI window and call `win.update()`.
- `app.scheduleTask(codeString, ms, repeat)` is the only timer. The code is a **string** eval'd in
  global scope, so the thing it calls must be a global (`$.global.MyThing = …`).

## CLI

- Use **`AfterFX.com`**, not `AfterFX.exe`, when you want the shell to wait and to see output.
- `AfterFX -r script.jsx` **runs inside an already-open instance** against the open project.
  Never run a mutating script this way without asking.
- `aerender` with no `-comp`/`-rqindex` ignores `-output`, `-s`, `-e`, `-i`, and both templates.
- `aerender -help` exits with a non-zero code. Don't treat exit code alone as success/failure —
  parse the log.
- **Windows PowerShell 5.1 reads `.ps1` as ANSI unless the file has a UTF-8 BOM.** An em dash or
  smart quote in a helper script becomes mojibake and produces bogus parse errors ("Unexpected
  token 'is'"). Keep `.ps1` files ASCII-only, or write them UTF-8 **with** BOM. Hit while
  building `run-jsx.ps1` / `ae-send.ps1`. Verify with:
  `[System.Management.Automation.Language.Parser]::ParseFile($p,[ref]$t,[ref]$e); $e`

## Rendering

- Template names (`"Best Settings"`, output modules) are **per-install and localised**. Enumerate
  `rqItem.templates` / `om.templates` instead of hardcoding.
- No Media Encoder on this machine → `renderQueue.queueInAME()` fails.
- `rq.render()` is blocking and swallows the UI. For anything long, use `aerender` in a separate
  process.
- Output paths must exist? AE creates missing folders for most output modules, but not reliably —
  create the folder from the script first.

## Version

- We are on **26.2**. `app.version` returns a string like `"26.2"` — compare with
  `parseFloat(app.version)`, and gate anything from 26.3+ (parametric mesh) behind that check.
- Older projects opened in 26.2 are silently upgraded; saving overwrites them in the new format.
  Save copies into `projects/` rather than modifying Fakhrul's originals in place.
