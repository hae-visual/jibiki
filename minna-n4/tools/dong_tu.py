"""Verb list for the conjugation part of the grammar tests (shared by the N5 and N4 builds).

dong_tu(vocab_rows) → [[kanji ます, kana ます, nghĩa, bài, nhóm 1|2|3], ...]
The N4 vocabulary carries the verb group; for N5 it is inferred from the ます form, with the N4 groups as a cross-check.
Keigo verbs and set phrases in ～ています are left out: they do not conjugate like the others.
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
N4_VOCAB = os.path.join(HERE, "..", "data", "vocab.json")

BO = {"いらっしゃいます", "めしあがります", "おっしゃいます", "なさいます", "ごらんになります", "まいります", "おります",
      "いただきます", "もうします", "いたします", "はいけんします", "ぞんじます", "うかがいます", "おめにかかります", "くださいます",
      "していらっしゃいます", "～といいます"}
# Nhóm II có âm trước ます thuộc hàng い (còn lại hàng い là nhóm I).
II_KANJI = ("見ます", "起きます", "着ます", "借ります", "足ります", "浴びます", "降ります", "煮ます", "信じます", "閉じます", "生きます")
II_KANA = {"います", "できます", "みます"}
# Kết thúc bằng します nhưng là động từ nhóm I (す-verb), không phải N + します.
I_SU = {"けします", "はなします", "おもいだします", "だします", "おします", "なくします", "かえします", "まわします", "なおします", "かします"}
HANG_E = set("えけげせぜてでねべぺめれ")


def nhom_doan(kanji, kana):
    if kana.endswith("きます") and (kanji or "").endswith("来ます"):
        return 3
    if kana.endswith("します"):
        return 1 if kana in I_SU else 3
    truoc = kana[-3]
    if truoc in HANG_E or kana in II_KANA or kanji.endswith(II_KANJI):
        return 2
    return 1


def dong_tu(rows):
    n4 = {}
    try:
        for r in json.load(open(N4_VOCAB, encoding="utf-8")):
            if r["kana"].endswith("ます") and r.get("nhom") in ("I", "II", "III"):
                n4[((r["kanji"] or "").split("、")[0].strip() or r["kana"], r["kana"])] = {"I": 1, "II": 2, "III": 3}[r["nhom"]]
    except FileNotFoundError:
        pass
    out, seen = [], set()
    for r in rows:
        kana = r["kana"].strip()
        if not kana.endswith("ます") or kana in BO or kana.endswith("ています") or "～" in kana:
            continue
        kanji = (r["kanji"] or "").split("、")[0].strip() or kana
        g = {"I": 1, "II": 2, "III": 3}.get(r.get("nhom") or "") or nhom_doan(kanji, kana)
        if n4.get((kanji, kana), g) != g:
            raise SystemExit(f"nhóm động từ lệch: {kanji} {kana} đoán {g}, N4 ghi {n4[(kanji, kana)]}")
        key = (kanji, kana)
        if key in seen:
            continue
        seen.add(key)
        out.append([kanji, kana, r["nghia"], int(r["bai"]), g])
    return out
