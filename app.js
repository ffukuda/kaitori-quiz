(function(){
"use strict";
const app = document.getElementById("app");
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));
const MARK = ["A","B","C","D"];
const SRC = window.KQ_SOURCES, CATS = window.KQ_CATS;

/* ================= 合言葉 ================= */
const PASS_HASH = "f4e49411084b4a00e6fb371524c608a9294999207c07fdd4240e0047c2b21b0a"; // 「kaitoritest」のSHA-256
const AUTH_KEY = "kq-auth";
const store = {
  get(k){ try { return localStorage.getItem(k); } catch(e) { return null; } },
  set(k,v){ try { localStorage.setItem(k,v); } catch(e) {} }
};
async function sha256(s){
  if (window.crypto && crypto.subtle) {
    const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
    return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2,"0")).join("");
  }
  return s === "kaitoritest" ? PASS_HASH : "";
}
function gate(){
  app.innerHTML = `<form class="panel gate" id="gate"><h2>合言葉を入れてください</h2>
    <p class="muted">社内のスタッフ向けのページです。一度入れると、この端末では次から聞かれません。</p>
    <div class="inp"><input id="pw" type="password" autocomplete="current-password" placeholder="合言葉" aria-label="合言葉"></div>
    <p class="err" id="err" role="alert"></p><button class="btn" type="submit">はじめる</button></form>`;
  const pw = document.getElementById("pw"); pw.focus();
  document.getElementById("gate").onsubmit = async e => {
    e.preventDefault();
    if (await sha256(pw.value.trim()) === PASS_HASH) { store.set(AUTH_KEY, PASS_HASH); start(); }
    else document.getElementById("err").textContent = "合言葉がちがいます。";
  };
}

