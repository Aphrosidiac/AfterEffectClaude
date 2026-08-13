/**
 * _kit.jsx - motion-graphics helper library for AE 26.2 (ES3).
 *
 * Defensive by design: effect parameters are addressed by matchName with an index
 * fallback, and fonts are resolved against app.fonts rather than guessed, so a
 * missing font or a renamed parameter degrades instead of throwing.
 *
 * Everything here is generic. Project-specific content lives in build.jsx.
 */
$.global.K = (function () {

    var K = {};

    K.warnings = [];
    function warn(m) { K.warnings.push(m); }
    K.warn = warn;

    // ---------------------------------------------------------------- colour
    /** "#6880f2" or "6880f2" -> [r,g,b] floats 0..1 */
    K.hex = function (h) {
        h = String(h).replace("#", "");
        return [parseInt(h.substr(0, 2), 16) / 255,
                parseInt(h.substr(2, 2), 16) / 255,
                parseInt(h.substr(4, 2), 16) / 255];
    };

    /** blend two [r,g,b] colours, t=0..1 */
    K.mix = function (a, b, t) {
        return [a[0] + (b[0] - a[0]) * t,
                a[1] + (b[1] - a[1]) * t,
                a[2] + (b[2] - a[2]) * t];
    };

    // ---------------------------------------------------------------- fonts
    /**
     * Resolve a real PostScript name from a family + list of acceptable styles.
     * Returns null (and warns) when the family is not installed, so the caller
     * can fall back rather than silently shipping a substituted font.
     */
    K.font = function (family, styles) {
        var i, j, all, f;
        try { all = app.fonts.allFonts; } catch (e) { warn("app.fonts unavailable: " + e); return null; }
        for (j = 0; j < styles.length; j++) {
            for (i = 0; i < all.length; i++) {
                f = all[i];
                try {
                    if (String(f.familyName).toLowerCase() === String(family).toLowerCase() &&
                        String(f.styleName).toLowerCase() === String(styles[j]).toLowerCase()) {
                        return f.postScriptName;
                    }
                } catch (e2) {}
            }
        }
        // family present but none of the requested styles: take the first match
        for (i = 0; i < all.length; i++) {
            try {
                if (String(all[i].familyName).toLowerCase() === String(family).toLowerCase()) {
                    warn("Font " + family + ": wanted [" + styles.join(", ") +
                         "], using " + all[i].styleName);
                    return all[i].postScriptName;
                }
            } catch (e3) {}
        }
        warn("Font family NOT INSTALLED: " + family + " (After Effects will substitute)");
        return null;
    };

    // ---------------------------------------------------------------- comps
    K.comp = function (name, w, h, dur, fps, folder) {
        var c = app.project.items.addComp(name, w, h, 1.0, dur, fps);
        if (folder) { c.parentFolder = folder; }
        c.motionBlur = true;
        return c;
    };

    K.folder = function (name, parent) {
        var f = app.project.items.addFolder(name);
        if (parent) { f.parentFolder = parent; }
        return f;
    };

    // ---------------------------------------------------------------- effects
    /** Add an effect, returning null + a warning instead of throwing. */
    K.fx = function (layer, matchName, niceName) {
        try {
            var e = layer.property("ADBE Effect Parade").addProperty(matchName);
            if (niceName) { e.name = niceName; }
            return e;
        } catch (err) {
            warn("Effect unavailable: " + matchName + " on " + layer.name);
            return null;
        }
    };

    /** Effect parameter by matchName, falling back to 1-based index. */
    K.fxp = function (effect, matchName, index) {
        if (!effect) { return null; }
        try { return effect.property(matchName); } catch (e) {}
        try { return effect.property(index); } catch (e2) {}
        warn("Effect param not found: " + matchName + " / index " + index);
        return null;
    };

    K.setFxp = function (effect, matchName, index, value) {
        var p = K.fxp(effect, matchName, index);
        if (p) { try { p.setValue(value); } catch (e) { warn("setValue failed on " + matchName); } }
        return p;
    };

    // ---------------------------------------------------------------- layers
    K.solid = function (comp, color, name, dur) {
        return comp.layers.addSolid(color, name || "solid", comp.width, comp.height, 1,
                                    dur || comp.duration);
    };

    /**
     * Linear gradient background across the whole comp.
     * dir: "v" (top->bottom), "h" (left->right), "d" (diagonal)
     */
    K.gradientBg = function (comp, c1, c2, dir, name) {
        var s = K.solid(comp, c1, name || "BG");
        var r = K.fx(s, "ADBE Ramp", "Gradient");
        if (!r) { return s; }
        var a = [0, 0], b = [comp.width, comp.height];
        if (dir === "v") { a = [comp.width / 2, 0]; b = [comp.width / 2, comp.height]; }
        if (dir === "h") { a = [0, comp.height / 2]; b = [comp.width, comp.height / 2]; }
        K.setFxp(r, "ADBE Ramp-0001", 1, a);
        K.setFxp(r, "ADBE Ramp-0002", 2, c1);
        K.setFxp(r, "ADBE Ramp-0003", 3, b);
        K.setFxp(r, "ADBE Ramp-0004", 4, c2);
        return s;
    };

    /**
     * Rounded rectangle shape layer.
     * o: {w,h,r,fill,stroke,strokeW,x,y,name,opacity}
     */
    K.rect = function (comp, o) {
        var lay = comp.layers.addShape();
        lay.name = o.name || "rect";
        var contents = lay.property("ADBE Root Vectors Group");
        var grp = contents.addProperty("ADBE Vector Group");
        grp.name = "shape";
        var vec = grp.property("ADBE Vectors Group");

        var rect = vec.addProperty("ADBE Vector Shape - Rect");
        rect.property("ADBE Vector Rect Size").setValue([o.w, o.h]);
        if (o.r !== undefined) { rect.property("ADBE Vector Rect Roundness").setValue(o.r); }

        if (o.fill) {
            var f = vec.addProperty("ADBE Vector Graphic - Fill");
            f.property("ADBE Vector Fill Color").setValue(o.fill);
            if (o.fillOpacity !== undefined) {
                try { f.property("ADBE Vector Fill Opacity").setValue(o.fillOpacity); } catch (e) {}
            }
        }
        if (o.stroke) {
            var st = vec.addProperty("ADBE Vector Graphic - Stroke");
            st.property("ADBE Vector Stroke Color").setValue(o.stroke);
            st.property("ADBE Vector Stroke Width").setValue(o.strokeW || 2);
        }

        lay.property("ADBE Transform Group").property("ADBE Position")
           .setValue([o.x !== undefined ? o.x : comp.width / 2,
                      o.y !== undefined ? o.y : comp.height / 2]);
        if (o.opacity !== undefined) {
            lay.property("ADBE Transform Group").property("ADBE Opacity").setValue(o.opacity);
        }
        return lay;
    };

    /** Perfect circle via the ellipse primitive. */
    K.circle = function (comp, o) {
        var lay = comp.layers.addShape();
        lay.name = o.name || "circle";
        var vec = lay.property("ADBE Root Vectors Group")
                     .addProperty("ADBE Vector Group").property("ADBE Vectors Group");
        var el = vec.addProperty("ADBE Vector Shape - Ellipse");
        el.property("ADBE Vector Ellipse Size").setValue([o.d, o.d]);
        if (o.fill) {
            vec.addProperty("ADBE Vector Graphic - Fill")
               .property("ADBE Vector Fill Color").setValue(o.fill);
        }
        if (o.stroke) {
            var st = vec.addProperty("ADBE Vector Graphic - Stroke");
            st.property("ADBE Vector Stroke Color").setValue(o.stroke);
            st.property("ADBE Vector Stroke Width").setValue(o.strokeW || 3);
        }
        lay.property("ADBE Transform Group").property("ADBE Position").setValue([o.x, o.y]);
        return lay;
    };

    /** Straight line as a stroked 2-point path (for connectors, rules, underlines). */
    K.line = function (comp, o) {
        var lay = comp.layers.addShape();
        lay.name = o.name || "line";
        var vec = lay.property("ADBE Root Vectors Group")
                     .addProperty("ADBE Vector Group").property("ADBE Vectors Group");
        var pathGrp = vec.addProperty("ADBE Vector Shape - Group");
        var s = new Shape();
        s.vertices = [[o.x1, o.y1], [o.x2, o.y2]];
        s.inTangents = [[0, 0], [0, 0]];
        s.outTangents = [[0, 0], [0, 0]];
        s.closed = false;
        pathGrp.property("ADBE Vector Shape").setValue(s);
        var st = vec.addProperty("ADBE Vector Graphic - Stroke");
        st.property("ADBE Vector Stroke Color").setValue(o.color);
        st.property("ADBE Vector Stroke Width").setValue(o.w || 2);
        lay.property("ADBE Transform Group").property("ADBE Position").setValue([0, 0]);
        lay.property("ADBE Transform Group").property("ADBE Anchor Point").setValue([0, 0]);
        return lay;
    };

    /** Trim Paths on a shape layer, animated from 0 to 100 between t0 and t1. */
    K.drawOn = function (shapeLayer, t0, t1) {
        var trim;
        try {
            trim = shapeLayer.property("ADBE Root Vectors Group")
                             .addProperty("ADBE Vector Filter - Trim");
        } catch (e) { warn("Trim Paths unavailable on " + shapeLayer.name); return null; }
        var end = K.fxp(trim, "ADBE Vector Trim End", 2);
        if (!end) { return trim; }
        end.setValueAtTime(t0, 0);
        end.setValueAtTime(t1, 100);
        K.ease(end, 1, 0, 75);
        K.ease(end, 2, 75, 0);
        return trim;
    };

    /**
     * Text layer. o: {size,font,color,x,y,tracking,leading,justify,name,boxW}
     * justify: "left" | "center" | "right"
     */
    K.text = function (comp, str, o) {
        o = o || {};
        var lay = comp.layers.addText(String(str));
        lay.name = o.name || String(str).substr(0, 24);
        var src = lay.property("ADBE Text Properties").property("ADBE Text Document");
        var td = src.value;
        td.text = String(str);
        if (o.font) { td.font = o.font; }
        td.fontSize = o.size || 48;
        td.fillColor = o.color || [1, 1, 1];
        td.applyFill = true;
        td.applyStroke = false;
        if (o.tracking !== undefined) { td.tracking = o.tracking; }
        if (o.leading !== undefined) { td.leading = o.leading; td.autoLeading = false; }
        td.justification = (o.justify === "left")  ? ParagraphJustification.LEFT_JUSTIFY
                        : (o.justify === "right") ? ParagraphJustification.RIGHT_JUSTIFY
                        : ParagraphJustification.CENTER_JUSTIFY;
        src.setValue(td);
        lay.property("ADBE Transform Group").property("ADBE Position")
           .setValue([o.x !== undefined ? o.x : comp.width / 2,
                      o.y !== undefined ? o.y : comp.height / 2]);
        return lay;
    };

    // ---------------------------------------------------------------- easing
    /**
     * Ease a keyframe. inInf/outInf are influence percentages (0..100).
     * Handles per-dimension ease arrays automatically.
     */
    K.ease = function (prop, idx, inInf, outInf) {
        var n = 1, i, eIn = [], eOut = [];
        try {
            if (prop.propertyValueType !== PropertyValueType.TwoD_SPATIAL &&
                prop.propertyValueType !== PropertyValueType.ThreeD_SPATIAL &&
                (prop.value instanceof Array)) {
                n = prop.value.length;
            }
            for (i = 0; i < n; i++) {
                eIn.push(new KeyframeEase(0, Math.max(0.1, inInf)));
                eOut.push(new KeyframeEase(0, Math.max(0.1, outInf)));
            }
            prop.setInterpolationTypeAtKey(idx, KeyframeInterpolationType.BEZIER,
                                                KeyframeInterpolationType.BEZIER);
            prop.setTemporalEaseAtKey(idx, eIn, eOut);
        } catch (e) { warn("ease failed on " + prop.name + ": " + e); }
    };

    /** Standard "settle" ease pair on a two-keyframe move. */
    K.settle = function (prop) {
        K.ease(prop, 1, 0, 20);
        K.ease(prop, 2, 85, 0);
    };

    // ---------------------------------------------------------------- motion
    K.opacity = function (layer) {
        return layer.property("ADBE Transform Group").property("ADBE Opacity");
    };
    K.position = function (layer) {
        return layer.property("ADBE Transform Group").property("ADBE Position");
    };
    K.scale = function (layer) {
        return layer.property("ADBE Transform Group").property("ADBE Scale");
    };

    K.fadeIn = function (layer, t, dur) {
        var op = K.opacity(layer);
        dur = dur || 0.4;
        op.setValueAtTime(t, 0);
        op.setValueAtTime(t + dur, 100);
        K.ease(op, op.numKeys - 1, 0, 60);
        K.ease(op, op.numKeys, 60, 0);
        return layer;
    };

    K.fadeOut = function (layer, t, dur) {
        var op = K.opacity(layer);
        dur = dur || 0.4;
        op.setValueAtTime(t, 100);
        op.setValueAtTime(t + dur, 0);
        return layer;
    };

    /** Rise up into place with a fade. dist is pixels travelled. */
    K.riseIn = function (layer, t, dist, dur) {
        dur = dur || 0.7;
        dist = (dist === undefined) ? 40 : dist;
        var pos = K.position(layer), p = pos.value;
        pos.setValueAtTime(t, [p[0], p[1] + dist]);
        pos.setValueAtTime(t + dur, [p[0], p[1]]);
        K.settle(pos);
        K.fadeIn(layer, t, dur * 0.6);
        return layer;
    };

    /** Scale up into place from `from` percent. */
    K.popIn = function (layer, t, from, dur) {
        dur = dur || 0.6;
        from = from || 80;
        var sc = K.scale(layer), s = sc.value;
        sc.setValueAtTime(t, [s[0] * from / 100, s[1] * from / 100]);
        sc.setValueAtTime(t + dur, [s[0], s[1]]);
        K.settle(sc);
        K.fadeIn(layer, t, dur * 0.5);
        return layer;
    };

    /** Slide in horizontally from `dist` px (negative = from the left). */
    K.slideIn = function (layer, t, dist, dur) {
        dur = dur || 0.7;
        var pos = K.position(layer), p = pos.value;
        pos.setValueAtTime(t, [p[0] + dist, p[1]]);
        pos.setValueAtTime(t + dur, [p[0], p[1]]);
        K.settle(pos);
        K.fadeIn(layer, t, dur * 0.6);
        return layer;
    };

    /** Apply an animator to a list of layers, offsetting each by `step` seconds. */
    K.stagger = function (layers, t0, step, fn) {
        for (var i = 0; i < layers.length; i++) { fn(layers[i], t0 + i * step, i); }
        return layers;
    };

    // ---------------------------------------------------------------- extras
    /** Soft glow. Fails quietly if the effect is missing. */
    K.glow = function (layer, radius, intensity) {
        var g = K.fx(layer, "ADBE Glo2", "Glow");
        if (!g) { return null; }
        K.setFxp(g, "ADBE Glo2-0002", 2, radius || 40);   // glow radius
        K.setFxp(g, "ADBE Glo2-0003", 3, intensity || 1); // glow intensity
        return g;
    };

    /** Gaussian blur, optionally animated from `from` to 0 across dur. */
    K.blurIn = function (layer, t, from, dur) {
        var b = K.fx(layer, "ADBE Gaussian Blur 2", "Blur");
        if (!b) { return null; }
        var p = K.fxp(b, "ADBE Gaussian Blur 2-0001", 1);
        if (!p) { return b; }
        p.setValueAtTime(t, from);
        p.setValueAtTime(t + (dur || 0.6), 0);
        K.ease(p, p.numKeys, 70, 0);
        return b;
    };

    /**
     * Number that counts up. Returns the text layer.
     * o: {from,to,t0,t1,prefix,suffix,commas,...text options}
     */
    K.counter = function (comp, o) {
        var lay = K.text(comp, String(o.to), o);
        var ctrl = K.fx(lay, "ADBE Slider Control", "Count");
        if (!ctrl) { return lay; }
        var sl = K.fxp(ctrl, "ADBE Slider Control-0001", 1);
        sl.setValueAtTime(o.t0, o.from || 0);
        sl.setValueAtTime(o.t1, o.to);
        K.ease(sl, 1, 0, 30);
        K.ease(sl, 2, 90, 0);

        var expr = 'var v = Math.round(effect("Count")("Slider").value);\n';
        if (o.commas) {
            expr += 'var s = v.toString(); var out = ""; var c = 0;\n' +
                    'for (var i = s.length - 1; i >= 0; i--) {\n' +
                    '  out = s.charAt(i) + out; c++;\n' +
                    '  if (c % 3 === 0 && i > 0) { out = "," + out; }\n' +
                    '}\n';
        } else {
            expr += 'var out = v.toString();\n';
        }
        expr += '"' + (o.prefix || "") + '" + out + "' + (o.suffix || "") + '";';
        try {
            lay.property("ADBE Text Properties").property("ADBE Text Document").expression = expr;
        } catch (e) { warn("counter expression failed: " + e); }
        return lay;
    };

    /** Place a comp into another comp as a layer at startTime. */
    K.place = function (parentComp, childComp, startTime, name) {
        var l = parentComp.layers.add(childComp);
        l.startTime = startTime;
        if (name) { l.name = name; }
        return l;
    };

    /** Null-parent a set of layers so they can be moved as a group. */
    K.groupUnder = function (comp, layers, name, x, y) {
        var n = comp.layers.addNull(comp.duration);
        n.name = name || "GROUP";
        n.property("ADBE Transform Group").property("ADBE Position")
         .setValue([x !== undefined ? x : comp.width / 2, y !== undefined ? y : comp.height / 2]);
        n.enabled = false;
        for (var i = 0; i < layers.length; i++) { layers[i].parent = n; }
        return n;
    };

    return K;
})();
