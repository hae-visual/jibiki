"""Redesign the back of the "Từ → Đọc/Nghĩa" card (note type "Kanji Look and Learn - Từ ghép (VN)").

The old "Kanji: 月" line becomes the Sino-Vietnamese reading of every kanji in the word (今 KIM · 月 NGUYỆT), and the back is
laid out as: reading + audio on one line, Sino-Vietnamese chips, meaning, example sentence. The readings come from your own
"Kanji Look and Learn - Kanji (VN)" notes and are written into the template as a small table, so no field is added (adding a
field would force a full one-way sync with AnkiWeb). In the app's reverse mode the chips hide the kanji so they don't give the
answer away. Safe to rerun: the part between the markers is replaced.

Usage: py tu_ghep_han_viet.py [--preview out.html] [--remove]
The original template is saved to _build/tu-ghep-template-backup.json before the first change.
"""
import json, os, re, sys, urllib.request

MODEL = "Kanji Look and Learn - Từ ghép (VN)"
KANJI_MODEL = "Kanji Look and Learn - Kanji (VN)"
TEMPLATE = "Từ → Đọc/Nghĩa"
HERE = os.path.dirname(os.path.abspath(__file__))
BACKUP = os.path.join(HERE, "..", "_build", "tu-ghep-template-backup.json")
CSS_START, CSS_END = "/* jibiki-han-viet */", "/* /jibiki-han-viet */"

CSS = CSS_START + """
.rd{display:flex;align-items:center;justify-content:center;gap:10px;margin:6px 0 2px}
.rd .kana{font-size:32px}
.hvrow{display:flex;justify-content:center;align-items:center;flex-wrap:wrap;gap:8px;margin:12px 0 6px}
.hvc{display:inline-flex;align-items:baseline;gap:8px;padding:4px 14px;border-radius:999px;background:#fdecea}
.hvc .hvk{font-size:20px;color:#555}
.hvc b,.hvrow>b{font-size:21px;color:#c62828;letter-spacing:.04em}
.hvsep{color:#bbb}
.rd+.hvrow+.mean,.hvrow+.mean{margin-top:4px}
.sent{border-top:1px dashed #d6d6d6;padding-top:12px;margin:14px auto 4px;max-width:90%}
.nightMode .hvc,.night_mode .hvc{background:#3a2626}
.nightMode .hvc .hvk,.night_mode .hvc .hvk{color:#bbb}
.nightMode .hvc b,.night_mode .hvc b,.nightMode .hvrow>b,.night_mode .hvrow>b{color:#ef9a9a}
.nightMode .sent,.night_mode .sent{border-top-color:#444}
""" + CSS_END


def call(action, **params):
    req = urllib.request.Request("http://127.0.0.1:8765", json.dumps({"action": action, "version": 6, "params": params}).encode("utf-8"))
    r = json.loads(urllib.request.urlopen(req, timeout=120).read().decode("utf-8"))
    if r.get("error"):
        raise RuntimeError(r["error"])
    return r["result"]


def plain(v):
    return re.sub(r"<[^>]+>|&nbsp;", "", v or "").strip()


def han_viet_table():
    """Sino-Vietnamese reading of every kanji used in the compound words, from the user's kanji notes."""
    hv = {}
    for n in call("notesInfo", notes=call("findNotes", query=f'"note:{KANJI_MODEL}"')):
        k, h = plain(n["fields"]["Kanji"]["value"]), plain(n["fields"]["Hán Việt"]["value"])
        if len(k) == 1 and h:
            hv.setdefault(k, h)
    used = {c for n in call("notesInfo", notes=call("findNotes", query=f'"note:{MODEL}"'))
            for c in plain(n["fields"]["Từ"]["value"])}
    return {k: v for k, v in sorted(hv.items()) if k in used}