/* ================= 文字の正規化（表記ゆれ対策） ================= */
function norm(s){
  let t = String(s).normalize("NFKC").toLowerCase();
  t = t.replace(/[ぁ-ゖ]/g, c => String.fromCharCode(c.charCodeAt(0) + 0x60)); // ひらがな→カタカナ
  t = t.replace(/ヴァ/g,"バ").replace(/ヴィ/g,"ビ").replace(/ヴェ/g,"ベ").replace(/ヴォ/g,"ボ").replace(/ヴ/g,"ブ");
  t = t.replace(/ii/g,"2").replace(/[\s・･\-‐－—ー〜~（）()「」『』\[\]【】.,、。'’"“”&＆+＋/／:：!！?？]/g,"");
  t = t.replace(/円|以内|以下|間|か月|ヶ月|ヵ月|カ月/g, m => m === "か月"||m==="ヶ月"||m==="ヵ月"||m==="カ月" ? "カ月" : "");
  return t;
}
const normRef = s => String(s).normalize("NFKC").toUpperCase().replace(/[^0-9A-Z]/g,"");
const BRAND_ALIAS = {
  "ルイ・ヴィトン":["ルイヴィトン","ヴィトン","lv","louisvuitton"], "エルメス":["hermes"], "シャネル":["chanel"],
  "ロレックス":["rolex"], "カルティエ":["cartier"], "オーデマ・ピゲ":["オーデマピゲ","ap"], "パテックフィリップ":["パテック"],
  "オメガ":["omega"], "タグ・ホイヤー":["タグホイヤー","タグ"], "ブライトリング":[], "ゼニス":[], "オリス":[], "ベル＆ロス":["ベルロス","ベルアンドロス"],
  "モーリスラクロア":[], "グラハム":[], "IWC":[], "ブルガリ":[], "プラダ":["prada"], "フェンディ":[], "バレンシアガ":[], "ディオール":["クリスチャンディオール"],
  "ミュウミュウ":["miumiu"], "クロエ":[], "ロエベ":[], "サルヴァトーレ・フェラガモ":["フェラガモ"], "サントリー":[], "フェンダー":[], "ギブソン":[]
};
function brandForms(b){ return b ? [b, ...(BRAND_ALIAS[b]||[])].map(norm).sort((x,y) => y.length - x.length) : []; }
const ALL_BRANDS = Object.keys(BRAND_ALIAS).flatMap(brandForms).sort((x,y) => y.length - x.length);
function stripBrands(t){ ALL_BRANDS.forEach(b => { if (b.length >= 2) t = t.split(b).join(""); }); return t; }

/* ================= 問題の組み立て ================= */
function hash(s){let h=2166136261;for(const ch of s){h^=ch.codePointAt(0);h=Math.imul(h,16777619)}return h>>>0}
function rng(seed){return()=>{seed=(seed+0x6D2B79F5)|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function seededShuffle(a, key){ const r = rng(hash(key)); a = a.slice(); for (let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]} return a; }
const shuffle = a => { a = a.slice(); for (let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]} return a; };
const pick = (a,n) => shuffle(a).slice(0,n);

const BIG = ["ルイ・ヴィトン","エルメス","シャネル"];
const ALL = [];
window.KQ_PHOTO_SETS.forEach(set => set.items.forEach((it, i) => {
  const [name, brand="", ref="", note="", ...rest] = it;
  const opt = (rest.length && typeof rest[rest.length-1] === "object") ? rest.pop() : {};
  const alts = rest.concat(opt.alt || []);
  const n = String(i+1).padStart(2,"0");
  const q = { id:`${set.src}-s${set.s}-${n}`, cat:set.cat, src:set.src, img:`img/${set.src}-s${set.s}-${n}.jpg`,
    name, brand, ref, note, alts, q: opt.q || set.prompt };
  if (set.cat === "bag") q.g = BIG.includes(brand) ? brand : "その他のブランド";
  else if (set.cat === "line") q.g = brand;
  else if (set.cat === "logo") q.g = "ブランドロゴ";
  else if (set.cat === "watch") q.g = brand === "ロレックス" ? "ロレックス" : "ロレックス以外";
  else q.g = opt.g || "その他";
  q.askBrand = !!brand && /ブランド|メーカー/.test(q.q) && set.cat !== "other";
  q.label = q.askBrand ? `${brand}　${name}` : name;
  const cr = (window.KQ_CREDITS || {})[q.id];
  if (cr) { q.img = `img/wiki/${q.id}.jpg`; q.credit = cr; }
  ALL.push(q);
}));
window.KQ_LAW.forEach(l => {
  ALL.push({ id:"law-" + hash(l.q).toString(36), cat:"law", g:l.g, q:l.q, name:l.a, label:l.a, c:l.c, keys:l.keys, alts:l.alt||[], note:l.note||"", srcs:l.src||[], law:true });
});
// 4択の選択肢（問題ごとに固定）
ALL.forEach(q => {
  let opts;
  if (q.law) opts = q.c.slice();
  else {
    const same = ALL.filter(o => o !== q && !o.law && o.cat === q.cat && o.g === q.g);
    const wide = ALL.filter(o => o !== q && !o.law && o.cat === q.cat);
    const seen = new Set([norm(q.label)]); opts = [q.label];
    for (const o of seededShuffle(same, q.id).concat(seededShuffle(wide, q.id+"w"))) {
      const k = norm(o.label); if (seen.has(k) || norm(o.name) === norm(q.name)) continue;
      seen.add(k); opts.push(o.label); if (opts.length === 4) break;
    }
  }
  const keep = opts.length <= 2 || opts.every(c => /\d/.test(c));
  q.choices = keep ? opts : seededShuffle(opts, q.id + "c");
  q.ans = q.choices.indexOf(q.label);
});

/* ステージ：カテゴリ → グループ → 14問以内ずつ */
const STAGES = [];
CATS.forEach(cat => {
  const qs = ALL.filter(q => q.cat === cat.id);
  const groups = [...new Set(qs.map(q => q.g))];
  cat.stages = [];
  groups.forEach(g => {
    const gq = qs.filter(q => q.g === g);
    const parts = Math.ceil(gq.length / 14);
    for (let p = 0; p < parts; p++) {
      const sq = gq.slice(Math.floor(p*gq.length/parts), Math.floor((p+1)*gq.length/parts));
      const st = { id:`${cat.id}-${hash(g)}-${p+1}`, cat, title: parts > 1 ? `${g}（${p+1}）` : g, qs:sq };
      sq.forEach(q => q.stage = st);
      cat.stages.push(st); STAGES.push(st);
    }
  });
});

/* ================= ランク ================= */
const RANKS = {
  easy:{ name:"初級", desc:"4択で答える" },
  mid: { name:"中級", desc:"入力で答える（頭文字のヒントあり）" },
  hard:{ name:"上級", desc:"ヒントなしで入力。ブランド・型番まで" }
};

/* ================= 記録 ================= */
const KEY = "kaitori-quiz-v1";
let S = { rank:"easy", best:{easy:{},mid:{},hard:{}}, wrong:{}, answered:0, correct:0 };
try { const raw = store.get(KEY); if (raw) { const o = JSON.parse(raw); S = Object.assign(S, o); S.best = Object.assign({easy:{},mid:{},hard:{}}, o.best||{}); } } catch(e) {}
const save = () => store.set(KEY, JSON.stringify(S));
const best = st => S.best[S.rank][st.id];
const cleared = st => { const b = best(st); return b !== undefined && b/st.qs.length >= 0.8; };

/* ================= 採点 ================= */
function judge(q, text, refText, rank){
  const t = norm(text);
  if (!t) return false;
  if (q.law) {
    if ([q.name, ...q.alts].some(a => norm(a) === t)) return true;
    return q.keys.every(k => t.includes(norm(k)));
  }
  if (q.cat === "logo") return [q.name, ...q.alts].some(a => norm(a) === t || norm(a) === stripBrands(t) || t.includes(norm(a)) && norm(a).length >= 3);
  if (rank === "hard" && q.askBrand && q.cat !== "logo" && !brandForms(q.brand).some(b => t.includes(b))) return false;
  const body = stripBrands(t);
  const ok = [q.name, ...q.alts].some(a => { const n = stripBrands(norm(a)); return n && (n === body || n === t); });
  if (!ok) return false;
  if (rank === "hard" && q.ref) return normRef(refText) === normRef(q.ref.replace(/\s.*$/,"")) || normRef(refText) === normRef(q.ref);
  return true;
}
function hintFor(q){
  const a = q.name.replace(/\s/g,"");
  return [`頭文字「${a[0]}」`, `${[...a].length}文字`];
}

/* ================= 共通の部品 ================= */
function photoHTML(q){ return q.img ? `<figure class="photo" data-zoom="${q.id}"><img src="${q.img}" alt="問題の写真" decoding="async"></figure>` : ""; }
function srcText(q){ return q.law ? (q.srcs.length ? "出典：" + q.srcs.map(s => SRC[s]).join("・") : "") : "出典：" + SRC[q.src] + "のテスト"; }
function factsHTML(q){
  if (q.law) return "";
  const rows = [];
  if (q.brand && q.cat !== "logo") rows.push(["ブランド", q.brand]);
  rows.push([q.cat === "logo" ? "ブランド" : "名称", q.name]);
  if (q.ref) rows.push(["型番", q.ref]);
  return `<dl class="facts">${rows.map(r => `<dt>${esc(r[0])}</dt><dd>${esc(r[1])}</dd>`).join("")}</dl>`;
}
function creditHTML(q){
  const c = q.credit; if (!c) return "";
  const lic = c.licUrl ? `<a href="${esc(c.licUrl)}" target="_blank" rel="noopener">${esc(c.lic)}</a>` : esc(c.lic);
  return `<div class="credit">写真：${c.by ? esc(c.by) + "・" : ""}${lic}${c.mod ? "・" + esc(c.mod) : ""}（<a href="${esc(c.url)}" target="_blank" rel="noopener">Wikimedia Commons</a>）</div>`;
}
function explainHTML(q){
  return `${factsHTML(q)}${q.note ? `<div class="tip"><b>メモ</b>${esc(q.note)}</div>` : ""}<div class="src">${esc(srcText(q))}・${esc(q.stage.cat.title)}／${esc(q.stage.title)}</div>${creditHTML(q)}`;
}
function answerText(q){ return q.law ? q.name : (q.askBrand ? `${q.brand} ${q.name}` : q.name) + (q.ref && S.rank === "hard" ? `（型番 ${q.ref}）` : ""); }
function lightbox(q){
  const lb = document.createElement("div"); lb.className = "lightbox";
  lb.innerHTML = `<img src="${q.img}" alt=""><div class="cap">${esc(q.brand && q.cat!=="logo" ? q.brand+"　" : "")}<b>${esc(q.name)}</b>${q.ref?`<br>型番：${esc(q.ref)}`:""}<br><span style="font-size:12px">${esc(SRC[q.src])}・タップで閉じる</span>${creditHTML(q)}</div>`;
  lb.onclick = () => lb.remove(); document.body.appendChild(lb);
}
function photoOnly(q){
  const lb = document.createElement("div"); lb.className = "lightbox";
  lb.innerHTML = `<img src="${q.img}" alt=""><div class="cap" style="font-size:12px">タップで閉じる</div>`;
  lb.onclick = () => lb.remove(); document.body.appendChild(lb);
}
let keyHandler = null;
document.addEventListener("keydown", e => { if (keyHandler && !e.repeat) keyHandler(e); });

/* ================= 画面切り替え ================= */
function shell(active, body){
  keyHandler = null;
  app.innerHTML = `<nav class="nav" aria-label="表示切替">
    ${[["home","ステージ"],["zukan","図鑑"],["glos","用語集"]].map(([k,t]) => `<button data-nav="${k}" aria-pressed="${active===k}">${t}</button>`).join("")}
  </nav>${body}`;
  app.querySelectorAll("[data-nav]").forEach(b => b.onclick = () => ({home, zukan, glos:glossary})[b.dataset.nav]());
  window.scrollTo(0,0);
}

/* ================= ホーム ================= */
function home(){
  const total = STAGES.length, done = STAGES.filter(cleared).length;
  const wrongN = Object.keys(S.wrong).filter(id => ALL.some(q => q.id === id)).length;
  const rate = S.answered ? Math.round(S.correct/S.answered*100) : null;
  let h = `<section class="panel" aria-label="ランクと記録">
    <div class="ranks" role="group" aria-label="ランク">${Object.entries(RANKS).map(([k,r]) => `<button class="rank" data-rank="${k}" aria-pressed="${S.rank===k}"><b>${r.name}</b><small>${r.desc}</small></button>`).join("")}</div>
    <div class="prog-top"><span>${RANKS[S.rank].name}でクリアしたステージ</span><b>${done} / ${total}</b></div>
    <div class="bar"><i style="width:${total?done/total*100:0}%"></i></div>
    <div class="muted">正答率 ${rate===null?"—":rate+"％"}（これまで${S.answered}問）・収録 ${ALL.length}問</div>
    <div class="row"><button class="btn sub" id="go-wrong" ${wrongN?"":"disabled"}>苦手を復習 ${wrongN}問</button><button class="btn sub" id="go-mix">ランダム10問</button></div>
    <button class="linkbtn" id="reset">記録をリセットする</button><div id="confirm"></div>
  </section>
  <details class="guide" ${S.answered?"":"open"}><summary>使い方</summary><ol>
    <li>まず上で<b>ランク</b>を選びます。初級は4択、中級は入力（ヒントあり）、上級はヒントなしの入力で、時計は型番まで答えます。</li>
    <li>ステージごとに<b>「挑戦」</b>で解きます。8割以上正解でクリア。クリア記録はランクごとに残ります。</li>
    <li><b>「一問一答」</b>は答えを思い浮かべてからめくる暗記用です。まちがえた問題は<b>「苦手を復習」</b>にたまります。</li>
    <li><b>「図鑑」</b>で写真を見比べ、<b>「用語集」</b>で型番・年代・ブランドなどを種類ごとに調べられます。</li>
    <li>入力で表記ゆれ（例：ヴィトン／ビトン）は正解扱いになります。正しいのに不正解になったら「正解にする」を押してください。</li></ol></details>`;
  const next = STAGES.find(st => !cleared(st));
  if (next) h += `<section class="next"><div><small>${done?"次はここから":"まずはここから"}</small><b>${esc(next.cat.title)}｜${esc(next.title)}</b><span class="muted">${next.qs.length}問・${RANKS[S.rank].name}</span></div><button class="btn" data-quiz="${next.id}">はじめる</button></section>`;
  h += `<nav class="toc" aria-label="カテゴリへ移動">${CATS.map(c => `<a href="#cat-${c.id}" class="${c.stages.every(cleared)?"done":""}">${esc(c.title)}</a>`).join("")}</nav>`;
  CATS.forEach(cat => {
    const cd = cat.stages.filter(cleared).length;
    h += `<section class="chapter" id="cat-${cat.id}"><div class="ch-head"><h2>${esc(cat.title)}</h2><span class="meta">クリア ${cd}/${cat.stages.length}</span></div>`;
    cat.stages.forEach(st => {
      const b = best(st);
      const badge = b===undefined ? `<span class="badge">未挑戦</span>` : b===st.qs.length ? `<span class="badge perfect">全問正解</span>` : cleared(st) ? `<span class="badge clear">クリア ${b}/${st.qs.length}</span>` : `<span class="badge">最高 ${b}/${st.qs.length}</span>`;
      const ph = st.qs.find(q => q.img);
      h += `<div class="stage ${cleared(st)?"done":""} ${st===next?"is-next":""}">${ph?`<img class="st-ph" src="${ph.img}" alt="" loading="lazy">`:`<span class="st-ph txt">法</span>`}
        <div class="st-body"><h3>${esc(st.title)}</h3><div class="st-meta"><span>${st.qs.length}問</span>${badge}</div></div>
        <div class="st-act"><button class="btn" data-quiz="${st.id}">挑戦</button><button class="btn sub" data-card="${st.id}">一問一答</button></div></div>`;
    });
    h += `</section>`;
  });
  h += `<p class="foot">記録はこの端末のブラウザに保存されます。問題は社内の月次テスト（${Object.values(SRC).join("・")}）から作っています。</p>`;
  shell("home", h);
  app.querySelectorAll("[data-rank]").forEach(b => b.onclick = () => { S.rank = b.dataset.rank; save(); home(); });
  app.querySelectorAll("[data-quiz]").forEach(b => b.onclick = () => startStage(b.dataset.quiz, "quiz"));
  app.querySelectorAll("[data-card]").forEach(b => b.onclick = () => startStage(b.dataset.card, "card"));
  const gw = document.getElementById("go-wrong"); if (gw) gw.onclick = () => play({ title:"苦手の復習", qs:shuffle(ALL.filter(q => S.wrong[q.id])), mode:"quiz", review:true });
  document.getElementById("go-mix").onclick = () => play({ title:"全範囲ランダム10問", qs:pick(ALL,10), mode:"quiz" });
  document.getElementById("reset").onclick = () => {
    document.getElementById("confirm").innerHTML = `<div class="confirm"><span>この端末のクリア記録・正答率・苦手リストをすべて消します。元に戻せません。</span><div class="row"><button class="btn sub" id="rs-no">やめる</button><button class="btn" id="rs-yes">すべて消す</button></div></div>`;
    document.getElementById("rs-no").onclick = () => document.getElementById("confirm").innerHTML = "";
    document.getElementById("rs-yes").onclick = () => { S = { rank:S.rank, best:{easy:{},mid:{},hard:{}}, wrong:{}, answered:0, correct:0 }; save(); home(); };
  };
}
function startStage(id, mode){ const st = STAGES.find(s => s.id === id); play({ title:`${st.cat.title}｜${st.title}`, qs:shuffle(st.qs), key:st.id, stage:st, mode }); }

/* ================= 出題 ================= */
function play(run){ run.i = 0; run.score = 0; run.streak = 0; run.missed = []; run.rank = S.rank; (run.mode === "card" ? cardStep : quizStep)(run); }
function header(run){
  return `<div class="playbar"><button class="linkbtn" id="quit">← やめる</button><span class="ttl">${esc(run.title)}</span><span class="count">${run.i+1} / ${run.qs.length}</span></div>
  <div class="bar"><i style="width:${run.i/run.qs.length*100}%"></i></div>`;
}
function bindCommon(){
  document.getElementById("quit").onclick = home;
  app.querySelectorAll("[data-zoom]").forEach(f => f.onclick = () => { const q = ALL.find(x => x.id === f.dataset.zoom); photoOnly(q); });
}
function record(run, q, ok){
  S.answered++;
  if (ok) { S.correct++; run.score++; run.streak++; if (run.review) delete S.wrong[q.id]; }
  else { S.wrong[q.id] = 1; run.streak = 0; run.missed.push(q); }
  save();
}
function quizStep(run){
  if (run.i >= run.qs.length) return result(run);
  const q = run.qs[run.i], rank = run.rank;
  const useChoices = rank === "easy";
  const needRef = rank === "hard" && q.ref;
  let input;
  if (useChoices) input = `<div class="choices">${q.choices.map((c,i) => `<button class="choice" data-i="${i}"><span class="k">${MARK[i]}</span><span>${esc(c)}</span></button>`).join("")}</div>`;
  else input = `<form class="inp" id="ans" autocomplete="off">
      ${rank === "mid" ? `<div class="hint">${hintFor(q).map(h => `<span>${esc(h)}</span>`).join("")}${q.askBrand?`<span>ブランドは入れなくてもOK</span>`:""}</div>` : (q.askBrand ? `<div class="hint"><span>ブランド名も入れて答える</span></div>` : "")}
      <label for="a1">${rank === "hard" && q.askBrand ? "ブランド（メーカー）と名称" : "答え"}</label><input id="a1" enterkeyhint="${needRef?"next":"done"}" autocapitalize="off">
      ${needRef ? `<label for="a2">型番</label><input id="a2" inputmode="text" autocapitalize="characters" enterkeyhint="done">` : ""}
      <button class="btn" type="submit">答える</button>
      <button class="linkbtn" type="button" id="giveup">わからない（答えを見る）</button></form>`;
  app.innerHTML = header(run) + `<section class="card"><div class="qlabel"><span class="rk">${RANKS[rank].name}</span>第${run.i+1}問${run.streak>=3?`<span class="streak">${run.streak}問連続正解中</span>`:""}</div>
    <p class="q">${esc(q.q)}</p>${photoHTML(q)}${input}<div id="fb"></div></section>`;
  bindCommon();
  const feedback = (ok, yours) => {
    record(run, q, ok);
    document.getElementById("fb").innerHTML = `<div class="explain"><div class="verdict ${ok?"ok":"ng"}">${ok?"正解！":"ざんねん…"}</div>
      ${ok ? "" : `<div class="answer">正解は「${esc(answerText(q))}」</div>${yours?`<div class="yours">あなたの答え：${esc(yours)}</div>`:""}`}
      ${explainHTML(q)}
      <div class="row">${!ok && !useChoices && yours ? `<button class="btn sub" id="override">正解にする（表記ちがい）</button>` : ""}<button class="btn" id="next">${run.i+1<run.qs.length?"次の問題へ":"結果を見る"}</button></div></div>`;
    const nx = document.getElementById("next"); nx.focus({preventScroll:true}); nx.scrollIntoView({block:"nearest",behavior:"smooth"});
    nx.onclick = () => { run.i++; quizStep(run); };
    const ov = document.getElementById("override");
    if (ov) ov.onclick = () => { S.correct++; run.score++; run.streak++; delete S.wrong[q.id]; run.missed = run.missed.filter(x => x !== q); save(); ov.disabled = true; ov.textContent = "正解にしました"; };
  };
  if (useChoices) {
    const btns = [...app.querySelectorAll(".choice")];
    const answer = i => {
      if (btns[0].disabled) return;
      btns.forEach((b,j) => { b.disabled = true; b.classList.add(j===q.ans ? "correct" : j===i ? "wrong" : "dim"); });
      feedback(i === q.ans);
    };
    btns.forEach((b,i) => b.onclick = () => answer(i));
    keyHandler = e => { const n = parseInt(e.key,10); if (n>=1 && n<=btns.length) answer(n-1); };
  } else {
    const f = document.getElementById("ans"), a1 = document.getElementById("a1"), a2 = document.getElementById("a2");
    if (matchMedia("(hover:hover)").matches) a1.focus({preventScroll:true});
    if (a2) a1.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); a2.focus(); } });
    const lock = () => { f.querySelectorAll("input,button").forEach(x => x.disabled = true); };
    f.onsubmit = e => { e.preventDefault(); if (a1.disabled) return; if (!a1.value.trim()) { a1.focus(); return; }
      const ok = judge(q, a1.value, a2 ? a2.value : "", rank); lock(); feedback(ok, a1.value + (a2 && a2.value ? `／型番 ${a2.value}` : "")); };
    document.getElementById("giveup").onclick = () => { if (a1.disabled) return; lock(); feedback(false, ""); };
  }
}
function cardStep(run){
  if (run.i >= run.qs.length) return result(run);
  const q = run.qs[run.i];
  app.innerHTML = header(run) + `<section class="card"><div class="qlabel">一問一答・第${run.i+1}問</div>
    <p class="q">${esc(q.q)}</p>${photoHTML(q)}
    <div id="back"><button class="btn" id="flip" style="width:100%">答えを見る</button><p class="flip-hint">頭の中で答えてから押してください</p></div></section>`;
  bindCommon();
  const flip = () => {
    document.getElementById("back").innerHTML = `<div class="reveal explain"><div class="answer" style="font-size:21px">答え：${esc(q.law ? q.name : (q.brand && q.cat!=="logo" && q.cat!=="other" ? q.brand+" " : "") + q.name)}</div>${explainHTML(q)}
      <div class="row"><button class="btn sub" id="no">まだ覚えていない</button><button class="btn" id="yes">覚えた</button></div></div>`;
    const go = ok => { S.answered++; if (ok) { S.correct++; run.score++; delete S.wrong[q.id]; } else { S.wrong[q.id] = 1; run.missed.push(q); } save(); run.i++; cardStep(run); };
    document.getElementById("yes").onclick = () => go(true);
    document.getElementById("no").onclick = () => go(false);
    document.getElementById("yes").focus({preventScroll:true});
  };
  document.getElementById("flip").onclick = flip;
  keyHandler = e => { if ((e.key === " " || e.key === "Enter") && document.getElementById("flip")) { e.preventDefault(); flip(); } };
}
function result(run){
  keyHandler = null;
  const n = run.qs.length, s = run.score, pct = n ? s/n : 0, card = run.mode === "card";
  if (run.key && !card && (S.best[run.rank][run.key] === undefined || s > S.best[run.rank][run.key])) { S.best[run.rank][run.key] = s; save(); }
  const msg = card ? `覚えた問題 ${s}問。「まだ」の問題は「苦手を復習」から何度でも出せます。`
    : pct === 1 ? "パーフェクト！ このステージは完璧です。" : pct >= 0.8 ? `合格！ ${RANKS[run.rank].name}でステージクリアです。` : "あと少し。8割以上正解でクリアです。";
  const idx = run.stage ? STAGES.indexOf(run.stage) : -1, next = idx >= 0 ? STAGES[idx+1] : null;
  app.innerHTML = `<section class="card result"><div class="qlabel">${esc(run.title)}</div>
    <div class="score">${s}<small> / ${n}</small></div><p class="rmsg">${msg}</p>
    <div class="row" style="width:100%">${!card && pct>=0.8 && next ? `<button class="btn" id="r-next">次のステージへ</button>` : `<button class="btn" id="r-again">もう一度</button>`}${run.missed.length && run.missed.length < n ? `<button class="btn sub" id="r-miss">まちがえた${run.missed.length}問だけ</button>` : ""}<button class="btn sub" id="r-home">ステージ一覧へ</button></div>
    ${run.missed.length ? `<div class="missed"><h3>${card?"まだの問題":"まちがえた問題"}（${run.missed.length}）</h3>${run.missed.map(q => `<div class="miss">${q.img?`<img src="${q.img}" alt="">`:""}<div>${esc(q.q)}<br><b>答え：${esc(answerText(q))}</b></div></div>`).join("")}</div>` : ""}
  </section>`;
  const nx = document.getElementById("r-next"); if (nx) nx.onclick = () => startStage(next.id, "quiz");
  const ag = document.getElementById("r-again"); if (ag) ag.onclick = () => play(Object.assign(run, { qs: run.review ? shuffle(ALL.filter(q => S.wrong[q.id])) : shuffle(run.qs) }));
  document.getElementById("r-home").onclick = home;
  const rm = document.getElementById("r-miss"); if (rm) rm.onclick = () => play({ title: run.title + "（まちがえた問題）", qs: shuffle(run.missed), mode: run.mode, review:true });
  window.scrollTo(0,0);
}

