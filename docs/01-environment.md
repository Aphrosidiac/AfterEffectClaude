# 01 — Environment (this machine)

Verified 2026-08-13 on Fakhrul's Windows 11 desktop by inspecting the install, not from memory.
Re-verify with `scripts/probe-environment.jsx` if anything looks off.

## Installed

| Fact | Value |
|---|---|
| App | Adobe After Effects 2026 |
| Version | **26.2** (`aerender` reports build `26.2x49`) |
| Install root | `C:\Program Files\Adobe\Adobe After Effects 2026\Support Files\` |
| GUI executable | `AfterFX.exe` |
| Console launcher | `AfterFX.com` ← **use this from a shell**, it attaches to stdout |
| Headless renderer | `aerender.exe` |
| Other Adobe apps | Illustrator 2026, Creative Cloud. **No Premiere, no Media Encoder** |
| Third-party plugins | none — only stock + Cineware by Maxon |
| Extensibility platform | CEP **12** (`HKCU:\Software\Adobe\CSXS.12`). UXP folder exists but AE has no UXP panel API yet |
| Node.js | not on PATH in the agent shell — check before writing a Node-based bridge |

No Media Encoder means `renderQueue.queueInAME()` will fail. Everything renders through the AE
render queue or `aerender`.

## Paths that matter

```
C:\Program Files\Adobe\Adobe After Effects 2026\Support Files\
  AfterFX.exe                 GUI
  AfterFX.com                 console-attached launcher (stdout/stderr work)
  aerender.exe                headless render
  Scripts\
    Startup\                  .jsx auto-run at launch  ← agent bridge lives here
    Shutdown\                 .jsx auto-run at quit
    ScriptUI Panels\          dockable panels (Window menu)
    (support)\  (instructional)\
  Plug-ins\

%APPDATA%\Adobe\After Effects\26.2\
  Scripts\                    per-user scripts (no admin rights needed — prefer this)
  Presets\                    .ffx animation presets
  Adobe After Effects 26.2 MC Prefs     preferences file
  Interpretation Rules.txt
  logs\

%APPDATA%\Adobe\CEP\extensions\                     per-user CEP panels
C:\Program Files (x86)\Common Files\Adobe\CEP\extensions\   system CEP panels
```

Writing to `Program Files\...\Scripts\` needs an elevated shell. The `%APPDATA%` Scripts folder
does not, and AE reads both. **Default to `%APPDATA%\Adobe\After Effects\26.2\Scripts\`.**

## Stock ScriptUI panels present

`Create Nulls From Paths.jsx`, `VR Comp Editor.jsx` — nothing custom installed yet.

## The one preference that blocks everything

**Edit ▸ Preferences ▸ Scripting & Expressions ▸ "Allow Scripts to Write Files and Access
Network"** must be ON or every `file.open("w")` silently fails and the agent bridge cannot
work. Set it from a script (takes effect immediately in 26.x; restart if it doesn't):

```javascript
app.preferences.savePrefAsLong(
  "Main Pref Section", "Pref_SCRIPTING_FILE_NETWORK_SECURITY", 1,
  PREFType.PREF_Type_MACHINE_INDEPENDENT
);
app.preferences.saveToDisk();
```

Read it back with `app.preferences.getPrefAsLong("Main Pref Section", "Pref_SCRIPTING_FILE_NETWORK_SECURITY", PREFType.PREF_Type_MACHINE_INDEPENDENT)`.

## Version-gated APIs

We are on 26.2. Things that exist / don't:

- ✅ Fonts API (`app.fonts`, `FontObject`) — 24.0+
- ✅ `Project.replaceFont()`, `Project.usedFonts` — 24.5+
- ✅ Character / paragraph / composed-line ranges on `TextDocument` — 24.3+
- ✅ `app.restart()` — 25.4+
- ✅ Variable font axes (`PropertyGroup.addVariableFontAxis()`), `Property.propertyParameters`,
  `Property.valueText` — 26.0+
- ❌ Parametric mesh layers (`LayerCollection.addParametricMesh()`) — **26.3+, not available here**
- ❌ UXP panels — not shipped for After Effects; use CEP 12 + ExtendScript

## Current state

AE was **running** when this project was created (PID present). Assume it is running with a real
project open unless verified otherwise.
