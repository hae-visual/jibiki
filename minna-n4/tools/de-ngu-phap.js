  /* ---------- Đề ngữ pháp (dùng chung cho trang N5 và N4) ----------
     Mỗi mẫu ngữ pháp của đề có hai câu soạn mới (data/dich-*.json: [tiếng Việt, tiếng Nhật, gợi ý từ]).
     Phần 1 · Sắp xếp câu: bấm các mảnh theo thứ tự, máy chấm ngay.
     Phần 2 · Dịch Việt → Nhật: viết ra giấy, chụp ảnh tải lên; server của app gửi ảnh cho Claude đọc và chấm từng câu.
     Mỗi lần "Làm lại" thì hai câu đổi vai cho nhau, nên lần sau gặp câu khác. */
  function npCss() {
    if (document.getElementById("np-css")) return;
    const st = document.createElement("style");
    st.id = "np-css";
    st.textContent = `
.np-intro{background:var(--sheet,#fff);border:1px solid var(--line,#ddd);border-radius:10px;padding:12px 16px;margin:10px 0 16px;line-height:1.6}
.np-x{border-top:1px solid var(--line,#ddd);padding:12px 0}
.np-x .stem{display:flex;gap:10px;align-items:baseline}
.np-pat{font-size:.85rem;color:var(--muted,#777);margin:4px 0 6px 32px}
.np-ans,.np-pool{display:flex;flex-wrap:wrap;gap:6px;margin-left:32px;min-height:40px;align-items:center}
.np-ans{border-bottom:2px dashed var(--line,#ccc);padding-bottom:6px;margin-bottom:8px}
.np-ans:empty::before{content:"Bấm các mảnh bên dưới theo đúng thứ tự…";color:var(--muted,#999);font-size:.9rem}
.np-tile{font:inherit;font-size:1.05rem;padding:5px 10px;border-radius:8px;border:1px solid var(--line,#ccc);background:var(--sheet,#fff);color:var(--ink,#222);cursor:pointer}
.np-tile:hover{border-color:var(--ai,#2c4a87)}
.np-tile[disabled]{opacity:.25;cursor:default}
.np-x.ok .np-ans{border-bottom-color:#2e7d32}.np-x.no .np-ans{border-bottom-color:#c62828}
.np-fb{margin:6px 0 0 32px;font-size:.95rem}
.np-fb .ok{color:#2e7d32;font-weight:600}.np-fb .no{color:#c62828;font-weight:600}.np-fb .gan{color:#b26a00;font-weight:600}
.np-list{list-style:none;padding:0;margin:0}
.np-list li{border-top:1px solid var(--line,#ddd);padding:10px 0}
.np-list .so{display:inline-block;min-width:2em;font-weight:700}
.np-list small{color:var(--muted,#777)}
.np-list .mau{display:none;color:var(--ai,#2c4a87);font-size:.85rem}
.np-showmau .np-list .mau{display:inline}
.np-tools,.np-up{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:10px 0}
.np-thumbs{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0}
.np-thumbs img{height:110px;border:1px solid var(--line,#ccc);border-radius:6px}
.np-kq{margin:6px 0 0 2em;font-size:.95rem;line-height:1.55}
.np-kq .doc{font-family:var(--font-jp,inherit)}
.np-status{color:var(--muted,#777)}
@media print{body *{visibility:hidden!important}.np-print,.np-print *{visibility:visible!important}
.np-print{position:absolute;left:0;top:0;width:100%}.np-tools,.np-up,.np-thumbs,.np-kq,.np-status{display:none!important}
.np-list li{padding:14px 0 34px;break-inside:avoid}}`;
    document.head.appendChild(st);
  }
  // Trộn mảnh theo hạt cố định (cùng lần làm thì cùng thứ tự, tải lại trang không đổi).
  function npRand(seed) {
    let s = 0; for (const c of String(seed)) s = (s * 31 + c.charCodeAt(0)) | 0;
    return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function npShuffle(n, seed) {
    const r = npRand(seed), a = [...Array(n).keys()];
    for (let k = 0; k < 5; k++) {
      for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
      if (n < 2 || a.some((v, i) => v !== i)) break;
    }
    return a;
  }
  // Thu nhỏ ảnh trước khi gửi (cạnh dài tối đa 1800px) cho nhanh và rẻ.
  const npNho = f => new Promise((ok, no) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 1800 / Math.max(img.width, img.height)), c = document.createElement("canvas");
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      ok(c.toDataURL("image/jpeg", 0.88));
    };
    img.onerror = () => no(new Error("Không đọc được ảnh " + f.name));
    img.src = URL.createObjectURL(f);
  });

  function deNguPhap(cfg) {
    // cfg: { key, cap: "n4"|"n5", title, eyebrow, lessons: [số bài], head: HTML thanh chọn đề, pager: HTML cuối trang }
    setNav("test");
    npCss();
    let saved = store.get(cfg.key) || {};
    if (saved.ans) saved = {};  // bản ghi của đề trắc nghiệm cũ
    saved.lan = saved.lan || 0; saved.xep = saved.xep || {};
    const save = () => store.set(cfg.key, saved);
    const mau = cfg.lessons.flatMap(l => (D.grammar[l] || []).map(g => Object.assign({ bai: l }, g))).filter(g => (D.dich[g.id] || []).length);
    const cau = (g, k) => { const v = D.dich[g.id]; return { vi: v[(saved.lan + k) % v.length][0], ja: v[(saved.lan + k) % v.length][1], gy: v[(saved.lan + k) % v.length][2] }; };
    const manh = s => s.split(/\s+/).filter(Boolean);
    let anh = [];  // ảnh bài làm (chỉ giữ trong trang, không lưu)

    let h = cfg.head + `<div class="test-head"><div><p class="eyebrow">${esc(cfg.eyebrow)}</p><h1>${esc(cfg.title)}</h1></div>
      <div class="badges"><span class="badge">${mau.length} mẫu ngữ pháp</span><span class="badge">Lần làm ${saved.lan + 1}</span></div></div>
      <div class="np-intro">Đề chỉ kiểm tra <b>ngữ pháp</b>: mỗi mẫu có một câu sắp xếp và một câu dịch. Từ vựng đã cho sẵn trong gợi ý, bạn chỉ cần dùng đúng mẫu.
      <br><b>Phần 1</b> làm ngay trên trang, máy chấm. <b>Phần 2</b> viết câu tiếng Nhật ra giấy (ghi số câu), chụp ảnh rồi tải lên để Claude đọc và chấm.
      <br>Bấm <b>Làm lại</b> để làm lần mới với câu khác.</div>
      <div id="res"></div>
      <section class="sec"><h3>Phần 1 · Sắp xếp thành câu đúng</h3><p class="instr">Bấm các mảnh theo đúng thứ tự để thành câu có nghĩa như câu tiếng Việt. Bấm vào mảnh đã chọn để bỏ ra.</p>`;
    mau.forEach((g, i) => {
      const c = cau(g, 0);
      h += `<div class="np-x" data-g="${g.id}"><div class="stem"><span class="num">${i + 1}</span><span class="text">${esc(c.vi)}</span></div>
        <div class="np-pat">Mẫu ${esc(g.id)}: ${esc(g.p)}</div><div class="np-ans"></div><div class="np-pool"></div><div class="np-fb"></div></div>`;
    });
    h += `<div class="np-tools"><button class="btn primary" id="npXepNop" type="button">Chấm phần 1</button></div></section>
      <section class="sec np-dich"><h3>Phần 2 · Dịch sang tiếng Nhật (viết ra giấy)</h3>
      <p class="instr">Viết câu tiếng Nhật cho từng câu, ghi rõ số câu. Viết kanji hay hiragana đều được. Xong thì chụp ảnh (chụp thẳng, đủ sáng) và tải lên.</p>
      <div class="np-tools"><label class="toggle"><input type="checkbox" id="npMau"> Hiện tên mẫu cần dùng</label><button class="btn" id="npIn" type="button">🖨 In phiếu câu hỏi</button></div>
      <div class="np-print"><ol class="np-list">${mau.map((g, i) => { const c = cau(g, 1); return `<li data-g="${g.id}"><span class="so">${i + 1}.</span>${esc(c.vi)}
        ${c.gy ? `<br><small>Gợi ý từ: ${esc(c.gy)}</small>` : ""} <span class="mau">· mẫu ${esc(g.id)}: ${esc(g.p)}</span><div class="np-kq"></div></li>`; }).join("")}</ol></div>
      <div class="np-up"><label class="btn" for="npFile">📷 Chọn ảnh bài làm</label><input type="file" id="npFile" accept="image/*" multiple hidden>
        <button class="btn primary" id="npCham" type="button" disabled>Chấm phần 2 bằng Claude</button><span class="np-status" id="npSt"></span></div>
      <div class="np-thumbs" id="npThumbs"></div></section>` + cfg.pager;
    app.innerHTML = h;

    /* ----- Phần 1: sắp xếp ----- */
    const boxes = [...app.querySelectorAll(".np-x")];
    function veXep(box) {
      const g = mau.find(x => x.id === box.dataset.g), parts = manh(cau(g, 0).ja), chon = saved.xep[g.id] || [];
      const order = npShuffle(parts.length, cfg.key + g.id + saved.lan);
      box.querySelector(".np-ans").innerHTML = chon.map((k, n) => `<button class="np-tile" type="button" data-bo="${n}">${esc(parts[k])}</button>`).join("");
      box.querySelector(".np-pool").innerHTML = order.map(k => `<button class="np-tile" type="button" data-k="${k}" ${chon.includes(k) || saved.xepDone ? "disabled" : ""}>${esc(parts[k])}</button>`).join("");
      if (saved.xepDone) box.querySelectorAll(".np-ans .np-tile").forEach(b => b.disabled = true);
    }
    function xepDung(g) {
      const parts = manh(cau(g, 0).ja), chon = saved.xep[g.id] || [];
      return chon.length === parts.length && chon.map(k => parts[k]).join("") === parts.join("");
    }
    function chamXep() {
      let dung = 0;
      boxes.forEach(box => {
        const g = mau.find(x => x.id === box.dataset.g), ok = xepDung(g);
        if (ok) dung++;
        box.classList.toggle("ok", ok); box.classList.toggle("no", !ok);
        box.querySelector(".np-fb").innerHTML = ok ? `<span class="ok">Đúng.</span>` : `<span class="no">Chưa đúng.</span> Câu đúng: <span class="jp">${esc(cau(g, 0).ja)}</span>`;
      });
      saved.xepDung = dung;
      document.getElementById("npXepNop").disabled = true;
      return dung;
    }
    boxes.forEach(veXep);
    app.onclick = e => {
      const t = e.target.closest(".np-tile"); if (!t || saved.xepDone) return;
      const box = t.closest(".np-x"), id = box.dataset.g, chon = saved.xep[id] = saved.xep[id] || [];
      if (t.dataset.k !== undefined) chon.push(+t.dataset.k); else chon.splice(+t.dataset.bo, 1);
      save(); veXep(box);
    };
    document.getElementById("npXepNop").addEventListener("click", () => {
      saved.xepDone = true; chamXep(); save(); boxes.forEach(veXep); ketQua();
    });

    /* ----- Phần 2: dịch, chấm ảnh ----- */
    document.getElementById("npMau").addEventListener("change", e => app.classList.toggle("np-showmau", e.target.checked));
    document.getElementById("npIn").addEventListener("click", () => window.print());
    const st = document.getElementById("npSt"), nut = document.getElementById("npCham");
    document.getElementById("npFile").addEventListener("change", async e => {
      const files = [...e.target.files].slice(0, 6);
      st.textContent = "Đang chuẩn bị ảnh…";
      try { anh = await Promise.all(files.map(npNho)); } catch (er) { st.textContent = er.message; return; }
      document.getElementById("npThumbs").innerHTML = anh.map(a => `<img src="${a}" alt="Ảnh bài làm">`).join("");
      st.textContent = `${anh.length} ảnh`;
      nut.disabled = !anh.length;
    });
    const NHAN = { dung: ["ok", "Đúng"], gan_dung: ["gan", "Gần đúng"], sai: ["no", "Sai"], bo_trong: ["no", "Không thấy câu trả lời"] };
    function veDich() {
      const r = saved.dich; if (!r) return;
      app.querySelectorAll(".np-list li").forEach((li, i) => {
        const x = r.items.find(y => y.so === i + 1), g = mau[i], c = cau(g, 1);
        const [cls, chu] = NHAN[(x && x.ket_qua) || "bo_trong"];
        li.querySelector(".np-kq").innerHTML = `<span class="${cls}">${chu}.</span>` +
          (x && x.doc_duoc ? ` Máy đọc được: <span class="doc">${esc(x.doc_duoc)}</span>` : "") +
          (x && x.giai_thich ? `<br>${esc(x.giai_thich)}` : "") +
          `<br>Câu mẫu: <span class="jp">${esc(x && x.cau_dung && x.ket_qua !== "dung" ? x.cau_dung : c.ja)}</span>`;
        li.querySelector(".np-kq").className = "np-kq np-fb";
      });
    }
    nut.addEventListener("click", async () => {
      if (!anh.length) return;
      nut.disabled = true; st.textContent = "Claude đang đọc và chấm bài (khoảng 20–60 giây)…";
      const items = mau.map((g, i) => { const c = cau(g, 1); return { so: i + 1, vi: c.vi, mau: g.p, y_nghia: g.m, dap_an: c.ja }; });
      try {
        const r = await fetch("/api/cham-ngu-phap", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cap: cfg.cap, items, images: anh }) });
        const j = await r.json().catch(() => ({ loi: "Server trả về lỗi " + r.status }));
        if (!r.ok || j.loi) throw new Error(j.loi || ("Lỗi " + r.status));
        saved.dich = j; save();
        st.textContent = "Đã chấm xong.";
        veDich(); ketQua();
        document.getElementById("res").scrollIntoView({ behavior: "smooth", block: "start" });
      } catch (er) {
        st.textContent = location.protocol === "file:" ? "Cần mở trang trong app 字引 (server của app gửi ảnh đi chấm)." : "Chưa chấm được: " + er.message;
      } finally { nut.disabled = !anh.length; }
    });

    /* ----- Kết quả chung ----- */
    function ketQua() {
      const n = mau.length, x = saved.xepDone ? saved.xepDung || 0 : null;
      let d = null, weak = new Set();
      if (saved.dich) {
        d = 0;
        mau.forEach((g, i) => {
          const it = saved.dich.items.find(y => y.so === i + 1), k = it ? it.ket_qua : "bo_trong";
          d += k === "dung" ? 1 : k === "gan_dung" ? 0.5 : 0;
          if (k !== "dung") weak.add(g);
        });
      }
      if (saved.xepDone) mau.forEach(g => { if (!xepDung(g)) weak.add(g); });
      const done = x !== null && d !== null;
      let h = `<div class="result"><div><span class="eyebrow">Kết quả</span><div class="score">${done ? `${x + d}/${2 * n} · ${Math.round(100 * (x + d) / (2 * n))}%` : "Chưa xong"}</div></div>
        <div class="parts"><span>Sắp xếp <b>${x === null ? "—" : `${x}/${n}`}</b></span><span>Dịch <b>${d === null ? "—" : `${d}/${n}`}</b></span></div>`;
      if (saved.dich && saved.dich.nhan_xet) h += `<div><span class="eyebrow">Nhận xét</span><div>${esc(saved.dich.nhan_xet)}</div></div>`;
      if (weak.size) h += `<div><span class="eyebrow">Mẫu nên ôn lại</span><div class="weak">${[...weak].map(g => `<a href="#bai-${g.bai}" title="${esc(g.p)}">${esc(g.id)}</a>`).join("")}</div></div>`;
      else if (done) h += `<div>Dùng đúng mọi mẫu ngữ pháp. Rất tốt!</div>`;
      h += `<div class="np-tools"><button class="btn" id="npLai" type="button">Làm lại với câu khác</button></div></div>`;
      document.getElementById("res").innerHTML = h;
      if (done) {
        saved.score = x + d; saved.done = true; save();
        document.querySelector("#res .result").insertAdjacentHTML("beforeend", runInfo(cfg.key, saved, 2 * n));
        // Đề ngữ pháp không bấm giờ: bỏ ô "Thời gian" của phần kết quả chung.
        document.querySelectorAll("#res .result .eyebrow").forEach(e => { if (e.textContent === "Thời gian") e.parentElement.remove(); });
        save();
      }
      document.getElementById("npLai").addEventListener("click", () => {
        store.set(cfg.key, { lan: saved.lan + 1 });
        deNguPhap(cfg);
      });
    }
    if (saved.xepDone) chamXep();
    if (saved.dich) veDich();
    if (saved.xepDone || saved.dich) ketQua();
  }
