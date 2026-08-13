# 07 — Reference links

Checked 2026-08-13. Fetch these only when the local docs don't answer it.

## Primary

- **After Effects Scripting Guide** (community-maintained, the real reference):
  https://ae-scripting.docsforadobe.dev/
  - Object model: `/introduction/objectmodel/`, class hierarchy: `/introduction/classhierarchy/`
  - Version changelog (which API landed in which release): `/introduction/changelog/`
  - `app`: `/general/application/` · project: `/general/project/` · system: `/general/system/`
  - Items: `/item/compitem/`, `/item/footageitem/`, `/item/avitem/`
  - Layers: `/layer/avlayer/`, `/layer/textlayer/`, `/layer/shapelayer/`, `/layer/cameralayer/`
  - Properties: `/property/property/`, `/property/propertygroup/`, `/property/propertybase/`
  - Render: `/renderqueue/renderqueue/`, `/renderqueue/outputmodule/`
  - Text: `/text/textdocument/`, `/text/fontsobject/`, `/text/characterrange/`
  - Other: `/other/keyframeease/`, `/other/importoptions/`, `/other/shape/`, `/other/preferences/`
  - **Match name lists**: `/matchnames/layer/avlayer/`, `/matchnames/layer/shapelayer/`,
    `/matchnames/layer/textlayer/`, `/matchnames/effects/firstparty/`
  - Whole guide on one page (big): `/print_page/`
- **Expression reference**: https://ae-expressions.docsforadobe.dev/
- **Adobe: Scripts in After Effects**: https://helpx.adobe.com/after-effects/using/scripts.html
- **Adobe: Automated rendering and network rendering** (aerender):
  https://helpx.adobe.com/after-effects/using/automated-rendering-network-rendering.html
  (slow/often times out — we have the real `-help` output in `aerender-help-26.2.txt`)
- **AE C++ SDK**: https://developer.adobe.com/after-effects/
- **CEP resources**: https://github.com/Adobe-CEP/CEP-Resources (AE 26 = CEP 12)

## Community

- **aenhancers forum** — https://www.aenhancers.com/ — where the hard scripting answers live
- **VS Code ExtendScript Debugger** (Adobe) — marketplace `adobe.extendscript-debug`

## AE MCP servers (Level 2 in [05](05-agent-bridge.md))

- https://github.com/kumoproductions/mcp-aftereffects — TS, AE 2024–2026, file IPC, JSON
  project export/import, single-frame render
- https://github.com/Dakkshin/after-effects-mcp — panel + auto-run commands
- https://github.com/a-y-ibrahim/after-effects-mcp — 47 tools, background render, RTL text

## Status notes worth remembering

- **UXP is not available for After Effects** as of 2026 — AE panels are still CEP + ExtendScript.
  ExtendScript is the supported automation language for AE and isn't going anywhere near-term.
- `.aepx` (XML project) is **not deprecated**; still produced by File ▸ Save As ▸ Save a Copy As
  XML, and Adobe positions it as the format for automated/text-based project manipulation.
