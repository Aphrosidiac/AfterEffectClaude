/**
 * probe-fonts.jsx - read-only: what font families can After Effects actually see?
 * Writes exports/data/font-probe.json. Safe with any project open.
 */
(function () {
    var OUT = "C:/Dev/AfterEffectClaude/exports/data/font-probe.json";
    var lines = [], total = 0, matches = [], i, f, fam;

    try {
        var all = app.fonts.allFonts;
        total = all.length;
        for (i = 0; i < all.length; i++) {
            f = all[i];
            try {
                fam = String(f.familyName);
                if (/fig|urb|inter|outfit/i.test(fam)) {
                    matches.push(fam + " | " + f.styleName + " | " + f.postScriptName +
                                 " | variable=" + (f.hasDesignAxes ? "yes" : "no"));
                }
            } catch (e) {}
        }
    } catch (e) {
        matches.push("app.fonts failed: " + e.toString());
    }

    var json = '{\n  "aeVersion": "' + app.version + '",\n' +
               '  "totalFonts": ' + total + ',\n' +
               '  "matches": [\n';
    for (i = 0; i < matches.length; i++) {
        json += '    "' + matches[i].replace(/"/g, "'") + '"' + (i < matches.length - 1 ? "," : "") + "\n";
    }
    json += "  ]\n}\n";

    var file = new File(OUT);
    file.parent.create();
    file.encoding = "UTF-8";
    if (file.open("w")) { file.write(json); file.close(); }
})();
