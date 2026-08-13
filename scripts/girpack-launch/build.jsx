/**
 * build.jsx - builds the GIRPACK launch film (60s, 1920x1080, 30fps) from scratch.
 *
 * LEWIX brand system, stylized product UI built as native shape/text layers.
 * No client data, no screen recordings.
 *
 * SAFETY: refuses to run unless the open project is empty. Open a new project
 * (Ctrl+Alt+N) first. Everything happens inside one undo group.
 *
 * Run:  scripts\run-jsx.ps1 -Script scripts\girpack-launch\build.jsx
 */
#include "_kit.jsx"

(function () {

    // =================================================================== config
    var CFG = {
        name:   "GIRPACK_LAUNCH",
        w: 1920, h: 1080, fps: 30, dur: 60,

        saveTo: "C:/Dev/AfterEffectClaude/projects/girpack-launch.aep",
        logTo:  "C:/Dev/AfterEffectClaude/exports/data/girpack-launch-build.json",
        brand:  "C:/Dev/LewixSocials/01-Logos/",

        // 120 bpm: 0.5s per beat, 2s per bar. Every scene boundary lands on a bar.
        bpm: 120,

        col: {
            night:  K.hex("#09090c"),
            deep:   K.hex("#0d0d16"),
            panel:  K.hex("#14141f"),
            line:   K.hex("#262633"),
            blue:   K.hex("#6880f2"),
            purple: K.hex("#8151df"),
            cyan:   K.hex("#67e1f9"),
            white:  [1, 1, 1],
            muted:  K.hex("#8a8aa0"),
            alert:  K.hex("#e0574f")
        },

        // real numbers from the running system; edit freely
        stats: [
            { to: 878, label: "PRODUCTS PRICED",  commas: false },
            { to: 27,  label: "SUPPLIERS TRACKED", commas: false },
            { to: 6,   label: "PIPELINE STAGES",  commas: false }
        ]
    };

    var C = CFG.col;

    // Create the marker file .tmp/ap-silent to suppress modal dialogs (unattended runs).
    // An env var does NOT work here: AfterFX.com hands the script to the already-running
    // AE process, which has the environment it was launched with, not ours.
    // The JSON report is written either way.
    var SILENT = false;
    try { SILENT = new File("C:/Dev/AfterEffectClaude/.tmp/ap-silent").exists; } catch (e) {}
    function say(msg) {
        if (!SILENT) { alert(msg); }
        try { $.writeln(msg); } catch (e2) {}
    }

    // =================================================================== guard
    // Re-running is safe when the open project is the one THIS script generated:
    // it is fully reproducible, so it gets closed without saving and rebuilt.
    // Any other project is left strictly alone.
    var openFile = app.project.file ? app.project.file.fsName.replace(/\\/g, "/") : null;
    var ownFile  = CFG.saveTo.replace(/\\/g, "/");
    var isOwn    = openFile && (openFile.toLowerCase() === ownFile.toLowerCase());

    if (isOwn) {
        app.project.close(CloseOptions.DO_NOT_SAVE_CHANGES);
    } else if (app.project.numItems > 0 || app.project.file !== null) {
        say("build.jsx needs an empty project.\n\n" +
              "File > New > New Project (Ctrl+Alt+N), then run this again.\n" +
              "Nothing has been changed.");
        return;
    }

    app.beginUndoGroup("AP: build GIRPACK launch film");

    var report = { scenes: [], warnings: [], fonts: {}, assets: [] };

    try {
        app.project.bitsPerChannel = 16;
        try { app.project.expressionEngine = "javascript-1.0"; } catch (e) {}

        // ============================================================== fonts
        var F = {
            head:   K.font("Figtree",  ["Bold", "SemiBold", "ExtraBold", "Regular"]),
            headMd: K.font("Figtree",  ["Medium", "Regular"]),
            body:   K.font("Urbanist", ["Regular", "Medium"]),
            bodyMd: K.font("Urbanist", ["Medium", "SemiBold", "Regular"])
        };
        report.fonts = F;

        // ============================================================= folders
        var fScenes = K.folder("01_SCENES");
        var fAssets = K.folder("02_ASSETS");

        // ============================================================== assets
        function importImg(rel) {
            var f = new File(CFG.brand + rel);
            if (!f.exists) { K.warn("Asset missing: " + f.fsName); return null; }
            try {
                var it = app.project.importFile(new ImportOptions(f));
                it.parentFolder = fAssets;
                report.assets.push(rel);
                return it;
            } catch (e) { K.warn("Import failed: " + rel + " (" + e + ")"); return null; }
        }
        var A = {
            icon:     importImg("Logomark-Icon/LEWIX-Icon-FullColor.png"),
            logoDark: importImg("Primary-Logo/LEWIX-Logo-FullColor-OnDarkBG.png")
        };

        // =============================================================== utils
        function scene(name, dur) {
            var c = K.comp(name, CFG.w, CFG.h, dur, CFG.fps, fScenes);
            K.gradientBg(c, C.night, C.deep, "d", "BG");
            return c;
        }

        /** Faint diagonal supergraphic bars, drifting slowly across the frame. */
        function supergraphic(comp, opacity) {
            var bars = [], i, l;
            for (i = 0; i < 14; i++) {
                l = K.rect(comp, {
                    w: 26, h: 2400, r: 13, fill: C.blue,
                    x: -400 + i * 190, y: CFG.h / 2, name: "sg" + i
                });
                l.property("ADBE Transform Group").property("ADBE Rotate Z").setValue(24);
                K.opacity(l).setValue(opacity || 5);
                bars.push(l);
            }
            var n = K.groupUnder(comp, bars, "SUPERGRAPHIC", CFG.w / 2, CFG.h / 2);
            var p = K.position(n);
            p.setValueAtTime(0, [CFG.w / 2 - 60, CFG.h / 2]);
            p.setValueAtTime(comp.duration, [CFG.w / 2 + 60, CFG.h / 2]);
            return n;
        }

        /** Card panel with a hairline border. */
        function card(comp, o) {
            var c = K.rect(comp, {
                w: o.w, h: o.h, r: o.r || 18, fill: C.panel,
                stroke: C.line, strokeW: 2, x: o.x, y: o.y, name: o.name || "card"
            });
            return c;
        }

        function label(comp, str, o) {
            o = o || {};
            return K.text(comp, str, {
                font: o.font || F.bodyMd, size: o.size || 22, color: o.color || C.muted,
                x: o.x, y: o.y, justify: o.justify || "left",
                tracking: o.tracking !== undefined ? o.tracking : 120, name: o.name
            });
        }

        // ======================================================== SCENE 01 (6s)
        function s01_open() {
            var c = scene("S01_COLD_OPEN", 6);
            supergraphic(c, 6);

            var iconLayer = null;
            if (A.icon) {
                iconLayer = c.layers.add(A.icon, c.duration);
                iconLayer.name = "LEWIX ICON";
                K.position(iconLayer).setValue([CFG.w / 2, 430]);
                K.fitH(iconLayer, 300);   // source art is huge; scale from real pixel size
                K.popIn(iconLayer, 0.6, 60, 1.2);
                K.blurIn(iconLayer, 0.6, 30, 1.0);
                // keep the glow low: anything stronger blooms the brand gradient to flat white
                K.glow(iconLayer, 40, 0.25);
            }

            var pres = K.text(c, "LEWIX PRESENTS", {
                font: F.bodyMd, size: 26, color: C.muted, x: CFG.w / 2, y: 660, tracking: 480
            });
            K.riseIn(pres, 1.8, 20, 1.0);

            var rule = K.rect(c, { w: 2, h: 0, r: 0, fill: C.blue, x: CFG.w / 2, y: 730, name: "rule" });
            var rs = K.scale(rule);
            rs.setValueAtTime(2.4, [100, 0]);
            rs.setValueAtTime(3.4, [12000, 100]);
            K.settle(rs);
            K.opacity(rule).setValue(60);

            K.fadeOut(c.layer(1), 5.4, 0.6);
            return c;
        }

        // ======================================================== SCENE 02 (8s)
        function s02_problem() {
            var c = scene("S02_PROBLEM", 8);

            var t1 = K.text(c, "Pricing lived in spreadsheets.", {
                font: F.head, size: 78, color: C.white, x: CFG.w / 2, y: 300
            });
            K.riseIn(t1, 0.3, 46, 0.9);

            // spreadsheet grid
            var cells = [], r, col, x, y, cw = 250, ch = 54, cols = 6, rows = 5;
            var gx = CFG.w / 2 - ((cols - 1) * (cw + 10)) / 2;
            var gy = 560;
            for (r = 0; r < rows; r++) {
                for (col = 0; col < cols; col++) {
                    x = gx + col * (cw + 10);
                    y = gy + r * (ch + 10);
                    var isBad = (r === 2 && col === 3);
                    cells.push(K.rect(c, {
                        w: cw, h: ch, r: 6,
                        fill: isBad ? C.alert : C.panel,
                        stroke: C.line, strokeW: 1.5,
                        x: x, y: y, name: (isBad ? "cell-bad" : "cell-" + r + "-" + col)
                    }));
                }
            }
            K.stagger(cells, 1.0, 0.022, function (lay, t) { K.popIn(lay, t, 86, 0.5); });

            // the bad cell pulses, then everything drains
            var bad = cells[2 * cols + 3];
            var bo = K.opacity(bad);
            bo.setValueAtTime(2.6, 100);
            bo.setValueAtTime(2.9, 35);
            bo.setValueAtTime(3.2, 100);
            bo.setValueAtTime(3.5, 35);
            bo.setValueAtTime(3.8, 100);

            var t2 = K.text(c, "One wrong cell moved every price.", {
                font: F.body, size: 40, color: C.muted, x: CFG.w / 2, y: 900
            });
            K.riseIn(t2, 4.0, 26, 0.8);

            for (var i = 0; i < cells.length; i++) { K.fadeOut(cells[i], 6.6, 0.5); }
            K.fadeOut(t1, 6.8, 0.6);
            K.fadeOut(t2, 6.8, 0.6);
            return c;
        }

        // ======================================================== SCENE 03 (6s)
        function s03_reveal() {
            var c = scene("S03_REVEAL", 6);
            supergraphic(c, 5);

            var word = K.text(c, "GIRPACK", {
                font: F.head, size: 190, color: C.white, x: CFG.w / 2, y: 520, tracking: 40
            });
            K.popIn(word, 0.4, 88, 1.0);
            K.blurIn(word, 0.4, 24, 0.9);

            // gradient underline built from a solid + ramp, revealed by scale
            var bar = K.solid(c, C.blue, "gradient bar", c.duration);
            var ramp = K.fx(bar, "ADBE Ramp", "Gradient");
            K.setFxp(ramp, "ADBE Ramp-0001", 1, [CFG.w / 2 - 480, 0]);
            K.setFxp(ramp, "ADBE Ramp-0002", 2, C.purple);
            K.setFxp(ramp, "ADBE Ramp-0003", 3, [CFG.w / 2 + 480, 0]);
            K.setFxp(ramp, "ADBE Ramp-0004", 4, C.cyan);
            bar.property("ADBE Transform Group").property("ADBE Anchor Point")
               .setValue([CFG.w / 2, CFG.h / 2]);
            K.position(bar).setValue([CFG.w / 2, 610]);
            var bs = K.scale(bar);
            bs.setValueAtTime(1.0, [0, 0.9]);
            bs.setValueAtTime(1.9, [52, 0.9]);
            K.settle(bs);

            var sub = K.text(c, "Pricing, costing, and the full order lifecycle. One system.", {
                font: F.body, size: 40, color: C.muted, x: CFG.w / 2, y: 720
            });
            K.riseIn(sub, 1.6, 24, 0.9);

            K.fadeOut(word, 5.3, 0.5);
            K.fadeOut(sub, 5.3, 0.5);
            K.fadeOut(bar, 5.3, 0.5);
            return c;
        }

        // ======================================================= SCENE 04 (12s)
        function s04_pricing() {
            var c = scene("S04_PRICING", 12);

            var head = K.text(c, "Formula driven pricing.", {
                font: F.head, size: 66, color: C.white, x: 200, y: 180, justify: "left"
            });
            K.riseIn(head, 0.2, 30, 0.8);

            var panel = card(c, { w: 1120, h: 460, x: 760, y: 560, name: "costing panel" });
            K.popIn(panel, 0.6, 94, 0.7);

            label(c, "COSTING", { x: 260, y: 390, name: "costing label" });

            // table rows: product / supplier / cost / calc price
            var rows = [
                ["Stretch Film 500mm", "Supplier A", "RM 128.00", "RM 151.04"],
                ["Carton Tape 48mm",   "Supplier C", "RM  42.50", "RM  50.15"],
                ["PE Bag 12x18",       "Supplier A", "RM  88.00", "RM 103.84"],
                ["Shrink Film 450mm",  "Supplier B", "RM 176.00", "RM 207.68"]
            ];
            var rowLayers = [], i, y0 = 450;
            for (i = 0; i < rows.length; i++) {
                var y = y0 + i * 84;
                var strip = K.rect(c, {
                    w: 1040, h: 66, r: 10, fill: C.deep, stroke: C.line, strokeW: 1.5,
                    x: 760, y: y, name: "row" + i
                });
                var nm = K.text(c, rows[i][0], { font: F.bodyMd, size: 28, color: C.white,
                                                 x: 268, y: y + 9, justify: "left" });
                var sp = K.text(c, rows[i][1], { font: F.body, size: 24, color: C.muted,
                                                 x: 700, y: y + 9, justify: "left" });
                var ct = K.text(c, rows[i][2], { font: F.body, size: 26, color: C.muted,
                                                 x: 930, y: y + 9, justify: "left" });
                var cp = K.text(c, rows[i][3], { font: F.bodyMd, size: 28, color: C.cyan,
                                                 x: 1120, y: y + 9, justify: "left" });
                rowLayers.push([strip, nm, sp, ct, cp]);
            }
            for (i = 0; i < rowLayers.length; i++) {
                var t = 1.1 + i * 0.18;
                for (var j = 0; j < rowLayers[i].length; j++) {
                    K.slideIn(rowLayers[i][j], t, -60, 0.6);
                }
            }

            // formula chip
            var chip = K.rect(c, { w: 380, h: 62, r: 31, fill: C.panel, stroke: C.blue,
                                   strokeW: 2, x: 1560, y: 300, name: "formula chip" });
            var chipTxt = K.text(c, "cost x 1.18", { font: F.bodyMd, size: 30, color: C.white,
                                                     x: 1560, y: 312 });
            K.popIn(chip, 2.6, 70, 0.6);
            K.popIn(chipTxt, 2.7, 70, 0.6);
            K.glow(chip, 30, 0.5);

            // supplier comparison, in the right-hand column so it never overlaps the panel
            var colX = 1400, colTop = 470;
            label(c, "SUPPLIER COST", { x: colX, y: colTop - 60, name: "cmp label" });
            var widths = [300, 220, 380], names = ["Supplier A", "Supplier B", "Supplier C"];
            var best = 1;
            for (i = 0; i < 3; i++) {
                var by = colTop + i * 104;
                var isBest = (i === best);
                var nlab = K.text(c, names[i], { font: F.body, size: 24,
                                                 color: isBest ? C.cyan : C.muted,
                                                 x: colX, y: by, justify: "left" });
                K.fadeIn(nlab, 4.4 + i * 0.16, 0.4);

                var bar = K.rect(c, {
                    w: widths[i], h: 26, r: 13,
                    fill: isBest ? C.cyan : C.line,
                    x: colX + widths[i] / 2, y: by + 32, name: "cmp" + i
                });
                // anchor on the left edge so the grow reads as a bar chart, not a zoom
                bar.property("ADBE Transform Group").property("ADBE Anchor Point")
                   .setValue([-widths[i] / 2, 0]);
                K.position(bar).setValue([colX, by + 32]);
                var bsc = K.scale(bar);
                bsc.setValueAtTime(4.4 + i * 0.16, [0, 100]);
                bsc.setValueAtTime(5.2 + i * 0.16, [100, 100]);
                K.settle(bsc);

                if (isBest) {
                    var bestLab = K.text(c, "BEST", { font: F.bodyMd, size: 20, color: C.cyan,
                                                      x: colX + widths[i] + 24, y: by + 40,
                                                      justify: "left", tracking: 200 });
                    K.fadeIn(bestLab, 5.6, 0.4);
                }
            }

            var foot = K.text(c, "Every cost, every supplier, every change, logged.", {
                font: F.body, size: 36, color: C.muted, x: CFG.w / 2, y: 1010
            });
            K.riseIn(foot, 7.4, 22, 0.8);

            for (i = 1; i <= c.numLayers; i++) {
                if (c.layer(i).name !== "BG") { K.fadeOut(c.layer(i), 10.9, 0.5); }
            }
            return c;
        }

        // ======================================================= SCENE 05 (12s)
        function s05_pipeline() {
            var c = scene("S05_PIPELINE", 12);

            var head = K.text(c, "Quotation to delivery. One pipeline.", {
                font: F.head, size: 66, color: C.white, x: CFG.w / 2, y: 220
            });
            K.riseIn(head, 0.2, 30, 0.8);

            var stages = ["QUOTATION", "PRICING", "PURCHASING", "PACKING", "DELIVERY", "COMPLETE"];
            var n = stages.length, i;
            var pw = 250, gap = 40;
            var total = n * pw + (n - 1) * gap;
            var x0 = (CFG.w - total) / 2 + pw / 2;
            var py = 560;

            // connector line, drawn on
            var conn = K.line(c, {
                x1: x0 - pw / 2 + 20, y1: py, x2: x0 + (n - 1) * (pw + gap) + pw / 2 - 20, y2: py,
                color: C.line, w: 4, name: "connector"
            });
            K.drawOn(conn, 0.8, 2.0);

            var pills = [], dots = [];
            for (i = 0; i < n; i++) {
                var px = x0 + i * (pw + gap);
                var pill = K.rect(c, {
                    w: pw, h: 96, r: 16, fill: C.panel, stroke: C.line, strokeW: 2,
                    x: px, y: py, name: "stage-" + stages[i]
                });
                var ptx = K.text(c, stages[i], {
                    font: F.bodyMd, size: 22, color: C.muted, x: px, y: py + 8, tracking: 120
                });
                var dot = K.circle(c, { d: 18, fill: C.line, x: px, y: py + 78, name: "dot" + i });
                pills.push(pill); dots.push(ptx); dots.push(dot);
                K.popIn(pill, 1.0 + i * 0.12, 80, 0.5);
                K.popIn(ptx, 1.1 + i * 0.12, 80, 0.5);
                K.popIn(dot, 1.15 + i * 0.12, 60, 0.4);
            }

            // travelling marker that lights each stage as it passes
            var marker = K.circle(c, { d: 30, fill: C.cyan, x: x0, y: py + 78, name: "marker" });
            K.glow(marker, 40, 1);
            var mp = K.position(marker);
            var tStart = 2.6, tStep = 1.05;
            for (i = 0; i < n; i++) {
                mp.setValueAtTime(tStart + i * tStep, [x0 + i * (pw + gap), py + 78]);
            }
            for (i = 1; i <= mp.numKeys; i++) { K.ease(mp, i, 70, 70); }
            K.fadeIn(marker, 2.4, 0.3);

            // each pill turns "done" as the marker arrives
            for (i = 0; i < n; i++) {
                var arrive = tStart + i * tStep;
                var pillFill = pills[i].property("ADBE Root Vectors Group")
                                       .property("shape").property("ADBE Vectors Group")
                                       .property("ADBE Vector Graphic - Fill")
                                       .property("ADBE Vector Fill Color");
                pillFill.setValueAtTime(arrive - 0.12, C.panel);
                pillFill.setValueAtTime(arrive + 0.18, K.mix(C.panel, C.blue, 0.35));
                var st = pills[i].property("ADBE Root Vectors Group")
                                 .property("shape").property("ADBE Vectors Group")
                                 .property("ADBE Vector Graphic - Stroke")
                                 .property("ADBE Vector Stroke Color");
                st.setValueAtTime(arrive - 0.12, C.line);
                st.setValueAtTime(arrive + 0.18, C.blue);
            }

            var foot = K.text(c, "Every transition is atomic, and written to the audit log.", {
                font: F.body, size: 36, color: C.muted, x: CFG.w / 2, y: 840
            });
            K.riseIn(foot, 8.6, 22, 0.8);

            for (i = 1; i <= c.numLayers; i++) {
                if (c.layer(i).name !== "BG") { K.fadeOut(c.layer(i), 10.9, 0.5); }
            }
            return c;
        }

        // ======================================================== SCENE 06 (8s)
        function s06_control() {
            var c = scene("S06_CONTROL", 8);

            var head = K.text(c, "Reads the accounting system.", {
                font: F.head, size: 64, color: C.white, x: CFG.w / 2, y: 250
            });
            var head2 = K.text(c, "Never writes to it.", {
                font: F.head, size: 64, color: C.cyan, x: CFG.w / 2, y: 340
            });
            K.riseIn(head, 0.2, 34, 0.8);
            K.riseIn(head2, 0.6, 34, 0.8);

            // one-way arrow between two cards
            var left = card(c, { w: 420, h: 180, x: 560, y: 620, name: "sql card" });
            var right = card(c, { w: 420, h: 180, x: 1360, y: 620, name: "girpack card" });
            K.popIn(left, 1.2, 88, 0.6);
            K.popIn(right, 1.3, 88, 0.6);
            var lt = K.text(c, "ACCOUNTING", { font: F.bodyMd, size: 26, color: C.muted,
                                               x: 560, y: 632, tracking: 160 });
            var rt = K.text(c, "GIRPACK", { font: F.bodyMd, size: 26, color: C.white,
                                            x: 1360, y: 632, tracking: 160 });
            K.fadeIn(lt, 1.4, 0.4); K.fadeIn(rt, 1.5, 0.4);

            var arrow = K.line(c, { x1: 790, y1: 620, x2: 1140, y2: 620, color: C.cyan, w: 5,
                                    name: "read arrow" });
            K.drawOn(arrow, 1.8, 2.6);
            var arrowLab = K.text(c, "READ ONLY", { font: F.bodyMd, size: 22, color: C.cyan,
                                                    x: 965, y: 580, tracking: 200 });
            K.fadeIn(arrowLab, 2.4, 0.4);

            // roles
            var roles = ["MANAGER", "SITE ADMIN", "ADMIN", "SALES"];
            var chips = [], i, cw = 260, gap = 24;
            var total = roles.length * cw + (roles.length - 1) * gap;
            var x0 = (CFG.w - total) / 2 + cw / 2;
            for (i = 0; i < roles.length; i++) {
                var cx = x0 + i * (cw + gap);
                var chip = K.rect(c, { w: cw, h: 68, r: 34, fill: C.panel, stroke: C.line,
                                       strokeW: 2, x: cx, y: 840, name: "role-" + roles[i] });
                var ct = K.text(c, roles[i], { font: F.bodyMd, size: 22, color: C.muted,
                                               x: cx, y: 850, tracking: 140 });
                chips.push(chip); chips.push(ct);
                K.popIn(chip, 3.4 + i * 0.14, 80, 0.5);
                K.popIn(ct, 3.5 + i * 0.14, 80, 0.5);
            }

            var foot = K.text(c, "Four roles. Page level permissions. Optional two factor.", {
                font: F.body, size: 34, color: C.muted, x: CFG.w / 2, y: 950
            });
            K.riseIn(foot, 4.6, 22, 0.8);

            for (i = 1; i <= c.numLayers; i++) {
                if (c.layer(i).name !== "BG") { K.fadeOut(c.layer(i), 7.0, 0.5); }
            }
            return c;
        }

        // ======================================================== SCENE 07 (8s)
        function s07_close() {
            var c = scene("S07_CLOSE", 8);
            supergraphic(c, 5);

            // stat counters
            var i, n = CFG.stats.length, colW = 480;
            var x0 = CFG.w / 2 - ((n - 1) * colW) / 2;
            for (i = 0; i < n; i++) {
                var sx = x0 + i * colW;
                K.counter(c, {
                    to: CFG.stats[i].to, from: 0, t0: 0.3 + i * 0.12, t1: 2.1 + i * 0.12,
                    commas: CFG.stats[i].commas,
                    font: F.head, size: 96, color: C.white, x: sx, y: 330,
                    name: "stat" + i
                });
                var sl = K.text(c, CFG.stats[i].label, {
                    font: F.bodyMd, size: 22, color: C.muted, x: sx, y: 400, tracking: 200
                });
                K.fadeIn(sl, 0.6 + i * 0.12, 0.5);
            }

            // logo lockup
            var logo = null;
            if (A.logoDark) {
                logo = c.layers.add(A.logoDark, c.duration);
                logo.name = "LEWIX LOCKUP";
                K.position(logo).setValue([CFG.w / 2, 640]);
                K.fitW(logo, 560);   // source art is huge; scale from real pixel size
                K.popIn(logo, 3.0, 88, 0.9);
                K.blurIn(logo, 3.0, 20, 0.8);
            } else {
                var wordmark = K.text(c, "LEWIX", {
                    font: F.head, size: 130, color: C.white, x: CFG.w / 2, y: 660, tracking: 120
                });
                K.popIn(wordmark, 3.0, 88, 0.9);
            }

            var tag = K.text(c, "Transcending the Industry", {
                font: F.body, size: 42, color: C.muted, x: CFG.w / 2, y: 800
            });
            K.riseIn(tag, 3.8, 24, 0.9);

            var url = K.text(c, "lewix.ai", {
                font: F.bodyMd, size: 34, color: C.cyan, x: CFG.w / 2, y: 900, tracking: 300
            });
            K.riseIn(url, 4.4, 20, 0.8);

            for (i = 1; i <= c.numLayers; i++) {
                if (c.layer(i).name !== "BG" && c.layer(i).name !== "SUPERGRAPHIC") {
                    K.fadeOut(c.layer(i), 7.1, 0.7);
                }
            }
            return c;
        }

        // ============================================================== master
        var SCENES = [
            { fn: s01_open,     start: 0  },
            { fn: s02_problem,  start: 6  },
            { fn: s03_reveal,   start: 14 },
            { fn: s04_pricing,  start: 20 },
            { fn: s05_pipeline, start: 32 },
            { fn: s06_control,  start: 44 },
            { fn: s07_close,    start: 52 }
        ];

        var master = K.comp(CFG.name, CFG.w, CFG.h, CFG.dur, CFG.fps);
        K.solid(master, C.night, "MASTER BG", CFG.dur);

        for (var si = SCENES.length - 1; si >= 0; si--) {
            var built = null, err = null;
            try {
                built = SCENES[si].fn();
            } catch (e) {
                err = "line " + e.line + ": " + e.toString();
                K.warn("SCENE FAILED (" + si + "): " + err);
            }
            if (built) {
                var l = K.place(master, built, SCENES[si].start);
                l.inPoint = SCENES[si].start;
                l.outPoint = SCENES[si].start + built.duration;
                report.scenes.push({ name: built.name, start: SCENES[si].start,
                                     dur: built.duration, ok: true });
            } else {
                report.scenes.push({ index: si, ok: false, error: err });
            }
        }

        master.openInViewer();

        // ================================================================ save
        var out = new File(CFG.saveTo);
        out.parent.create();
        app.project.save(out);

        // =============================================================== report
        report.warnings = K.warnings;
        report.savedTo = out.fsName;
        report.builtAt = new Date().toString();
        try {
            var lf = new File(CFG.logTo);
            lf.parent.create();
            lf.encoding = "UTF-8";
            if (lf.open("w")) {
                lf.write("{\n  \"savedTo\": \"" + out.fsName.replace(/\\/g, "\\\\") + "\",\n" +
                         "  \"scenes\": " + report.scenes.length + ",\n" +
                         "  \"fonts\": \"" + [F.head, F.headMd, F.body, F.bodyMd].join(", ") + "\",\n" +
                         "  \"assets\": \"" + report.assets.join(", ") + "\",\n" +
                         "  \"warnings\": [\n    \"" + K.warnings.join("\",\n    \"") + "\"\n  ]\n}\n");
                lf.close();
            }
        } catch (e) {}

        var msg = "GIRPACK launch film built.\n\n" +
                  "Master comp: " + CFG.name + "  (" + CFG.dur + "s, " + CFG.fps + "fps)\n" +
                  "Saved: " + out.fsName + "\n\n" +
                  "Fonts resolved:\n" +
                  "  head: " + (F.head || "SUBSTITUTED") + "\n" +
                  "  body: " + (F.body || "SUBSTITUTED") + "\n\n" +
                  (K.warnings.length ? ("Warnings (" + K.warnings.length + "):\n- " +
                                        K.warnings.join("\n- ")) : "No warnings.");
        say(msg);

    } catch (e) {
        say("build.jsx failed on line " + e.line + ":\n" + e.toString() +
              "\n\nWarnings so far:\n" + K.warnings.join("\n"));
        app.exitCode = 1;
    } finally {
        app.endUndoGroup();
    }
})();
