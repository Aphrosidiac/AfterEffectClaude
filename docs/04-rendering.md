# 04 — Rendering and output

Full verbatim `aerender -help` for our exact build is in
[aerender-help-26.2.txt](aerender-help-26.2.txt) (`aerender version 26.2x49`). Summary below.

## aerender — the headless path

```bash
"C:\Program Files\Adobe\Adobe After Effects 2026\Support Files\aerender.exe" -project "C:\Dev\AfterEffectClaude\projects\demo.aep" -comp "MAIN" -output "C:\Dev\AfterEffectClaude\exports\renders\main[####].png"
```

| Flag | Meaning |
|---|---|
| `-project <path>` | project to open; omitted → uses the currently open project |
| `-teamproject <name>` | open a Team Project by name |
| `-comp <name>` | render this comp. Already queued & queueable → renders the first such instance; not queued → it is added to the queue |
| `-rqindex <n>` | render a specific render-queue item instead |
| `-RStemplate <name>` | apply a Render Settings template (error if it doesn't exist) |
| `-OMtemplate <name>` | apply an Output Module template (error if it doesn't exist) |
| `-renderSettings "k: v; k2: v2"` | override individual render settings after the template, e.g. `"Resolution: Half; Quality: Draft"` |
| `-outputSettings "k: v; …"` | override individual output-module settings, e.g. `"Crop: true; Crop Top: 4"` |
| `-output <path>` | output file/pattern; `[####]` = frame padding |
| `-s <frame>` / `-e <frame>` | start / end frame — **`-e` is inclusive** |
| `-i <n>` | frame increment (1 = every frame) |
| `-mem_usage <cache%> <max%>` | image-cache % and total memory % |
| `-mfr <ON\|OFF> <maxCpu%>` | multi-frame rendering + CPU cap |
| `-v <ERRORS\|ERRORS_AND_PROGRESS>` | verbosity (default `ERRORS_AND_PROGRESS`) |
| `-log <path>` | log file |
| `-close <DO_NOT_SAVE_CHANGES\|SAVE_CHANGES\|DO_NOT_CLOSE>` | default `DO_NOT_SAVE_CHANGES`; `DO_NOT_CLOSE` only works with `-reuse` |
| `-sound <ON\|OFF>` | completion sound (default OFF) |
| `-continueOnMissingFootage` | render placeholder colour bars instead of aborting |
| `-reuse` | render in the **already-running** AE instance instead of launching a new one |
| `-version`, `-help` / `-h` | info only |

**Behaviour that bites:**

- With **no `-comp` and no `-rqindex`**, aerender renders the whole queue as-is and *ignores*
  `-RStemplate`, `-OMtemplate`, `-output`, `-s`, `-e`, `-i`. Only `-project`, `-log`, `-v`,
  `-mem_usage`, `-close` apply.
- Without `-reuse`, aerender launches its own instance and quits it when done (safe alongside
  Fakhrul's open session, just RAM-hungry). With `-reuse` it hijacks the running instance — and
  then also writes preferences on quit.
- `aerender` exits non-zero and prints usage on `-help`; treat a non-zero exit as failure only
  after checking stderr text.
- Multi-machine: `-RStemplate "Multi-Machine Settings" -OMtemplate "Multi-Machine Sequence"` with
  a frame-sequence output, one aerender per machine over the same watched output folder.

## Render queue from a script

```javascript
var comp = findComp("MAIN");
var rq   = app.project.renderQueue;
var item = rq.items.add(comp);

item.applyTemplate("Best Settings");          // Render Settings template
item.timeSpanStart = 0;
item.timeSpanDuration = comp.duration;
item.render = true;                            // include in this render pass
item.setSetting("Quality", "Best");            // key/value form, same keys as -renderSettings
item.getSetting("Resolution");
item.getSettings(GetSettingsFormat.STRING_SETTABLE);   // dump every settable key → use this to discover keys

var om = item.outputModule(1);
om.applyTemplate("H.264 - Match Render Settings - 15 Mbps");   // name must exist
om.file = new File("C:/Dev/AfterEffectClaude/exports/renders/main.mp4");
om.includeSourceXMP = false;
om.setSetting("Post-Render Action", "Import");
var om2 = item.outputModule(1).name;           // read
item.outputModules.add();                      // second output from one render pass

rq.render();                                   // blocking
rq.pauseRendering(true);
rq.stopRendering();
rq.showWindow(true);
item.status;                                   // RQItemStatus.QUEUED / RENDERING / DONE / …
item.onStatusChanged = "myCallbackName";
rq.queueInAME(true);                           // ❌ no Media Encoder installed on this machine
```

**Discover the real template names before using them** — they differ per install:

```javascript
$.writeln(item.templates.join("\n"));          // render settings templates
$.writeln(om.templates.join("\n"));            // output module templates
```

`scripts/probe-environment.jsx` dumps both to `exports/data/ae-environment.json`.

## Output format notes for this machine

- No Adobe Media Encoder installed → `queueInAME` is unavailable; H.264 must come from AE's own
  H.264 output module (present in modern AE) or you render a lossless intermediate and transcode
  with ffmpeg.
- Reliable lossless-ish intermediates from AE: PNG sequence, QuickTime Animation, ProRes
  (Windows AE 2026 can write ProRes).
- Alpha: set the output module channels to RGB+Alpha and colour to Straight/Premultiplied via
  `om.setSetting("Channels", "RGB + Alpha")` — verify key names with
  `om.getSettings(GetSettingsFormat.STRING_SETTABLE)`.
- Post-render transcode with ffmpeg is usually faster and more predictable than fighting AE's
  codec settings. Render PNG/ProRes → ffmpeg to final delivery.

## Sensible defaults for our automation

1. Build/modify the project with a `.jsx`, save the `.aep` under `projects/`.
2. Render with `aerender` (no `-reuse`) so Fakhrul's live session is untouched.
3. Write output into `exports/renders/`, one subfolder per job.
4. Log to `exports/renders/<job>/aerender.log` with `-log` and check it — aerender's stdout is
   noisy and its exit code is not always meaningful.
