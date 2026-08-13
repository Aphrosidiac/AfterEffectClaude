/**
 * probe-environment.jsx — read-only environment dump.
 *
 * Writes exports/data/ae-environment.json: version, GPU, prefs, every installed effect
 * (displayName -> matchName), fonts, and the currently open project's shape.
 *
 * SAFE ON A LIVE SESSION: touches nothing in the project. Render-settings / output-module
 * template names can only be read from a render-queue item, so they are captured ONLY when the
 * project is empty (see TEMPLATES below) — otherwise that field explains why it was skipped.
 *
 * Run:  scripts\run-jsx.ps1 -Script scripts\probe-environment.jsx
 */
#include "lib/aejson.jsx"

(function () {
    var OUT = "C:/Dev/AfterEffectClaude/exports/data/ae-environment.json";
    var d = {};

    // --- app -------------------------------------------------------------
    d.probedAt      = new Date().toString();
    d.version       = app.version;
    d.buildName     = app.buildName;
    d.buildNumber   = app.buildNumber;
    d.isRenderEngine = app.isRenderEngine;
    d.language      = app.isoLanguage;
    d.memoryInUseMB = Math.round(app.memoryInUse / 1048576);
    d.gpuAccelTypes = [];
    try {
        for (var g = 0; g < app.availableGPUAccelTypes.length; g++) {
            d.gpuAccelTypes.push(String(app.availableGPUAccelTypes[g]));
        }
    } catch (eg) { d.gpuAccelTypes = ["<unavailable>"]; }

    d.system = {};
    try {
        d.system.osName    = system.osName;
        d.system.osVersion = system.osVersion;
        d.system.machine   = system.machineName;
        d.system.userName  = system.userName;
    } catch (es) {}

    // --- the pref that gates everything ----------------------------------
    d.prefs = {};
    try {
        d.prefs.allowScriptsToWriteFilesAndAccessNetwork =
            app.preferences.getPrefAsLong("Main Pref Section",
                "Pref_SCRIPTING_FILE_NETWORK_SECURITY",
                PREFType.PREF_Type_MACHINE_INDEPENDENT) === 1;
    } catch (ep) { d.prefs.allowScriptsToWriteFilesAndAccessNetwork = "<unreadable>"; }

    // --- paths ------------------------------------------------------------
    d.paths = {
        appFolder:  Folder.appPackage ? Folder.appPackage.fsName : "",
        userData:   Folder.userData.fsName,
        scriptsUser: Folder.userData.fsName + "\\Adobe\\After Effects\\" + app.version + "\\Scripts",
        temp:       Folder.temp.fsName,
        runningScript: File($.fileName).fsName
    };

    // --- effects ----------------------------------------------------------
    d.effectCount = app.effects.length;
    d.effects = [];
    for (var i = 0; i < app.effects.length; i++) {
        d.effects.push({
            name: app.effects[i].displayName,
            matchName: app.effects[i].matchName,
            category: app.effects[i].category
        });
    }

    // --- fonts ------------------------------------------------------------
    d.fonts = { count: 0, sample: [] };
    try {
        var all = app.fonts.allFonts;
        d.fonts.count = all.length;
        for (var f = 0; f < all.length && f < 40; f++) {
            d.fonts.sample.push(all[f].postScriptName + "  |  " +
                                all[f].familyName + " " + all[f].styleName);
        }
    } catch (ef) { d.fonts.error = String(ef); }

    // --- open project -----------------------------------------------------
    var p = app.project;
    d.project = {
        file: p.file ? p.file.fsName : null,
        numItems: p.numItems,
        bitsPerChannel: p.bitsPerChannel,
        expressionEngine: p.expressionEngine,
        renderQueueItems: p.renderQueue.numItems,
        comps: []
    };
    for (var n = 1; n <= p.numItems; n++) {
        var it = p.item(n);
        if (it instanceof CompItem) {
            d.project.comps.push({
                name: it.name, w: it.width, h: it.height,
                fps: it.frameRate, duration: it.duration, layers: it.numLayers
            });
        }
    }

    // --- templates (only when the project is empty; see header) ------------
    d.templates = {};
    if (p.numItems === 0) {
        app.beginUndoGroup("AP probe: read templates");
        try {
            var tmp = p.items.addComp("__ap_probe__", 64, 64, 1, 1, 24);
            var rqi = p.renderQueue.items.add(tmp);
            d.templates.renderSettings = [];
            d.templates.outputModule  = [];
            var rst = rqi.templates, omt = rqi.outputModule(1).templates, x;
            for (x = 0; x < rst.length; x++) { d.templates.renderSettings.push(rst[x]); }
            for (x = 0; x < omt.length; x++) { d.templates.outputModule.push(omt[x]); }
            d.templates.settableRenderKeys = rqi.getSettings(GetSettingsFormat.STRING_SETTABLE);
            rqi.remove();
            tmp.remove();
        } catch (et) {
            d.templates.error = String(et);
        } finally {
            app.endUndoGroup();
        }
    } else {
        d.templates.skipped = "Project is not empty — probing templates would touch it. " +
            "Run this on a new empty project to capture render/output template names.";
    }

    // --- write ------------------------------------------------------------
    try {
        var written = AEJSON.writeFile(OUT, d);
        if (!app.isRenderEngine) { alert("AP probe written:\n" + written); }
    } catch (e) {
        alert("AP probe FAILED to write:\n" + e.toString() +
              "\n\nAE " + d.version + ", effects: " + d.effectCount);
        app.exitCode = 1;
    }
})();
