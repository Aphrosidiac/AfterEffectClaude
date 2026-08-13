/**
 * build-demo-comp.jsx — reference implementation + self-test of the cookbook patterns.
 *
 * Builds a 1920x1080 / 30fps comp with an animated shape (eased keyframes), a text layer,
 * a wiggle expression, an effect addressed by matchName, and a marker — then saves the
 * project to projects/demo.aep.
 *
 * SAFETY: refuses to run if the open project already has items, unless FORCE is true.
 * Everything happens inside one undo group.
 */
(function () {

    var FORCE   = false;
    var SAVE_TO = "C:/Dev/AfterEffectClaude/projects/demo.aep";

    if (!FORCE && (app.project.numItems > 0 || app.project.file !== null)) {
        alert("build-demo-comp: a project is already open with content.\n\n" +
              "Open a new empty project (Ctrl+Alt+N) and run again, or set FORCE = true.");
        return;
    }

    app.beginUndoGroup("AP: build demo comp");
    try {
        var comp = app.project.items.addComp("DEMO", 1920, 1080, 1.0, 6, 30);
        comp.bgColor = [0.05, 0.05, 0.06];
        comp.motionBlur = true;
        comp.openInViewer();

        // --- background solid ------------------------------------------------
        var bg = comp.layers.addSolid([0.05, 0.05, 0.07], "BG", comp.width, comp.height, 1, comp.duration);
        var ramp = bg.property("ADBE Effect Parade").addProperty("ADBE Ramp");
        ramp.property("ADBE Ramp-0001").setValue([0, 0]);                    // start point
        ramp.property("ADBE Ramp-0002").setValue([0.10, 0.10, 0.16]);        // start colour
        ramp.property("ADBE Ramp-0003").setValue([comp.width, comp.height]); // end point
        ramp.property("ADBE Ramp-0004").setValue([0.02, 0.02, 0.03]);        // end colour

        // --- animated shape --------------------------------------------------
        var shape = comp.layers.addShape();
        shape.name = "PILL";
        var contents = shape.property("ADBE Root Vectors Group");
        var grp  = contents.addProperty("ADBE Vector Group");
        var vec  = grp.property("ADBE Vectors Group");

        var rect = vec.addProperty("ADBE Vector Shape - Rect");
        rect.property("ADBE Vector Rect Size").setValue([420, 120]);
        rect.property("ADBE Vector Rect Roundness").setValue(60);

        var fill = vec.addProperty("ADBE Vector Graphic - Fill");
        fill.property("ADBE Vector Fill Color").setValue([0.51, 0.55, 0.97]);  // indigo

        // position keyframes with real easing
        var pos = shape.property("ADBE Transform Group").property("ADBE Position");
        pos.setValuesAtTimes([0, 1.0], [[760, 540], [960, 540]]);
        pos.setInterpolationTypeAtKey(1, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
        pos.setInterpolationTypeAtKey(2, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
        easeKey(pos, 1, 0, 33, 0, 90);
        easeKey(pos, 2, 0, 90, 0, 33);

        // scale pop (2 dimensions => 2 ease pairs)
        var scale = shape.property("ADBE Transform Group").property("ADBE Scale");
        scale.setValuesAtTimes([0, 0.6], [[60, 60], [100, 100]]);
        easeKey(scale, 2, 0, 80, 0, 80);

        // --- text ------------------------------------------------------------
        var txt = comp.layers.addText("AfterEffectClaude");
        txt.name = "TITLE";
        var srcText = txt.property("ADBE Text Properties").property("ADBE Text Document");
        var td = srcText.value;                       // a COPY
        td.fontSize = 64;
        td.fillColor = [1, 1, 1];
        td.applyFill = true;
        td.applyStroke = false;
        td.justification = ParagraphJustification.CENTER_JUSTIFY;
        td.tracking = -10;
        srcText.setValue(td);                         // write it back
        txt.property("ADBE Transform Group").property("ADBE Position").setValue([960, 560]);
        txt.property("ADBE Transform Group").property("ADBE Opacity").setValueAtTime(0.5, 0);
        txt.property("ADBE Transform Group").property("ADBE Opacity").setValueAtTime(1.2, 100);

        // --- expression --------------------------------------------------------
        var rot = shape.property("ADBE Transform Group").property("ADBE Rotate Z");
        rot.expression = "wiggle(1.5, 4)";

        // --- effect by matchName ------------------------------------------------
        var glow = shape.property("ADBE Effect Parade").addProperty("ADBE Glo2");
        glow.property("ADBE Glo2-0002").setValue(30);   // glow radius

        // --- marker --------------------------------------------------------------
        comp.markerProperty.setValueAtTime(1.0, new MarkerValue("hit"));

        // --- save ------------------------------------------------------------------
        var f = new File(SAVE_TO);
        f.parent.create();
        app.project.save(f);

        alert("Demo comp built and saved:\n" + f.fsName +
              "\n\nRender it headless with:\naerender -project \"" + f.fsName + "\" -comp DEMO -output ...");
    } catch (e) {
        alert("build-demo-comp failed on line " + e.line + ":\n" + e.toString());
        app.exitCode = 1;
    } finally {
        app.endUndoGroup();
    }

    /** One KeyframeEase per dimension — spatial props count as 1. */
    function easeKey(prop, idx, inSpeed, inInf, outSpeed, outInf) {
        var n = 1, i, eIn = [], eOut = [];
        if (prop.propertyValueType !== PropertyValueType.TwoD_SPATIAL &&
            prop.propertyValueType !== PropertyValueType.ThreeD_SPATIAL &&
            (prop.value instanceof Array)) {
            n = prop.value.length;
        }
        for (i = 0; i < n; i++) {
            eIn.push(new KeyframeEase(inSpeed, inInf));
            eOut.push(new KeyframeEase(outSpeed, outInf));
        }
        prop.setTemporalEaseAtKey(idx, eIn, eOut);
    }
})();
