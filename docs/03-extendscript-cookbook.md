# 03 — ExtendScript cookbook

Copy-paste starting points. All ES3-safe. Assume `#include "../lib/aejson.jsx"` where JSON is used.

## Script skeleton (use this every time)

```javascript
(function (thisObj) {
    if (!app.project) { alert("No project open."); return; }

    app.beginUndoGroup("AP: describe the change");
    try {
        // ... work ...
    } catch (e) {
        alert("Line " + e.line + ": " + e.toString());
    } finally {
        app.endUndoGroup();
    }
})(this);
```

For unattended/CLI runs, wrap in `app.beginSuppressDialogs()` … `app.endSuppressDialogs(false)`
and set `app.exitCode` instead of alerting.

## Project & items

```javascript
var proj = app.project;
proj.file;                       // File or null
proj.numItems;
proj.item(i);                    // 1-based
proj.activeItem;                 // selected/open comp
proj.selection;                  // array of selected items
proj.rootFolder.items;
proj.items.addFolder("Renders");
proj.save(new File("C:/Dev/AfterEffectClaude/projects/out.aep"));
proj.saveWithDialog();
proj.close(CloseOptions.SAVE_CHANGES);
proj.expressionEngine;           // "javascript-1.0" | "extendscript"
proj.bitsPerChannel = 16;
proj.timeDisplayType = TimeDisplayType.FRAMES;

// find a comp by name
function findComp(name) {
    for (var i = 1; i <= app.project.numItems; i++) {
        var it = app.project.item(i);
        if (it instanceof CompItem && it.name === name) return it;
    }
    return null;
}
```

## Import

```javascript
var io = new ImportOptions(new File("C:/Dev/AfterEffectClaude/assets/logo.ai"));
io.importAs = ImportAsType.COMP;      // COMP | COMP_CROPPED_LAYERS | FOOTAGE | PROJECT
var item = app.project.importFile(io);

// image sequence
var io2 = new ImportOptions(new File("C:/.../frames/shot_0001.png"));
io2.sequence = true;
io2.forceAlphabetical = true;
app.project.importFile(io2);

// check first: io.canImportAs(ImportAsType.COMP)
// replace footage on an existing item:
footageItem.replace(new File("C:/.../new.mov"));
footageItem.replaceWithSequence(new File("C:/.../seq_0001.png"), true);
```

## Compositions

```javascript
// name, width, height, pixelAspect, duration(sec), frameRate
var comp = app.project.items.addComp("MAIN", 1920, 1080, 1.0, 10, 30);
comp.bgColor = [0, 0, 0];
comp.motionBlur = true;
comp.frameDuration;              // seconds per frame
comp.displayStartTime = 0;
comp.workAreaStart = 0; comp.workAreaDuration = 5;
comp.openInViewer();
comp.duplicate();
comp.time = 2.5;                 // playhead
comp.renderer;                   // "ADBE Advanced 3d" | "ADBE Standard 3d" (Classic/CINEMA 4D)
```

Frames ↔ time: **the API is always seconds.**
`t = frame * comp.frameDuration` and `frame = Math.round(t / comp.frameDuration)`.

## Layers

```javascript
var L  = comp.layers;
var av = L.add(footageItem, 5);                       // duration optional
var tx = L.addText("Hello");
var sh = L.addShape();
var so = L.addSolid([1,0,0], "Red BG", comp.width, comp.height, 1, comp.duration);
var nu = L.addNull(comp.duration);
var cm = L.addCamera("CAM", [comp.width/2, comp.height/2]);
var li = L.addLight("KEY", [960, 540]);
var adj = L.addSolid([1,1,1], "ADJ", comp.width, comp.height, 1); adj.adjustmentLayer = true;

lay.name = "BG";
lay.startTime = 1;               // seconds
lay.inPoint = 1; lay.outPoint = 4;
lay.enabled = false;             // eyeball
lay.shy = true; comp.hideShyLayers = true;
lay.locked = true;
lay.threeDLayer = true;
lay.motionBlur = true;
lay.blendingMode = BlendingMode.SCREEN;
lay.parent = nullLayer;          // null to unparent
lay.moveToBeginning(); lay.moveAfter(other); lay.moveBefore(other);
lay.copyToComp(otherComp);
lay.duplicate();
lay.remove();
lay.selected = true;
lay.label = 9;                   // label colour index
lay.trackMatteType = TrackMatteType.ALPHA;   // 22.0+ ; setTrackMatte(layer, type)
lay.guideLayer = true;
lay.collapseTransformation = true;           // continuous rasterise
```

## Transform properties

