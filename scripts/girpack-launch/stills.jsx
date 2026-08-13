/**
 * stills.jsx - save one PNG per scene from the master comp, for review without rendering.
 * Uses CompItem.saveFrameToPng, so it is fast and does not touch the render queue.
 * Output: exports/renders/stills/
 */
(function () {
    var OUT = "C:/Dev/AfterEffectClaude/exports/renders/stills/";
    var COMP = "GIRPACK_LAUNCH";
    var TIMES = [
        { t: 3.2,  n: "01-cold-open" },
        { t: 10.0, n: "02-problem" },
        { t: 17.0, n: "03-reveal" },
        { t: 26.0, n: "04-pricing" },
        { t: 38.5, n: "05-pipeline" },
        { t: 48.0, n: "06-control" },
        { t: 56.0, n: "07-close" }
    ];

    var comp = null, i;
    for (i = 1; i <= app.project.numItems; i++) {
        if (app.project.item(i) instanceof CompItem && app.project.item(i).name === COMP) {
            comp = app.project.item(i); break;
        }
    }
    var log = [];
    if (!comp) {
        log.push("Master comp not found: " + COMP);
    } else {
        new Folder(OUT).create();
        for (i = 0; i < TIMES.length; i++) {
            try {
                var f = new File(OUT + TIMES[i].n + ".png");
                comp.saveFrameToPng(TIMES[i].t, f);
                log.push("ok " + TIMES[i].n + " @ " + TIMES[i].t + "s");
            } catch (e) {
                log.push("FAIL " + TIMES[i].n + ": " + e.toString());
            }
        }
    }

    var lf = new File("C:/Dev/AfterEffectClaude/exports/data/stills.log");
    lf.parent.create();
    lf.encoding = "UTF-8";
    if (lf.open("w")) { lf.write(log.join("\n") + "\n"); lf.close(); }
})();
