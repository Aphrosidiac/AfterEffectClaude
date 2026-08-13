/**
 * aejson.jsx — minimal JSON for ExtendScript (ES3 has no JSON object).
 * Usage:  #include "../lib/aejson.jsx"
 *         var s = AEJSON.stringify(obj, true);
 *         var o = AEJSON.parse(str);
 */
$.global.AEJSON = (function () {

    function esc(s) {
        s = String(s);
        var out = "", i, c;
        for (i = 0; i < s.length; i++) {
            c = s.charAt(i);
            if (c === '"') { out += '\\"'; }
            else if (c === "\\") { out += "\\\\"; }
            else if (c === "\n") { out += "\\n"; }
            else if (c === "\r") { out += "\\r"; }
            else if (c === "\t") { out += "\\t"; }
            else if (s.charCodeAt(i) < 32 || s.charCodeAt(i) > 126) {
                var h = s.charCodeAt(i).toString(16);
                while (h.length < 4) { h = "0" + h; }
                out += "\\u" + h;
            } else { out += c; }
        }
        return '"' + out + '"';
    }

    function ser(v, pretty, indent) {
        var pad = "", padIn = "", i, parts = [], k;
        if (pretty) {
            for (i = 0; i < indent; i++) { pad += "  "; }
            padIn = pad + "  ";
        }
        if (v === null || v === undefined) { return "null"; }
        var t = typeof v;
        if (t === "number") { return isFinite(v) ? String(v) : "null"; }
        if (t === "boolean") { return v ? "true" : "false"; }
        if (t === "string") { return esc(v); }
        if (v instanceof Array) {
            if (v.length === 0) { return "[]"; }
            for (i = 0; i < v.length; i++) { parts.push(padIn + ser(v[i], pretty, indent + 1)); }
            return pretty ? "[\n" + parts.join(",\n") + "\n" + pad + "]"
                          : "[" + parts.join(",") + "]";
        }
        if (t === "object") {
            for (k in v) {
                if (!v.hasOwnProperty(k)) { continue; }
                if (typeof v[k] === "function") { continue; }
                parts.push(padIn + esc(k) + (pretty ? ": " : ":") + ser(v[k], pretty, indent + 1));
            }
            if (parts.length === 0) { return "{}"; }
            return pretty ? "{\n" + parts.join(",\n") + "\n" + pad + "}"
                          : "{" + parts.join(",") + "}";
        }
        return esc(String(v));
    }

    return {
        stringify: function (obj, pretty) { return ser(obj, pretty === true, 0); },

        /** Only feed this data we produced. ES3 has no safe parser. */
        parse: function (str) { return eval("(" + str + ")"); },

        /** Read a UTF-8 file and parse it. Returns null if missing/unparseable. */
        readFile: function (path) {
            var f = new File(path);
            if (!f.exists) { return null; }
            f.encoding = "UTF-8";
            if (!f.open("r")) { return null; }
            var s = f.read();
            f.close();
            try { return eval("(" + s + ")"); } catch (e) { return null; }
        },

        /** Write an object as pretty JSON. Throws if the write-files pref is off. */
        writeFile: function (path, obj) {
            var f = new File(path);
            f.parent.create();
            f.encoding = "UTF-8";
            if (!f.open("w")) {
                throw new Error("Cannot write " + path +
                    " — enable Preferences > Scripting & Expressions > Allow Scripts to Write Files and Access Network");
            }
            f.write(ser(obj, true, 0));
            f.close();
            return f.fsName;
        }
    };
})();