```javascript
var t = lay.transform;                       // == lay.property("ADBE Transform Group")
t.position.setValue([960, 540]);             // [x,y] or [x,y,z] if 3D
t.scale.setValue([100, 100]);                // percent
t.rotation.setValue(45);                     // degrees; 3D uses xRotation/yRotation/zRotation
t.opacity.setValue(50);                      // 0–100
t.anchorPoint.setValue([0, 0]);

// by matchName (locale-proof, preferred in shipped scripts)
lay.property("ADBE Transform Group").property("ADBE Position").setValue([960, 540]);
```

Value conventions: **colours are 0–1 floats** `[r,g,b]` (alpha ignored on most), opacity 0–100,
scale percent, rotation degrees, time seconds.

## Keyframes

```javascript
var p = lay.transform.position;

p.setValueAtTime(0,   [0, 540]);
p.setValueAtTime(1.5, [960, 540]);

// batch (much faster than repeated setValueAtTime)
p.setValuesAtTimes([0, 0.5, 1], [[0,540],[480,540],[960,540]]);

p.numKeys; p.keyTime(1); p.keyValue(1);
p.nearestKeyIndex(0.7);
p.removeKey(2);                                     // remove high→low if looping
p.addKey(2.0);                                      // key at current value

// interpolation
p.setInterpolationTypeAtKey(2, KeyframeInterpolationType.BEZIER,
                               KeyframeInterpolationType.BEZIER);
// LINEAR | BEZIER | HOLD

// easing — influence 0.1–100 (%), speed in units/sec
var easeIn  = new KeyframeEase(0, 75);
var easeOut = new KeyframeEase(0, 75);
p.setTemporalEaseAtKey(2, [easeIn], [easeOut]);     // 1 element per dimension!
// position (2D/3D spatial) = 1 ease pair; scale [x,y] = 2 pairs; use p.value.length

// spatial motion path
p.setSpatialTangentsAtKey(2, [-100,0,0], [100,0,0]);
p.setSpatialAutoBezierAtKey(2, true);
p.setRovingAtKey(2, true);
p.setSelectedAtKey(2, true);
```

Helper for eases across arbitrary dimensions:

```javascript
function easeKey(prop, idx, inSpeed, inInf, outSpeed, outInf) {
    var n = (prop.value instanceof Array) ? prop.value.length : 1;
    if (prop.propertyValueType === PropertyValueType.TwoD_SPATIAL ||
        prop.propertyValueType === PropertyValueType.ThreeD_SPATIAL) n = 1;
    var eIn = [], eOut = [];
    for (var i = 0; i < n; i++) {
        eIn.push(new KeyframeEase(inSpeed, inInf));
        eOut.push(new KeyframeEase(outSpeed, outInf));
    }
    prop.setTemporalEaseAtKey(idx, eIn, eOut);
}
```

## Expressions

```javascript
p.expression = "wiggle(2, 30)";
p.expressionEnabled = false;
p.expressionError;                       // "" when fine
p.canSetExpression;
p.valueAtTime(1.0, false);               // false = POST-expression value
```

## Effects

```javascript
var fx = lay.property("ADBE Effect Parade");        // == lay.Effects
var blur = fx.addProperty("ADBE Gaussian Blur 2");
blur.property("Blurriness").setValue(20);           // or property(1)
blur.name = "My Blur";
blur.enabled = false;
fx.property("My Blur").remove();

// discover the matchName for anything installed:
for (var i = 0; i < app.effects.length; i++) {
    $.writeln(app.effects[i].displayName + "  →  " + app.effects[i].matchName);
}
```

Common stock matchNames: `ADBE Gaussian Blur 2`, `ADBE Fill`, `ADBE Tint`, `ADBE Ramp`,
`ADBE Drop Shadow`, `ADBE Glo2` (Glow), `ADBE Levels2`, `ADBE CurvesCustom`, `ADBE Transform`,
`ADBE Echo`, `ADBE Timewarp`, `ADBE Corner Pin`, `ADBE Displacement Map`, `ADBE Roughen Edges`.
Expression controls: `ADBE Slider Control`, `ADBE Point Control`, `ADBE Angle Control`,
`ADBE Color Control`, `ADBE Checkbox Control`, `ADBE Layer Control`, `ADBE Dropdown Control`.
**Verify against `app.effects` rather than trusting this list.**

## Text

```javascript
var srcText = textLayer.property("ADBE Text Properties").property("ADBE Text Document");
var td = srcText.value;              // TextDocument — a COPY
td.text = "New copy";
td.fontSize = 72;
td.font = "Inter-Bold";              // PostScript name, not display name
td.fillColor = [1, 1, 1];
td.applyFill = true; td.applyStroke = false;
td.justification = ParagraphJustification.CENTER_JUSTIFY;
td.tracking = -20;
td.leading = 80;
td.boxText;                          // true for paragraph text
srcText.setValue(td);                // MUST write the copy back
```