def back_template(table):
    data = json.dumps(table, ensure_ascii=False, separators=(",", ":"))
    assert "{{" not in data and "}}" not in data
    script = """<script>
(function () {
  var all = document.querySelectorAll(".hvrow"), el = all[all.length - 1];
  if (!el || el.getAttribute("data-on")) return;
  el.setAttribute("data-on", "1");
  var M = __DATA__;
  var w = (el.getAttribute("data-w") || "").replace(/\\s+/g, "");
  var hide = !!document.querySelector(".tk-nguoc"), out = [], prev = "";
  for (var i = 0; i < w.length; i++) {
    var ch = w[i] === "々" ? prev : w[i];
    prev = ch;
    if (!M[ch]) continue;
    out.push(hide ? "<b>" + M[ch] + "</b>" : '<span class="hvc"><span class="hvk">' + w[i] + "</span><b>" + M[ch] + "</b></span>");
  }
  if (out.length) el.innerHTML = out.join('<span class="hvsep">·</span>');
  else el.style.display = "none";
})();
</script>""".replace("__DATA__", data)
    return ('{{FrontSide}}<hr id=answer>'
            '<div class="rd"><span class="kana">{{Cách đọc}}</span>{{Âm thanh}}</div>'
            '<div class="hvrow" data-w="{{text:Từ}}"></div>'
            '<div class="mean">{{Nghĩa}}</div>'
            '{{#Ví dụ}}<div class="sent">{{Ví dụ}}</div>{{/Ví dụ}}\n' + script)


def strip(text, a, b):
    return re.sub(r"\s*" + re.escape(a) + r".*?" + re.escape(b), "", text, flags=re.S)


def main():
    args = sys.argv[1:]
    tpl = call("modelTemplates", modelName=MODEL)
    css = call("modelStyling", modelName=MODEL)["css"]
    if not os.path.exists(BACKUP):
        os.makedirs(os.path.dirname(BACKUP), exist_ok=True)
        json.dump({"templates": tpl, "css": css}, open(BACKUP, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print("backup:", os.path.abspath(BACKUP))
    if "--remove" in args:
        old = json.load(open(BACKUP, encoding="utf-8"))
        call("updateModelTemplates", model={"name": MODEL, "templates": {TEMPLATE: old["templates"][TEMPLATE]}})
        call("updateModelStyling", model={"name": MODEL, "css": old["css"]})
        print("restored the original back of", TEMPLATE)
        return
    table = han_viet_table()
    back = back_template(table)
    css = strip(css, CSS_START, CSS_END).rstrip() + "\n\n" + CSS + "\n"
    print("Sino-Vietnamese readings:", len(table))
    if "--preview" in args:
        out = args[args.index("--preview") + 1]
        words = args[args.index("--preview") + 2:] or ["今月"]
        parts = []
        for w in words:
            n = call("notesInfo", notes=call("findNotes", query=f'"note:{MODEL}" "Từ:{w}"'))[0]
            f = {k: v["value"] for k, v in n["fields"].items()}
            html = back.replace("{{FrontSide}}", tpl[TEMPLATE]["Front"])
            html = re.sub(r"\{\{#Ví dụ\}\}(.*?)\{\{/Ví dụ\}\}", lambda m: m.group(1) if f.get("Ví dụ") else "", html, flags=re.S)
            html = html.replace("{{text:Từ}}", plain(f["Từ"]))
            html = re.sub(r"\{\{([^}]+)\}\}", lambda m: f.get(m.group(1).strip(), ""), html)
            html = re.sub(r"\[sound:[^\]]+\]", '<span style="display:inline-block;width:30px;height:30px;border:1px solid #ccc;border-radius:50%;line-height:30px">▶</span>', html)
            parts.append(f'<div class="card card1" style="padding:16px;border-bottom:8px solid #ddd">{html}</div>')
        open(out, "w", encoding="utf-8").write(f"<!doctype html><meta charset='utf-8'><style>{css}</style><body style='margin:0'>{''.join(parts)}</body>")
        print("preview:", out)
        return
    call("updateModelTemplates", model={"name": MODEL, "templates": {TEMPLATE: {"Front": tpl[TEMPLATE]["Front"], "Back": back}}})
    call("updateModelStyling", model={"name": MODEL, "css": css})
    print("updated", MODEL, "/", TEMPLATE)


if __name__ == "__main__":
    main()