/* ================= 図鑑 ================= */
let zState = { cat:"bag", g:"すべて", kw:"" };
function zukan(){
  const cats = CATS.filter(c => c.id !== "law");
  const qs = ALL.filter(q => q.cat === zState.cat && q.img);
  const groups = ["すべて", ...new Set(qs.map(q => q.cat==="other" ? q.g : (q.brand || q.g)))];
  if (!groups.includes(zState.g)) zState.g = "すべて";
  shell("zukan", `<div class="seg" role="tablist">${cats.map(c => `<button role="tab" data-zc="${c.id}" aria-selected="${zState.cat===c.id}">${esc(c.short)}</button>`).join("")}</div>
    <div class="chips">${groups.map(g => `<button class="chip" data-zg="${esc(g)}" aria-pressed="${zState.g===g}">${esc(g)}</button>`).join("")}</div>
    <input class="search" id="zkw" type="search" placeholder="名前・型番で探す" value="${esc(zState.kw)}" aria-label="図鑑を検索">
    <div class="zgrid" id="zg"></div>`);
  const render = () => {
    const kw = norm(zState.kw);
    const list = qs.filter(q => (zState.g === "すべて" || (q.cat==="other" ? q.g : (q.brand||q.g)) === zState.g) && (!kw || norm(q.name+q.brand+q.ref+q.alts.join("")).includes(kw) || normRef(q.ref).includes(normRef(zState.kw)) && normRef(zState.kw)));
    const seen = new Set();
    document.getElementById("zg").innerHTML = list.length ? list.map(q => { seen.add(q.id); return `<button class="zcard" data-zq="${q.id}"><img src="${q.img}" alt="" loading="lazy"><div><b>${esc(q.name)}</b>${q.brand && q.cat!=="logo" ? esc(q.brand)+"<br>" : ""}${q.ref?`型番 ${esc(q.ref)}<br>`:""}<span class="muted" style="font-size:12px">${esc(SRC[q.src])}</span></div></button>`; }).join("") : `<p class="muted">見つかりませんでした。</p>`;
    document.querySelectorAll("[data-zq]").forEach(b => b.onclick = () => lightbox(ALL.find(q => q.id === b.dataset.zq)));
  };
  app.querySelectorAll("[data-zc]").forEach(b => b.onclick = () => { zState = { cat:b.dataset.zc, g:"すべて", kw:"" }; zukan(); });
  app.querySelectorAll("[data-zg]").forEach(b => b.onclick = () => { zState.g = b.dataset.zg; zukan(); });
  const inp = document.getElementById("zkw"); inp.oninput = () => { zState.kw = inp.value; render(); };
  render();
}