Per-character control (24.3+): `td.characterRange(start, end).fontSize = 90;`
Fonts: `app.fonts.allFonts`, `app.fonts.getFontsByFamilyNameAndStyleName(...)`,
`app.project.usedFonts`, `app.project.replaceFont(fromFont, toFont)`.

Text metrics from a script: use an expression — `sourceRectAtTime()` — and read it with
`valueAtTime(t, false)` on a temporary slider, or just read
`textLayer.sourceRectAtTime(t, false)` (available on AVLayer).

## Shape layers

```javascript
var shape = comp.layers.addShape();
var root  = shape.property("ADBE Root Vectors Group");     // "Contents"
var grp   = root.addProperty("ADBE Vector Group");
var cont  = grp.property("ADBE Vectors Group");

var rect = cont.addProperty("ADBE Vector Shape - Rect");
rect.property("ADBE Vector Rect Size").setValue([400, 200]);
rect.property("ADBE Vector Rect Roundness").setValue(20);

var fill = cont.addProperty("ADBE Vector Graphic - Fill");
fill.property("ADBE Vector Fill Color").setValue([1, 0.2, 0.2]);

var strokeGrp = cont.addProperty("ADBE Vector Graphic - Stroke");
strokeGrp.property("ADBE Vector Stroke Width").setValue(8);

// custom path
var pathGrp = cont.addProperty("ADBE Vector Shape - Group");
var s = new Shape();
s.vertices   = [[0,0], [200,0], [200,200]];
s.inTangents = [[0,0], [0,0], [0,0]];
s.outTangents= [[0,0], [0,0], [0,0]];
s.closed = true;
pathGrp.property("ADBE Vector Shape").setValue(s);

// modifiers on the group: "ADBE Vector Filter - Trim" (Trim Paths),
// "ADBE Vector Filter - Repeater", "ADBE Vector Filter - RC" (Round Corners),
// "ADBE Vector Filter - Offset" (Offset Paths), "ADBE Vector Filter - Merge"
```

## Masks

```javascript
var mask = lay.Masks.addProperty("ADBE Mask Atom");
mask.maskMode = MaskMode.ADD;
mask.inverted = false;
var mShape = new Shape();
mShape.vertices = [[0,0],[500,0],[500,500],[0,500]];
mShape.closed = true;
mask.property("ADBE Mask Shape").setValue(mShape);
mask.property("ADBE Mask Feather").setValue([20, 20]);
mask.property("ADBE Mask Opacity").setValue(100);
```

## Markers

```javascript
var mv = new MarkerValue("Chapter 1");
mv.duration = 2; mv.comment = "note"; mv.chapter = "ch1"; mv.url = "https://…";
lay.property("ADBE Marker").setValueAtTime(3, mv);
comp.markerProperty.setValueAtTime(5, new MarkerValue("beat"));
```

## Cameras, lights, 3D

```javascript
cam.property("ADBE Camera Options Group").property("ADBE Camera Zoom").setValue(1800);
cam.property("ADBE Camera Options Group").property("ADBE Camera Depth of Field").setValue(1);
light.lightType = LightType.SPOT;
light.property("ADBE Light Options Group").property("ADBE Light Intensity").setValue(120);
lay.property("ADBE Material Options Group").property("ADBE Casts Shadows").setValue(1);
```

## Essential Graphics / .mogrt

```javascript
comp.openInEssentialGraphics();
// add a property to the EGP panel:
var added = prop.addToMotionGraphicsTemplate(comp);        // or addToMotionGraphicsTemplateAs(comp, name)
comp.motionGraphicsTemplateName = "Lower Third";
comp.exportAsMotionGraphicsTemplate(true, "C:/Dev/AfterEffectClaude/exports/mogrt/lower-third.mogrt");
comp.motionGraphicsTemplateControllerCount;
```

## Writing data out (needs the write-files preference ON)

```javascript
function writeText(path, str) {
    var f = new File(path);
    f.encoding = "UTF-8";
    if (!f.open("w")) throw new Error("Cannot open " + path + " — is 'Allow Scripts to Write Files' on?");
    f.write(str);
    f.close();
}
```

`$.writeln()` goes to the ExtendScript console (VS Code debugger / ESTK), not to stdout of
`AfterFX.com` — for CLI feedback write a file or set `app.exitCode`.

## Selection & iteration helpers

```javascript
var sel = comp.selectedLayers;         // array
var selProps = comp.selectedProperties;
for (var i = 1; i <= comp.numLayers; i++) { var l = comp.layer(i); }

// recursive property walk
function walk(group, fn, depth) {
    for (var i = 1; i <= group.numProperties; i++) {
        var p = group.property(i);
        fn(p, depth || 0);
        if (p.numProperties > 0) walk(p, fn, (depth || 0) + 1);
    }
}
```
