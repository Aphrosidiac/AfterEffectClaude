/**
 * AP-Bridge.jsx — file-IPC bridge panel for driving After Effects from Claude.
 *
 * Install (per-user, no admin):
 *   copy to  %APPDATA%\Adobe\After Effects\26.2\Scripts\ScriptUI Panels\AP-Bridge.jsx
 *   restart AE, Window > AP-Bridge.jsx, dock it, tick "Listen".
 *
 * Requires: Preferences > Scripting & Expressions > Allow Scripts to Write Files and
 *           Access Network  = ON
 *
 * Protocol (root C:/Dev/AfterEffectClaude/.tmp/bridge):
 *   inbox/<id>.json    {"id":"…","action":"eval|ping|probe|render","code":"…","undo":"label"}
 *   outbox/<id>.json   {"id":"…","ok":true,"result":…,"log":[…],"error":null,"ms":12}
 *   status.json        heartbeat written every few ticks
 *
 * Self-contained on purpose (no #include) — it lives outside this repo once installed.
 */
(function (thisObj) {

    var ROOT     = "C:/Dev/AfterEffectClaude/.tmp/bridge";
    var INBOX    = ROOT + "/inbox";
    var OUTBOX   = ROOT + "/outbox";
    var STATUS   = ROOT + "/status.json";
    var INTERVAL = 750;          // ms
    var MAX_LOG  = 200;

    // ---------------------------------------------------------------- json
    function esc(s) {
        s = String(s);
        var out = "", i, c, code;
        for (i = 0; i < s.length; i++) {
            c = s.charAt(i); code = s.charCodeAt(i);
            if (c === '"') { out += '\\"'; }
            else if (c === "\\") { out += "\\\\"; }
            else if (c === "\n") { out += "\\n"; }
            else if (c === "\r") { out += "\\r"; }
            else if (c === "\t") { out += "\\t"; }
            else if (code < 32 || code > 126) {
                var h = code.toString(16);
                while (h.length < 4) { h = "0" + h; }
                out += "\\u" + h;
            } else { out += c; }
        }
        return '"' + out + '"';
    }

    function ser(v, depth) {
        depth = depth || 0;
        if (v === null || v === undefined) { return "null"; }
        var t = typeof v, i, parts = [], k;
        if (t === "number")  { return isFinite(v) ? String(v) : "null"; }
        if (t === "boolean") { return v ? "true" : "false"; }
        if (t === "string")  { return esc(v); }
        if (t === "function"){ return esc("[function]"); }
        if (depth > 6) { return esc("[depth limit]"); }
        if (v instanceof Array) {
            for (i = 0; i < v.length && i < 500; i++) { parts.push(ser(v[i], depth + 1)); }
            return "[" + parts.join(",") + "]";
        }
        // AE DOM objects: describe instead of enumerating (enumeration can throw)
        var isDom = false;
        try { isDom = (v instanceof CompItem) || (v instanceof FolderItem) ||
                      (v instanceof FootageItem) || (v instanceof Layer) ||
                      (v instanceof PropertyBase) || (v instanceof RenderQueueItem) ||
                      (v instanceof OutputModule) || (v instanceof File) || (v instanceof Folder);
        } catch (ed) {}
        if (isDom) {
            var desc = {};
            try { desc.type = v.reflect ? String(v.reflect.name) : "AEObject"; } catch (e1) { desc.type = "AEObject"; }
            try { if (v.name !== undefined) { desc.name = String(v.name); } } catch (e2) {}
            try { if (v.index !== undefined) { desc.index = v.index; } } catch (e3) {}
            try { if (v.fsName !== undefined) { desc.path = String(v.fsName); } } catch (e4) {}
            return ser(desc, depth + 1);
        }
        if (t === "object") {
            for (k in v) {
                if (!v.hasOwnProperty(k)) { continue; }
                try {
                    if (typeof v[k] === "function") { continue; }
                    parts.push(esc(k) + ":" + ser(v[k], depth + 1));
                } catch (e5) {}
            }
            return "{" + parts.join(",") + "}";
        }
        return esc(String(v));
    }

    // ---------------------------------------------------------------- files
    function ensureDirs() {
        var dirs = [new Folder(ROOT), new Folder(INBOX), new Folder(OUTBOX)], i;
        for (i = 0; i < dirs.length; i++) { if (!dirs[i].exists) { dirs[i].create(); } }
    }

    function readText(file) {
        file.encoding = "UTF-8";
        if (!file.open("r")) { return null; }
        var s = file.read();
        file.close();
        return s;
    }

    function writeText(path, str) {
        var f = new File(path);
        f.encoding = "UTF-8";
        if (!f.open("w")) { return false; }
        f.write(str);
        f.close();
        return true;
    }

    // ---------------------------------------------------------------- state
    var B = {
        taskId: null,
        listening: false,
        ticks: 0,
        handled: 0,
        log: [],
        ui: null
    };
    $.global.APBridge = B;

    function say(msg) {
        B.log.push(msg);
        while (B.log.length > MAX_LOG) { B.log.shift(); }
        if (B.ui && B.ui.logBox) {
            B.ui.logBox.text = B.log.slice(Math.max(0, B.log.length - 12)).join("\n");
        }
    }

    // exposed to eval'd command code:  log("something")
    $.global.apLog = function (m) { B.cmdLog.push(String(m)); };
    B.cmdLog = [];

    // ---------------------------------------------------------------- actions
    function projectSummary() {
        var p = app.project, out = {
            version: app.version,
            file: p.file ? p.file.fsName : null,
            numItems: p.numItems,
            activeItem: p.activeItem ? p.activeItem.name : null,
            comps: []
        }, i, it;
        for (i = 1; i <= p.numItems; i++) {
            it = p.item(i);
            if (it instanceof CompItem) {
                out.comps.push({ name: it.name, w: it.width, h: it.height,
                                 fps: it.frameRate, dur: it.duration, layers: it.numLayers });
            }
        }
        return out;
    }

    function doRender(cmd) {
        var comp = null, p = app.project, i;
        for (i = 1; i <= p.numItems; i++) {
            if (p.item(i) instanceof CompItem && p.item(i).name === cmd.comp) { comp = p.item(i); break; }
        }
        if (!comp) { throw new Error("Comp not found: " + cmd.comp); }
        var rqi = p.renderQueue.items.add(comp);
        if (cmd.rsTemplate) { rqi.applyTemplate(cmd.rsTemplate); }
        var om = rqi.outputModule(1);
        if (cmd.omTemplate) { om.applyTemplate(cmd.omTemplate); }
        if (cmd.output) {
            var of = new File(cmd.output);
            of.parent.create();
            om.file = of;
        }
        p.renderQueue.render();
        return { status: String(rqi.status), output: cmd.output || null };
    }

    function dispatch(cmd) {
        switch (String(cmd.action || "eval")) {
        case "ping":
            return { pong: true, version: app.version, time: new Date().toString() };
        case "probe":
            return projectSummary();
        case "render":
            return doRender(cmd);
        case "eval":
            if (!cmd.code) { throw new Error("eval command has no 'code'"); }
            var label = cmd.undo || "AP Bridge";
            app.beginUndoGroup(label);
            try {
                return eval(cmd.code);
            } finally {
                app.endUndoGroup();
            }
        default:
            throw new Error("Unknown action: " + cmd.action);
        }
    }

    function handleFile(f) {
        var started = new Date().getTime();
        var raw = readText(f), id = f.name.replace(/\.json$/i, ""), cmd = null, res;
        B.cmdLog = [];
        try {
            if (raw === null) { throw new Error("Could not read " + f.fsName); }
            cmd = eval("(" + raw + ")");
            if (cmd.id) { id = String(cmd.id); }
            res = { id: id, ok: true, result: dispatch(cmd), error: null };
        } catch (e) {
            res = { id: id, ok: false, result: null,
                    error: { message: e.toString(), line: (e.line !== undefined ? e.line : null) } };
        }
        res.log = B.cmdLog;
        res.ms  = new Date().getTime() - started;
        writeText(OUTBOX + "/" + id + ".json", ser(res));
        f.remove();
        B.handled++;
        say((res.ok ? "ok   " : "FAIL ") + id + "  (" + res.ms + "ms)" +
            (res.ok ? "" : " " + res.error.message));
    }

    function writeStatus() {
        writeText(STATUS, ser({
            listening: B.listening,
            ticks: B.ticks,
            handled: B.handled,
            time: new Date().toString(),
            version: app.version,
            project: app.project.file ? app.project.file.fsName : null,
            activeItem: app.project.activeItem ? app.project.activeItem.name : null
        }));
    }

    B.tick = function () {
        if (!B.listening) { return; }
        B.ticks++;
        try {
            ensureDirs();
            var files = new Folder(INBOX).getFiles("*.json"), i;
            for (i = 0; i < files.length; i++) {
                if (files[i] instanceof File) { handleFile(files[i]); }
            }
            if (B.ticks % 8 === 1) { writeStatus(); }
        } catch (e) {
            say("tick error: " + e.toString());
        }
    };

    function start() {
        ensureDirs();
        if (B.taskId !== null) { return; }
        B.listening = true;
        B.taskId = app.scheduleTask("APBridge.tick()", INTERVAL, true);
        writeStatus();
        say("listening on " + INBOX);
    }

    function stop() {
        B.listening = false;
        if (B.taskId !== null) { app.cancelTask(B.taskId); B.taskId = null; }
        writeStatus();
        say("stopped");
    }

    // ---------------------------------------------------------------- ui
    function build(thisObj) {
        var win = (thisObj instanceof Panel) ? thisObj
                : new Window("palette", "AP-Bridge", undefined, { resizeable: true });
        win.orientation = "column";
        win.alignChildren = ["fill", "top"];
        win.spacing = 6;
        win.margins = 10;

        var row = win.add("group");
        row.alignChildren = ["left", "center"];
        var chk = row.add("checkbox", undefined, "Listen");
        var btnPing = row.add("button", undefined, "Write ping");
        var btnOpen = row.add("button", undefined, "Open folder");

        var info = win.add("statictext", undefined, "AE " + app.version + "   idle");
        info.characters = 40;

        var logBox = win.add("edittext", undefined, "", { multiline: true, readonly: true });
        logBox.preferredSize = [380, 150];

        B.ui = { info: info, logBox: logBox };

        chk.onClick = function () {
            if (chk.value) { start(); } else { stop(); }
            info.text = "AE " + app.version + (B.listening ? "   listening" : "   idle");
        };

        btnPing.onClick = function () {
            ensureDirs();
            var id = "ping-" + new Date().getTime();
            writeText(INBOX + "/" + id + ".json", '{"id":"' + id + '","action":"ping"}');
            say("queued " + id);
        };

        btnOpen.onClick = function () {
            ensureDirs();
            new Folder(ROOT).execute();
        };

        if (win instanceof Window) { win.center(); win.show(); }
        else { win.layout.layout(true); win.layout.resize(); }
        return win;
    }

    build(thisObj);
    say("AP-Bridge loaded. IPC root: " + ROOT);

})(this);