/* ================= 用語集（種類ごと） ================= */
function buildGlossary(){
  const G = {};
  // 型番
  const refs = {};
  ALL.filter(q => q.ref).forEach(q => { const k = q.ref; (refs[k] = refs[k] || []).push(q); });
  G["型番"] = Object.keys(refs).sort((a,b) => a.localeCompare(b,"ja",{numeric:true})).map(k => {
    const q = refs[k][0];
    return { t:k, d:`${q.brand} ${q.name}${q.note && !/PDF/.test(q.note) ? "（"+q.note+"）" : ""}`, img:q.img, q, srcs:[...new Set(refs[k].map(x => SRC[x.src]))] };
  });
  G["年代・世代"] = window.KQ_GLOSSARY["年代・世代"];
  // ブランド・モデル名
  const models = {};
  ALL.filter(q => q.brand && (q.cat === "bag" || q.cat === "watch")).forEach(q => { (models[q.brand] = models[q.brand] || new Map()).set(q.name, q); });
  G["ブランド・モデル名"] = Object.keys(models).map(b => ({ t:b, d:[...models[b].keys()].join("、"), img:[...models[b].values()][0].img }));
  // ライン・素材
  const lines = new Map(); ALL.filter(q => q.cat === "line").forEach(q => { if (!lines.has(q.name)) lines.set(q.name, q); });
  G["ライン・素材"] = [...lines.values()].map(q => ({ t:q.name, d:q.brand + "のライン（素材・柄）", img:q.img, q }));
  // ロゴ
  G["ブランドロゴ"] = ALL.filter(q => q.cat === "logo").map(q => ({ t:q.name, d:q.note || "ブランドロゴの問題で出題", img:q.img, q }));
  // その他の商材はグループごと
  const others = {};
  ALL.filter(q => q.cat === "other").forEach(q => { (others[q.g] = others[q.g] || []).push(q); });
  const manual = window.KQ_GLOSSARY["骨董・刀剣・茶道具"] || [];
  Object.keys(others).forEach(g => {
    G[g] = others[g].map(q => { const m = manual.find(x => x.t.startsWith(q.name)); return { t:q.name + (q.brand ? `（${q.brand}）` : ""), d: m ? m.d : (q.note || ""), img:q.img, q }; });
  });
  return G;
}
let GLOS = null, gState = { tab:"型番", kw:"" };
function glossary(){
  GLOS = GLOS || buildGlossary();
  const tabs = Object.keys(GLOS);
  shell("glos", `<div class="chips" role="group" aria-label="用語の種類">${tabs.map(t => `<button class="chip" data-gt="${esc(t)}" aria-pressed="${gState.tab===t}">${esc(t)}</button>`).join("")}</div>
    <input class="search" id="gkw" type="search" placeholder="「${esc(gState.tab)}」の中を探す" value="${esc(gState.kw)}" aria-label="用語を検索">
    <div class="glos" id="gl"></div>`);
  const render = () => {
    const kw = norm(gState.kw);
    const list = GLOS[gState.tab].filter(g => !kw || norm(g.t + g.d).includes(kw));
    document.getElementById("gl").innerHTML = list.length ? list.map((g,i) => `<div class="term">${g.img?`<img src="${g.img}" alt="" loading="lazy" data-gi="${i}">`:""}<div><h3>${esc(g.t)}</h3><p>${esc(g.d)}</p>${g.srcs?`<div class="src">${esc(g.srcs.join("・"))}</div>`:""}</div></div>`).join("") : `<p class="muted">見つかりませんでした。</p>`;
    document.querySelectorAll("[data-gi]").forEach(im => im.onclick = () => { const g = list[+im.dataset.gi]; if (g.q) lightbox(g.q); else photoOnly({img:g.img}); });
  };
  app.querySelectorAll("[data-gt]").forEach(b => b.onclick = () => { gState = { tab:b.dataset.gt, kw:"" }; glossary(); });
  const inp = document.getElementById("gkw"); inp.oninput = () => { gState.kw = inp.value; render(); };
  render();
}

/* ================= 起動 ================= */
function start(){ home(); }
if (store.get(AUTH_KEY) === PASS_HASH) start(); else gate();
window.KQ = { ALL, STAGES, judge, norm };
})();
