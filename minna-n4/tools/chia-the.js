  /* ---------- Chia động từ cho phần "Chia thể" của đề ngữ pháp (dùng chung N5 và N4) ----------
     Động từ: v = [kanji ます, kana ます, nghĩa, bài, nhóm 1|2|3] (build.py lấy từ từ vựng, xem tools/dong_tu.py).
     ctChia(v, the) → [kana, kanji] của thể đó; ctSai(v, the) → các lỗi chia hay gặp (làm phương án nhiễu). */
  const CT_HANG = { "い": "うわえお", "き": "くかけこ", "ぎ": "ぐがげご", "し": "すさせそ", "ち": "つたてと", "に": "ぬなねの", "び": "ぶばべぼ", "み": "むまめも", "り": "るられろ" };
  const CT_TE = { "い": "って", "ち": "って", "り": "って", "に": "んで", "び": "んで", "み": "んで", "き": "いて", "ぎ": "いで", "し": "して" };
  // Thể → [tên, mẫu ngữ pháp giới thiệu thể đó, bài]
  const CT_THE = {
    masen: ["Phủ định lịch sự (～ません)", "4-2", 4], mashita: ["Quá khứ lịch sự (～ました)", "4-2", 4], masendeshita: ["Quá khứ phủ định lịch sự (～ませんでした)", "4-2", 4],
    tai: ["Muốn làm (～たい)", "13-2", 13], te: ["Thể て", "14-1", 14], nai: ["Thể ない", "17-1", 17], jisho: ["Thể từ điển", "18-1", 18], ta: ["Thể た", "19-1", 19],
    nakatta: ["Quá khứ phủ định thể thường (～なかった)", "20-2", 20], tara: ["Thể ～たら", "25-2", 25],
    kano: ["Thể khả năng (thể thường)", "27-1", 27], ikou: ["Thể ý chí", "31-1", 31], meirei: ["Thể mệnh lệnh", "33-1", 33], kinshi: ["Thể cấm chỉ", "33-1", 33],
    ba: ["Thể điều kiện ば", "35-1", 35], ukemi: ["Thể bị động (thể thường)", "37-1", 37], shieki: ["Thể sai khiến (thể thường)", "48-1", 48],
    sonkei: ["Tôn kính ngữ (dạng ます)", "49-3", 49], kenjo: ["Khiêm nhường ngữ (dạng ます)", "50-2", 50]
  };
  // Động từ không chủ ý: không hỏi thể khả năng, ý chí, mệnh lệnh, cấm chỉ, sai khiến.
  const CT_KHONG_Y = /^(あります|わかります|できます|かかります|のどがかわきます|おなかがすきます|つかれます|うまれます|たります|はれます|くもります|もえます|にえます|なります|たおれます|こまります|ちがいます|なくなります|めがさめます|じかんがたちます|やくにたちます|あいます|よいます|みえます|きこえます|うまくいきます|ぶつかります|すべります|ふとります|やせます|にます|びっくりします|がっかりします|あんしんします|きんちょうします|せいようかします|なります|なくなります|しにます|いります)$/;
  const CT_SONKEI = { "いきます": "いらっしゃいます", "います": "いらっしゃいます", "たべます": "召し上がります", "のみます": "召し上がります", "いいます": "おっしゃいます", "みます": "ご覧になります", "します": "なさいます", "ねます": "お休みになります", "くれます": "くださいます" };
  const CT_KENJO = { "いきます": "参ります", "います": "おります", "たべます": "いただきます", "のみます": "いただきます", "もらいます": "いただきます", "いいます": "申します", "します": "いたします", "みます": "拝見します", "ききます": "伺います", "あいます": "お目にかかります" };
  const CT_O_NI = new Set("まちます もちます かきます よみます かえります つかいます よびます しらべます きめます えらびます さがします わすれます はなします おくります かします かります たのみます でかけます やすみます のります はいります すわります".split(" "));
  const CT_GO_NI = new Set(["りようします", "そうだんします", "よやくします"]);
  const CT_O_SHI = new Set("まちます もちます おくります よびます かします かります とどけます しらせます しらべます てつだいます はなします かえします わたします つつみます とります みせます つくります".split(" "));
  const CT_GO_SHI = new Set(["あんないします", "せつめいします", "れんらくします", "しょうかいします", "そうだんします", "しょうたいします", "よういします"]);

  // Phân tích động từ: loại (1, 2, "suru", "kuru"), phần gốc ở dạng kana và kanji.
  function ctGoc(v) {
    const [k, r, , , g] = v;
    if (g === 3 && r.endsWith("きます") && k.endsWith("来ます")) return { loai: "kuru", r: r.slice(0, -3), k: k.slice(0, -3) };
    if (g === 3) return { loai: "suru", r: r.slice(0, -3), k: k.endsWith("します") ? k.slice(0, -3) : r.slice(0, -3) };
    const s = r.slice(0, -2), K = k.endsWith("ます") ? k.slice(0, -2) : s;
    if (g === 2) return { loai: 2, s, K };
    const c = s.slice(-1), Kc = K.slice(-1) === c ? K : s;  // kanji không có okurigana khớp thì dùng kana
    return { loai: 1, s, K: Kc, c, b: s.slice(0, -1), B: Kc.slice(0, -1), iku: /(行|い)きます$/.test(k) };
  }
  // Đuôi của từng thể theo loại động từ (áp lên phần gốc kana và kanji cùng lúc).
  function ctDuoi(G, the, v) {
    const r = v[1];
    if (G.loai === "kuru") {
      const KURU = { masen: ["きません", "来ません"], mashita: ["きました", "来ました"], masendeshita: ["きませんでした", "来ませんでした"], tai: ["きたい", "来たい"],
        te: ["きて", "来て"], ta: ["きた", "来た"], nai: ["こない", "来ない"], nakatta: ["こなかった", "来なかった"], jisho: ["くる", "来る"], tara: ["きたら", "来たら"],
        kano: ["こられる", "来られる"], ikou: ["こよう", "来よう"], meirei: ["こい", "来い"], kinshi: ["くるな", "来るな"], ba: ["くれば", "来れば"],
        ukemi: ["こられる", "来られる"], shieki: ["こさせる", "来させる"] }[the];
      return [G.r + KURU[0], G.k + KURU[1]];
    }
    if (G.loai === "suru") {
      const SURU = { masen: "しません", mashita: "しました", masendeshita: "しませんでした", tai: "したい", te: "して", ta: "した", nai: "しない", nakatta: "しなかった", jisho: "する",
        tara: "したら", kano: "できる", ikou: "しよう", meirei: "しろ", kinshi: "するな", ba: "すれば", ukemi: "される", shieki: "させる" }[the];
      return [G.r + SURU, G.k + SURU];
    }
    const MASU = { masen: "ません", mashita: "ました", masendeshita: "ませんでした", tai: "たい" };
    if (MASU[the]) return [G.s + MASU[the], G.K + MASU[the]];
    if (G.loai === 2) {
      const D2 = { te: "て", ta: "た", nai: "ない", nakatta: "なかった", jisho: "る", tara: "たら", kano: "られる", ikou: "よう", meirei: "ろ", kinshi: "るな", ba: "れば", ukemi: "られる", shieki: "させる" }[the];
      return [G.s + D2, G.K + D2];
    }
    const h = CT_HANG[G.c], te = G.iku ? "って" : CT_TE[G.c], ta = te.slice(0, -1) + (te.endsWith("で") ? "だ" : "た");
    const aru = r.endsWith("あります");
    const D1 = { te, ta, nai: aru ? null : h[1] + "ない", nakatta: aru ? null : h[1] + "なかった", jisho: h[0], tara: ta + "ら", kano: h[2] + "る", ikou: h[3] + "う",
      meirei: h[2], kinshi: h[0] + "な", ba: h[2] + "ば", ukemi: h[1] + "れる", shieki: h[1] + "せる" }[the];
    if (D1 === null) return [G.b.slice(0, -1) + (the === "nai" ? "ない" : "なかった"), G.B.slice(0, -1) + (the === "nai" ? "ない" : "なかった")];  // ある → ない
    return [G.b + D1, G.B + D1];
  }
  // Kính ngữ: trả về [kanji, kana] dạng ます hoặc null nếu động từ không có dạng hỏi được.
  const CT_DAC_BIET = new Set(["行きます", "来ます", "います", "食べます", "飲みます", "言います", "見ます", "します", "寝ます", "くれます", "もらいます", "聞きます", "会います"]);
  function ctKeigo(v, loai) {
    const [k, r] = v, G = ctGoc(v);
    const db = loai === "sonkei" ? CT_SONKEI : CT_KENJO, key = k === "来ます" ? "いきます" : r;
    if (db[key] && CT_DAC_BIET.has(k)) return [db[key], db[key], "db"];
    if (loai === "sonkei" && CT_O_NI.has(r)) return ["お" + G.K + "になります", "お" + G.s + "になります", "o"];
    if (loai === "sonkei" && CT_GO_NI.has(r)) return ["ご" + G.k + "になります", "ご" + G.r + "になります", "go"];
    if (loai === "kenjo" && CT_O_SHI.has(r)) return ["お" + G.K + "します", "お" + G.s + "します", "o"];
    if (loai === "kenjo" && CT_GO_SHI.has(r)) return ["ご" + G.k + "します", "ご" + G.r + "します", "go"];
    return null;
  }
  function ctDuoc(v, the) {
    const r = v[1], G = ctGoc(v);
    if (the === "sonkei" || the === "kenjo") return !!ctKeigo(v, the);
    if (["kano", "ikou", "meirei", "kinshi", "shieki", "ukemi", "tai"].includes(the) && CT_KHONG_Y.test(r)) return false;
    if (the === "kano" && (G.loai === "suru" && /[をに]$/.test(G.r))) return false;
    if (the === "meirei" && r === "くれます") return false;
    if (the === "ukemi" && /^(あります|わかります|できます|たります|ちがいます|いります)$/.test(r)) return false;
    return true;
  }
  // Đáp án: [chuỗi hiện trên nút, chuỗi kanji để xem lại].
  function ctChia(v, the) {
    if (the === "sonkei" || the === "kenjo") { const x = ctKeigo(v, the); return [x[0], x[0]]; }
    return ctDuoi(ctGoc(v), the, v);
  }
  // Lỗi chia hay gặp: chia nhầm nhóm, nhầm đuôi, nhầm sang thể gần giống.
  function ctSai(v, the) {
    const G = ctGoc(v), out = [], add = x => { if (x && !out.includes(x)) out.push(x); };
    const dung = the => ctDuoc(v, the) ? ctChia(v, the)[0] : null;
    if (the === "sonkei" || the === "kenjo") {
      const khac = ctKeigo(v, the === "sonkei" ? "kenjo" : "sonkei"), s = G.loai === 1 || G.loai === 2 ? G.K : null, j = ctDuoi(G, "jisho", v)[1], te = ctDuoi(G, "te", v)[1];
      if (khac) add(khac[0]);
      else if (G.loai === "suru") add("ご" + G.k + (the === "sonkei" ? "します" : "に なります").replace(" ", ""));
      if (the === "sonkei") { if (s) add("お" + s + "します"); add("お" + j + "になります"); if (s) add("ご" + s + "になります"); add("お" + te + "になります"); }
      else { if (s) add("お" + s + "になります"); add("お" + j + "します"); add("お" + te + "します"); if (s) add("お" + s + "なさいます"); }
      return out;
    }
    if (G.loai === 1) {
      const h = CT_HANG[G.c];
      if (the === "te" || the === "ta" || the === "tara") ["って", "んで", "いて", "いで", "して"].forEach(e => {
        const x = the === "te" ? e : e.slice(0, -1) + (e.endsWith("で") ? "だ" : "た") + (the === "tara" ? "ら" : ""); add(G.b + x); });
      const sai2 = { te: "て", ta: "た", tara: "たら", nai: "ない", nakatta: "なかった", jisho: "る", kano: "られる", ikou: "よう", meirei: "ろ", kinshi: "な", ba: "れば", ukemi: "られる", shieki: "させる", masen: "", mashita: "", masendeshita: "", tai: "" }[the];
      if (sai2) add(G.s + sai2);  // chia như nhóm II từ thể ます: 書きない、書きて
      const x = { nai: [G.b + "あない", G.b + h[2] + "ない"], nakatta: [G.b + h[1] + "ないかった", G.b + h[1] + "なった"], jisho: [G.b + h[1] + "る", G.s + "う"],
        kano: [G.b + h[2] + "られる", G.b + h[1] + "れる", G.b + h[1] + "せる"], ikou: [G.b + h[3] + "よう", G.b + h[0] + "よう", G.b + h[2] + "よう"],
        meirei: [G.b + h[2] + "ろ", G.b + h[0] + "な", G.b + h[3]], kinshi: [G.s + "な", G.b + h[1] + "ない", G.b + h[1] + "な"],
        ba: [G.b + h[2] + "る", G.b + h[2] + "れば", G.b + h[0] + "ば"], ukemi: [G.b + h[2] + "る", G.b + h[1] + "られる", G.b + h[1] + "せる"],
        shieki: [G.b + h[1] + "れる", G.b + h[1] + "させる", G.b + h[2] + "る"], tai: [G.b + h[0] + "たい", G.b + h[1] + "たい", G.b + h[2] + "たい"],
        masen: [G.b + h[0] + "ません", G.s + "ませんでした", G.s + "ないです"], mashita: [G.s + "ませんでした", G.b + h[0] + "ました", G.s + "ますた"],
        masendeshita: [G.s + "ましたでした", G.s + "ませんだった", G.b + h[1] + "ないでした"] }[the] || [];
      x.forEach(add);
    } else if (G.loai === 2) {
      const s = G.s, x = { te: [s + "って", s + "いて", s + "んで"], ta: [s + "った", s + "いた", s + "んだ"], tara: [s + "ったら", s + "てら", s + "るたら"],
        nai: [s + "らない", s + "るない", s + "いない"], nakatta: [s + "らなかった", s + "ないかった", s + "なった"], jisho: [s + "う", s + "ます", s + "む"],
        kano: [s + "れる", s + "させる", s + "らせる"], ikou: [s + "ろう", s + "るよう", s + "よ"], meirei: [s + "れ", s + "るな", s + "よう"],
        kinshi: [s + "な", s + "ない", s + "ろな"], ba: [s + "えば", s + "るば", s + "られば"], ukemi: [s + "れる", s + "させる", s + "らせる"],
        shieki: [s + "らせる", s + "られる", s + "せる"], tai: [s + "るたい", s + "てたい", s + "らたい"], masen: [s + "ないです", s + "ませんでした", s + "るません"],
        mashita: [s + "ませんでした", s + "るました", s + "ますた"], masendeshita: [s + "ましたでした", s + "ませんだった", s + "ないでした"] }[the] || [];
      x.forEach(add);
    } else if (G.loai === "suru") {
      const p = G.r, x = { te: [p + "すて", p + "しって", p + "さて"], ta: [p + "すた", p + "しった", p + "さた"], tara: [p + "すたら", p + "しったら", p + "してら"],
        nai: [p + "さない", p + "すない", p + "せない"], nakatta: [p + "さなかった", p + "すなかった", p + "しないかった"], jisho: [p + "す", p + "しる", p + "すう"],
        kano: [p + "される", p + "しれる", p + "させる", p + "せる"], ikou: [p + "そう", p + "すよう", p + "しろう"], meirei: [p + "せ", p + "すれ", p + "しよう"],
        kinshi: [p + "しな", p + "しないな", p + "すな"], ba: [p + "せば", p + "しれば", p + "するば"], ukemi: [p + "させる", p + "しられる", p + "できる"],
        shieki: [p + "される", p + "さす", p + "しさせる"], tai: [p + "するたい", p + "してたい", p + "さたい"], masen: [p + "しないです", p + "しませんでした", p + "すません"],
        mashita: [p + "しませんでした", p + "すました", p + "しますた"], masendeshita: [p + "しましたでした", p + "しませんだった", p + "しないでした"] }[the] || [];
      x.forEach(add);
    } else {
      const p = G.r, x = { te: ["こて", "くて", "きって"], ta: ["こた", "くた", "きった"], tara: ["こたら", "くたら", "きったら"], nai: ["きない", "くない", "かない"],
        nakatta: ["きなかった", "くなかった", "かなかった"], jisho: ["きる", "こる", "くう"], kano: ["きられる", "くられる", "これる"], ikou: ["きよう", "くよう", "こう"],
        meirei: ["きろ", "くれ", "こよ"], kinshi: ["こるな", "きるな", "こな"], ba: ["きれば", "これば", "くるば"], ukemi: ["きられる", "くられる", "こさせる"],
        shieki: ["きさせる", "くさせる", "こられる"], tai: ["こたい", "くたい", "きったい"], masen: ["こません", "くません", "きないです"], mashita: ["こました", "くました", "きませんでした"],
        masendeshita: ["こませんでした", "きましたでした", "きませんだった"] }[the] || [];
      x.forEach(s => add(p + s));
    }
    // Các thể gần giống của cùng động từ.
    ({ kano: ["ukemi", "shieki"], ukemi: ["kano", "shieki"], shieki: ["ukemi", "kano"], ba: ["kano", "meirei"], meirei: ["kinshi", "ikou"], kinshi: ["nai", "meirei"],
       te: ["ta"], ta: ["te"], tara: ["ta"], nakatta: ["nai"], nai: ["nakatta"], mashita: ["masendeshita"], masen: ["masendeshita"], masendeshita: ["masen"] }[the] || []).forEach(t => add(dung(t)));
    return out;
  }
  // Gợi ý sau khi trả lời: đuôi đổi thế nào.
  function ctGoiY(v, the) {
    const G = ctGoc(v), [kana, kanji] = ctChia(v, the), nhom = ["", "Nhóm I", "Nhóm II", "Nhóm III"][v[4]];
    if (the === "sonkei" || the === "kenjo") {
      const loai = ctKeigo(v, the)[2], duoi = the === "sonkei" ? "に なります" : "します";
      return loai === "db" ? `${v[0]} có động từ ${the === "sonkei" ? "tôn kính" : "khiêm nhường"} đặc biệt` : loai === "go" ? `ご + danh từ + ${duoi}` : `お + Vます (bỏ ます) + ${duoi}`;
    }
    if (G.loai === "kuru") return `${nhom} · 来ます → ${kanji.slice(G.k.length)}（${kana.slice(G.r.length)}）`;
    if (G.loai === "suru") return `${nhom} · します → ${kana.slice(G.r.length)}`;
    if (G.loai === 2) return `${nhom} · ～ます → ～${kana.slice(G.s.length)}`;
    if (G.iku && (the === "te" || the === "ta" || the === "tara")) return `${nhom} · 行きます là ngoại lệ → 行${kana.slice(G.b.length)}`;
    if (v[1].endsWith("あります") && (the === "nai" || the === "nakatta")) return `${nhom} · あります là ngoại lệ → ${kana.slice(G.b.length - 1)}`;
    return `${nhom} · ～${G.c}ます → ～${kana.slice(G.b.length)}`;
  }
  // Chọn câu hỏi cho đề: thể mới của các bài trong đề, thêm thể đã học để đủ số câu; thể sai lần trước hỏi thêm 2 câu.
  function ctDe(cfg, lan, yeu) {
    const ds = D.dongTu || [], L = cfg.lessons, lo = Math.min(...L), hi = Math.max(...L);
    const moi = Object.keys(CT_THE).filter(t => L.includes(CT_THE[t][2]));
    const cu = Object.keys(CT_THE).filter(t => CT_THE[t][2] < lo);
    const TONG = 12, chon = [];
    const q = moi.length ? Math.min(6, Math.max(3, Math.ceil(TONG / moi.length))) : 0;
    moi.forEach(t => { for (let i = 0; i < q + (yeu.includes(t) ? 2 : 0); i++) chon.push(t); });
    if (chon.length < TONG && cu.length) {
      // ưu tiên thể sai lần trước, rồi các thể đã học (đổi theo mỗi lần làm)
      const xep = npShuffle(cu.length, cfg.key + "cu" + lan).map(i => cu[i]);
      const thu = [...cu.filter(t => yeu.includes(t)), ...xep.filter(t => !yeu.includes(t))].slice(0, moi.length ? 3 : 4);
      const dich = TONG + 2 * moi.filter(t => yeu.includes(t)).length;
      for (let i = 0; chon.length < dich; i++) chon.push(thu[i % thu.length]);
    }
    const thuTu = [...new Set(chon)];
    chon.sort((x, y) => thuTu.indexOf(x) - thuTu.indexOf(y));  // các câu cùng một thể đứng liền nhau
    const trong = ds.filter(v => L.includes(v[3])), truoc = ds.filter(v => v[3] < lo);
    const xt = npShuffle(trong.length, cfg.key + "v" + lan).map(i => trong[i]), xs = npShuffle(truoc.length, cfg.key + "w" + lan).map(i => truoc[i]);
    const pool = [...xt, ...xs], dung = new Map(), cap = new Set(), out = [];
    chon.forEach((the, n) => {
      // động từ chưa dùng trước; hết thì dùng lại động từ ít dùng nhất, nhưng không lặp cùng một thể
      const hop = pool.filter(v => ctDuoc(v, the) && !cap.has(v[0] + v[1] + the));
      if (!hop.length) return;
      const v = hop.reduce((m, x) => (dung.get(x) || 0) < (dung.get(m) || 0) ? x : m, hop[0]);
      dung.set(v, (dung.get(v) || 0) + 1); cap.add(v[0] + v[1] + the);
      const dap = ctChia(v, the)[0], sai = ctSai(v, the).filter(x => x !== dap).slice(0, 3);
      const opts = [dap, ...sai], o = npShuffle(opts.length, cfg.key + lan + "o" + n);
      out.push({ v, the, opts: o.map(i => opts[i]), a: o.indexOf(0) });
    });
    return out;
  }
  if (typeof module !== "undefined") module.exports = { ctChia, ctSai, ctDuoc, ctGoiY, ctKeigo, CT_THE };
