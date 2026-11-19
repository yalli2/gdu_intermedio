/* 다인에듀 스페인어 — 학습 도우미 챗봇 (Profe Búho)
 * 1) 내장 모드: API 없이 동작 — 이 교재의 문법·어휘·예문 검색, 단원 안내, 시험 정보, 자주 묻는 문법 질문, 어휘 퀴즈
 * 2) AI 모드: assets/config.js 의 DAIN_CHAT.chatEndpoint 가 설정되면 AI 선생님이 자유 질문에 답변
 */
(function () {
  "use strict";
  const CFG = window.DAIN_CHAT || {};
  const AI_URL = (CFG.chatEndpoint || "").trim();
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const strip = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "");
  const low = s => strip(String(s).toLowerCase());
  const spk = t => `<button class="cb-spk" data-say="${esc(t)}" title="듣기">🔊</button>`;
  const unitLink = (n, label) => `<a class="cb-link" href="u${String(n).padStart(2, "0")}.html${label === "voc" ? "#voc" : "#gram"}">📘 Unidad ${n}로 이동</a>`;

  let KB = null, loading = null;
  function ensureKB() {
    if (KB) return Promise.resolve();
    if (!loading) loading = new Promise((ok, no) => {
      if (window.KB) { KB = window.KB; return ok(); }
      const s = document.createElement("script"); s.src = "assets/kb.js";
      s.onload = () => { KB = window.KB; ok(); }; s.onerror = no; document.head.appendChild(s);
    });
    return loading;
  }
  function curUnit() { const m = location.pathname.match(/u(\d+)\.html$/); return m ? +m[1] : null; }
  function curMock() { const m = location.pathname.match(/mock(\d)\.html$/); return m ? +m[1] : null; }

  /* ---------------- 자주 묻는 문법 질문 ---------------- */
  const FAQ = [
    { need: ["ser", "estar"], a: `**ser vs estar** — 둘 다 "~이다"지만 쓰임이 달라요.\n- **ser**: 변하지 않는 본질 — 국적·직업·성격·재료·시간 (Soy coreano. Son las tres.)\n- **estar**: 상태·위치·기분 — (Estoy cansado. Madrid está en España.)\n- "어디에 있다"는 항상 **estar**, 진행형도 **estar** + 현재분사.` },
    { need: ["점과거|부정과거|pretérito indefinido|preterito indefinido|indefinido", "불완료|imperfecto"], a: `**부정과거(점과거) vs 불완료과거**\n- **부정과거**: 한 번 일어나고 끝난 일 — Ayer **comí** paella.\n- **불완료과거**: 습관·배경·진행 중이던 일·나이·시간·날씨 — De niño **comía** mucho.\n- 함께: **Estaba** en casa cuando **llamaste**. (배경 + 사건)\n- 단서: ayer, el año pasado → 부정과거 / siempre, de niño, mientras → 불완료` },
    { need: ["현재완료|pretérito perfecto|he comido"], a: `**현재완료** = haber(he, has, ha, hemos, habéis, han) + 과거분사\n- 오늘·이번 주·지금까지의 경험: Hoy **he comido** mucho. ¿**Has estado** en Perú?\n- 불규칙 분사: abierto, dicho, escrito, hecho, puesto, roto, visto, vuelto\n- 스페인에서는 '오늘' 일에 현재완료, 중남미에서는 부정과거를 더 많이 써요.` },
    { need: ["접속법|subjuntivo"], a: `**접속법은 언제 쓸까?** 확실하지 않은 일, 바람·감정·의심·요구를 말할 때예요.\n- 구조: 주어1 + 동사 + **que** + 주어2 + **접속법** — Quiero que **vengas**.\n- 바람(querer, ojalá), 감정(me alegra que), 의심(dudo que, no creo que), 요구(pedir que), 가치판단(es importante que)\n- para que, antes de que, sin que, cuando(미래) 다음에도 접속법\n- 확신(creo que, es verdad que)은 **직설법**` },
    { need: ["por", "para"], a: `**por vs para**\n- **para**: 목적·목적지·기한·대상 — Estudio **para** aprobar. Salgo **para** Madrid. Es **para** ti.\n- **por**: 원인·경로·기간·교환·수단 — Gracias **por** todo. Paseo **por** el parque. Lo cambié **por** otro.` },
    { need: ["gustar|gusta|좋아하"], a: `**gustar 구조**: 좋아하는 대상이 문법상 주어예요.\n- (A mí) **me gusta** el café. / **Me gustan** los perros. / **Me gusta** bailar.\n- 단수 명사·동사원형 → gusta / 복수 명사 → gustan\n- 사람 이름에도 대명사 필수: A Ana **le** gustan los gatos.` },
    { need: ["재귀|reflexivo|se levanta|levantarse"], a: `**재귀동사**: 주어가 자기 자신에게 하는 동작\n- me levanto, te levantas, se levanta, nos levantamos, os levantáis, se levantan\n- 위치: 활용 동사 앞(Me ducho) 또는 원형·현재분사 뒤에 붙임(Voy a ducharme)` },
    { need: ["조건문|si절|가정|si tuviera|si hubiera"], a: `**조건문 3가지**\n- 실현 가능: Si **tengo** tiempo, **iré**. (si + 현재 → 미래/현재)\n- 현재 사실 반대: Si **tuviera** tiempo, **iría**. (si + 접속법 과거 → 조건법)\n- 과거 사실 반대: Si **hubiera tenido** tiempo, **habría ido**.\n- ⚠️ si 뒤에는 미래형·조건법을 쓰지 않아요.` },
    { need: ["간접화법|estilo indirecto|전달"], a: `**간접화법 시제 바꾸기** (전달 동사가 과거일 때)\n- 현재 → 불완료과거: «Estoy cansada» → Dijo que **estaba** cansada.\n- 미래 → 조건법: «Iré» → Dijo que **iría**.\n- 부정과거·현재완료 → 대과거: «Lo vi» → Dijo que lo **había visto**.\n- 명령 → que + 접속법 과거: «Ven» → Me pidió que **viniera**.` },
    { need: ["관사|el la|정관사|부정관사|성별|남성|여성"], a: `**명사의 성과 관사**\n- -o는 대개 남성(el libro), -a는 대개 여성(la casa)\n- 예외: el día, el mapa, el problema, la mano, la foto, la radio\n- 강세 있는 a-로 시작하는 여성 명사는 단수에서 **el**: el agua, el águila (복수는 las aguas)` },
    { need: ["명령|imperativo"], a: `**명령형과 대명사 위치**\n- 긍정 명령: 동사 **뒤에 붙이고** 강세 표시 — Dímelo. Siéntese.\n- 부정 명령: 동사 **앞에** — No me lo digas.\n- tú 불규칙 명령 8개: di, haz, sal, sé, ten, ve, ven, pon` },
    { need: ["악센트|강세 부호|tilde|입력|키보드"], a: `**악센트(á é í ó ú ñ) 입력**\n- Windows: 한/영 → 영어 상태에서 '스페인어' 키보드를 추가하면 ' 다음 모음으로 á를 입력할 수 있어요.\n- 휴대폰: 모음을 길게 누르면 á, é…가 나와요.\n- 이 사이트 채점에서 악센트만 틀리면 0.5점으로 처리돼요.` },
    { need: ["사용법|어떻게 써|채점|점수|진도|저장"], a: `**사이트 사용법**\n1. 목차에서 단원을 고르세요.\n2. 핵심 문법·어휘·예문을 읽고 🔊로 발음을 들어요.\n3. 연습 문제를 풀고 [채점하기] 또는 아래의 [전체 채점]을 눌러요.\n4. 최고 점수는 이 기기에 자동 저장되고 목차에 색깔 배지로 보여요.\n5. 마지막에는 최종 모의고사 4회로 실전 연습!` },
    { need: ["음성|소리|발음이 안|안 들려|목소리"], a: `**음성이 안 나오거나 어색할 때**\n- 오른쪽 위 **🔊 음성 설정**에서 다른 음성을 골라 보세요.\n- **Edge**(Natural 음성)나 **Chrome**(Google español)에서 가장 자연스러워요.\n- 기기 소리·무음 모드도 확인하세요.` },
  ];
  function bestFaq(q) {
    const lq = q.toLowerCase(); let best = null;
    FAQ.forEach(f => {
      if (!f.need.every(n => new RegExp(n, "i").test(lq))) return;
      const sc = f.need.length; if (!best || sc > best.sc) best = { f, sc };
    });
    return best && best.f;
  }
  function md(s) {
    return String(s).split("\n").map(l => {
      l = esc(l).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
      if (/^- /.test(l)) return `<li>${l.slice(2)}</li>`;
      if (/^\d+\. /.test(l)) return `<li>${l.replace(/^\d+\. /, "")}</li>`;
      if (/^#{1,3} /.test(l)) return `<p><b>${l.replace(/^#+ /, "")}</b></p>`;
      return l ? `<p>${l}</p>` : "";
    }).join("").replace(/(<li>.*?<\/li>)+/g, m => `<ul>${m}</ul>`);
  }

  /* ---------------- 검색 ---------------- */
  const STOPW = /^(은|는|이|가|을|를|뭐|뭐야|뭐예요|어떻게|알려|알려줘|줘|주세요|에요|요|좀|무엇|설명|설명해|해줘|차이|차이가|의|와|과|그리고|what|how|is|the|que|qué|es|el|la|de|en|y)$/;
  function terms(q) {
    return q.toLowerCase().replace(/[¿?¡!.,;:"'()·\/]/g, " ").split(/\s+/)
      .map(w => w.replace(/(은|는|이|가|을|를|와|과|의|에서|으로|로|에|도|만|이란|란|이에요|예요|이야|야)$/, ""))
      .filter(w => w.length >= 2 && !STOPW.test(w));
  }
  function searchGram(q) {
    const ts = terms(q).map(low); if (!ts.length) return [];
    const out = [];
    KB.units.forEach(u => u.gram.forEach(g => {
      const head = low(g.t + " " + u.t), body = low(g.b);
      let s = 0; ts.forEach(t => { if (head.includes(t)) s += 3; else if (body.includes(t)) s += 1; });
      if (s >= 2) out.push({ u, g, s });
    }));
    return out.sort((a, b) => b.s - a.s).slice(0, 3);
  }
  function searchVoc(q) {
    const ts = terms(q); if (!ts.length) return [];
    const out = []; const seen = new Set();
    KB.units.forEach(u => u.v.forEach(([es, ko]) => {
      const les = low(es), lko = ko.toLowerCase();
      ts.forEach(t => {
        const lt = low(t);
        const hit = (/[a-zñ]/.test(lt) && lt.length >= 3 && les.split(/[\s,\/]+/).some(w => w === lt || (lt.length >= 4 && w.startsWith(lt)))) || (/[가-힣]/.test(t) && t.length >= 2 && lko.includes(t));
        if (hit && !seen.has(es)) { seen.add(es); out.push({ es, ko, n: u.n }); }
      });
    }));
    return out.slice(0, 8);
  }
  function searchEx(q) {
    const ts = terms(q).map(t => t.toLowerCase()).filter(t => t.length >= 2); if (!ts.length) return [];
    const out = [];
    KB.units.forEach(u => (u.ex || []).forEach(([es, ko]) => {
      const les = low(es), lko = ko.toLowerCase();
      const hit = ts.some(t => /[가-힣]/.test(t) ? lko.includes(t) : (low(t).length >= 3 && les.split(/[\s,.¿?¡!]+/).some(w => w === low(t) || (low(t).length >= 4 && w.startsWith(low(t))))));
      if (hit) out.push({ es, ko, n: u.n });
    }));
    return out.slice(0, 4);
  }
  function exHTML(x) {
    return `<p class="cb-mute">교재 예문:</p><ul>${x.map(e => `<li><b>${esc(e.es)}</b> ${spk(e.es)}<br><span class="cb-mute">${esc(e.ko)} · <a class="cb-link" href="u${String(e.n).padStart(2, "0")}.html#ex">U${e.n}</a></span></li>`).join("")}</ul>`;
  }
  function snippet(t) { t = String(t).replace(/\*\*/g, ""); return t.length > 150 ? t.slice(0, 150) + "…" : t; }

  /* ---------------- 시험·교재 안내 ---------------- */
  function examInfo() {
    const g = KB.guide; if (!g) return null;
    let h = `<p><b>${esc(g.title)}</b></p>`;
    (g.tables || []).forEach(tb => {
      h += `<table class="cb-tbl">${tb.title ? `<tr><th colspan="${tb.head.length}">${esc(tb.title)}</th></tr>` : ""}<tr>${tb.head.map(x => `<th>${esc(x)}</th>`).join("")}</tr>${tb.rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</table>`;
      if (tb.note) h += `<p class="cb-mute">${esc(tb.note)}</p>`;
    });
    if (g.tips && g.tips.length) h += `<p><b>합격 전략</b></p><ul>${g.tips.slice(0, 4).map(t => `<li>${esc(t)}</li>`).join("")}</ul>`;
    return h + `<a class="cb-link" href="index.html">📗 교재 목차·시험 안내 보기</a>`;
  }
  function unitList() {
    return `<p><b>${esc(KB.title)}</b> 단원 목록이에요.</p><ul>${KB.units.map(u => `<li><a class="cb-link" href="u${String(u.n).padStart(2, "0")}.html">Unidad ${u.n}. ${esc(u.t)}</a></li>`).join("")}</ul><p class="cb-mute">최종 모의고사: ${[1, 2, 3, 4].map(n => `<a class="cb-link" href="mock${n}.html">${n}회</a>`).join(" · ")}</p>`;
  }

  /* ---------------- 어휘 퀴즈 ---------------- */
  let quiz = null;
  function startQuiz() {
    const cu = curUnit();
    const pool = (cu ? KB.units.filter(u => u.n === cu) : KB.units).flatMap(u => u.v.map(v => ({ es: v[0], ko: v[1], n: u.n })));
    if (!pool.length) return { html: "퀴즈를 낼 어휘가 없어요." };
    const it = pool[Math.floor(Math.random() * pool.length)];
    quiz = it;
    return { html: `🎯 <b>${esc(it.ko)}</b> — 스페인어로 쓰면? <span class="cb-mute">(Unidad ${it.n} · '그만'으로 종료)</span>` };
  }
  function checkQuiz(q) {
    if (/^(그만|stop|끝|종료)/.test(q.trim())) { quiz = null; return { html: "퀴즈를 마쳤어요. 수고했어요! 👏" }; }
    const ans = quiz.es.replace(/\(.*?\)/g, "").split(/\s*[\/,]\s*/).map(s => s.trim()).filter(Boolean);
    const n = s => s.toLowerCase().replace(/[¿?¡!.]/g, "").replace(/\s+/g, " ").trim();
    const ok = ans.some(a => n(a) === n(q) || n(a).replace(/^(el|la|los|las|un|una) /, "") === n(q));
    const acc = !ok && ans.some(a => strip(n(a)) === strip(n(q)) || strip(n(a)).replace(/^(el|la|los|las|un|una) /, "") === strip(n(q)));
    const msg = ok ? `✅ ¡Correcto! <b>${esc(quiz.es)}</b> ${spk(quiz.es)}` : acc ? `🟡 거의 맞았어요! 악센트 확인: <b>${esc(quiz.es)}</b> ${spk(quiz.es)}` : `❌ 정답은 <b>${esc(quiz.es)}</b> ${spk(quiz.es)}`;
    return { html: msg + '<hr class="cb-hr">' + startQuiz().html };
  }

  /* ---------------- 내장 답변 ---------------- */
  function helpText() {
    return `<p>¡Hola! 저는 <b>Profe Búho</b>, <b>${esc(KB ? KB.title : "이 교재")}</b> 학습 도우미예요 🦉</p><ul>
      <li>문법 질문: <i>접속법은 언제 써?</i>, <i>ser estar 차이</i></li>
      <li>단어 찾기: <i>viaje 뜻</i>, <i>'예약하다' 스페인어</i></li>
      <li>교재 안내: <i>단원 목록</i>, <i>시험 구성</i>, <i>Unidad 3</i></li>
      <li>연습: <i>퀴즈 내줘</i> (이 단원 어휘)</li></ul>` + (AI_URL ? '<p class="cb-mute">🤖 AI 선생님 모드가 켜져 있어 자유로운 질문·작문 첨삭에도 답해요.</p>' : "");
  }
  const CHIPS = () => `<div class="cb-chips">${["단원 목록", "시험 구성", "접속법은 언제 써?", "퀴즈 내줘"].map(x => `<button class="cb-chip" data-ask="${x}">${x}</button>`).join("")}</div>`;

  function answerOffline(q) {
    const lq = q.toLowerCase().trim();
    if (/퀴즈|quiz|문제\s*(내|줘)/.test(lq)) return startQuiz();
    if (/^(안녕|도움|help|hola|hi|hello|뭐\s*할\s*수)/.test(lq)) return { html: helpText() + CHIPS() };
    const um = lq.match(/(?:unidad|단원|유닛|unit|u)\s*(\d{1,2})|(\d{1,2})\s*(?:단원|과)/);
    if (um) { const n = +(um[1] || um[2]); const u = KB.units.find(x => x.n === n); if (u) return { html: `<p><b>Unidad ${n}. ${esc(u.t)}</b></p><ul>${u.goals.map(g => `<li>${esc(g)}</li>`).join("")}</ul><p class="cb-mute">문법: ${u.gram.map(g => esc(g.t)).join(" · ")}</p>${unitLink(n)}` }; }
    if (/단원\s*목록|목차|전체 단원|무슨 단원|units/.test(lq)) return { html: unitList() };
    if (/모의고사/.test(lq) && !/시험\s*(구성|형식)/.test(lq)) return { html: `<p>최종 모의고사는 4회 있어요. 실제 시험처럼 시간을 재고 풀어 보세요.</p><div class="cb-chips">${[1, 2, 3, 4].map(n => `<a class="cb-chip" href="mock${n}.html">${n}회</a>`).join("")}</div>` };
    if (/시험|구성|합격|몇\s*문항|시간|점수\s*기준|등급|dele|flex|snult/.test(lq) && !/접속법|과거|시제/.test(lq)) { const h = examInfo(); if (h) return { html: h }; }
    const f = bestFaq(q);
    if (f) return { html: md(f.a) };
    const v = searchVoc(q);
    const g = searchGram(q);
    const wantWord = /뜻|의미|스페인어로|스페인어|단어|어휘|meaning/.test(lq);
    if (wantWord && v.length) return { html: vocHTML(v) };
    if (wantWord) { const e = searchEx(q); if (e.length) return { html: `<p>어휘 목록에는 없지만 교재 예문에서 찾았어요.</p>` + exHTML(e) }; }
    if (g.length) return { html: `<p>교재에서 관련 문법을 찾았어요:</p>` + g.map(x => `<div class="cb-rule"><b>Unidad ${x.u.n} · ${esc(x.g.t)}</b><div class="cb-mute">${esc(snippet(x.g.b))}</div>${unitLink(x.u.n)}</div>`).join("") + (v.length ? vocHTML(v.slice(0, 4)) : "") };
    if (v.length) return { html: vocHTML(v) };
    const e2 = searchEx(q); if (e2.length) return { html: exHTML(e2) };
    return { html: `<p>음… 그 질문은 교재에서 찾지 못했어요 😅 이렇게 물어보세요:</p>${CHIPS()}` + (AI_URL ? "" : '<p class="cb-mute">자유로운 질문·작문 첨삭은 선생님이 AI 모드를 켜면 답할 수 있어요.</p>') };
  }
  function vocHTML(v) {
    return `<table class="cb-tbl"><tr><th>스페인어</th><th>뜻</th><th></th></tr>${v.map(x => `<tr><td><b>${esc(x.es)}</b> ${spk(x.es)}</td><td>${esc(x.ko)}</td><td><a class="cb-link" href="u${String(x.n).padStart(2, "0")}.html#voc">U${x.n}</a></td></tr>`).join("")}</table>`;
  }

  /* ---------------- AI 모드 ---------------- */
  const history = [];
  async function answerAI(q) {
    const cu = curUnit(), cm = curMock();
    let ctx = `교재: ${KB.title}`;
    if (cu) { const u = KB.units.find(x => x.n === cu); if (u) ctx += ` / Unidad ${cu} ${u.t} (문법: ${u.gram.map(g => g.t).join(", ")})`; }
    else if (cm) ctx += ` / 최종 모의고사 ${cm}회 풀이 중 — 정답을 바로 알려 주지 말 것`;
    else ctx += " / 목차 페이지";
    history.push({ role: "user", content: q.slice(0, 1200) });
    const res = await fetch(AI_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: history.slice(-10), context: ctx }) });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json(); const reply = (data.reply || "").trim();
    if (!reply) throw new Error("empty");
    history.push({ role: "assistant", content: reply });
    return { html: md(reply) };
  }

  /* ---------------- UI ---------------- */
  const css = document.createElement("style");
  css.textContent = `
  .cb-fab{position:fixed;right:20px;bottom:20px;z-index:75;width:60px;height:60px;border-radius:50%;border:0;background:var(--c,#2a6fdb);color:#fff;font-size:27px;box-shadow:0 10px 28px rgba(20,30,60,.3);cursor:pointer;transition:transform .15s}
  .cb-fab:hover{transform:scale(1.07)}
  .cb-fab .dot{position:absolute;right:4px;top:4px;width:14px;height:14px;border-radius:50%;background:#f2b705;border:2px solid #fff}
  body.has-sum .cb-fab{bottom:92px}
  .cb-panel{position:fixed;right:20px;bottom:92px;z-index:76;width:min(400px,calc(100vw - 24px));height:min(600px,calc(100vh - 120px));background:#fff;border-radius:18px;box-shadow:0 24px 70px rgba(0,0,0,.25);display:none;flex-direction:column;overflow:hidden;border:1px solid var(--line,#e3e7ef)}
  body.has-sum .cb-panel{bottom:164px;height:min(560px,calc(100vh - 190px))}
  .cb-panel.open{display:flex}
  .cb-head{display:flex;align-items:center;gap:10px;padding:12px 14px;background:var(--ink,#1d2433);color:#fff}
  .cb-head .av{width:36px;height:36px;border-radius:50%;background:#f2b705;display:grid;place-items:center;font-size:19px}
  .cb-head b{display:block;font-size:15px}.cb-head small{font-size:11.5px;opacity:.75}
  .cb-head button{margin-left:auto;background:transparent;border:0;color:#fff;font-size:22px;cursor:pointer}
  .cb-body{flex:1;overflow-y:auto;padding:14px;background:var(--bg,#f7f8fb);display:flex;flex-direction:column;gap:10px}
  .cb-msg{max-width:90%;padding:10px 13px;border-radius:14px;font-size:14.3px;line-height:1.55;word-break:break-word}
  .cb-msg p{margin:0 0 6px}.cb-msg p:last-child{margin:0}.cb-msg ul{margin:4px 0;padding-left:18px}
  .cb-bot{background:#fff;border:1px solid var(--line,#e3e7ef);align-self:flex-start;border-bottom-left-radius:4px}
  .cb-me{background:var(--c,#2a6fdb);color:#fff;align-self:flex-end;border-bottom-right-radius:4px}
  .cb-tbl{border-collapse:collapse;margin:4px 0;font-size:13px;width:100%}
  .cb-tbl th{background:var(--ink,#1d2433);color:#fff;padding:5px 7px;text-align:left;font-size:12.5px;border:0}
  .cb-tbl td{padding:4px 7px;border:0;border-bottom:1px solid #eef1f6}
  .cb-mute{color:var(--sub,#5b6475);font-size:12.5px}
  .cb-link{display:inline-block;margin-top:4px;font-size:12.5px;font-weight:700;color:var(--c,#2a6fdb)}
  .cb-rule{border-top:1px dashed #e3e7ef;padding-top:6px;margin-top:6px}
  .cb-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
  .cb-chip{border:1px solid #cfdcf3;background:var(--cl,#eef3fb);color:var(--c,#2a6fdb);border-radius:999px;padding:4px 10px;font-size:12.5px;cursor:pointer}
  .cb-spk{border:0;background:transparent;cursor:pointer;font-size:13px;padding:0 2px}
  .cb-hr{border:0;border-top:1px dashed #e3e7ef;margin:8px 0}
  .cb-typing{color:var(--sub,#5b6475);font-size:13px}
  .cb-foot{display:flex;gap:8px;padding:10px;border-top:1px solid var(--line,#e3e7ef);background:#fff}
  .cb-foot input{flex:1;min-width:0;border:1px solid var(--line,#e3e7ef);border-radius:12px;padding:10px 12px;font-size:15px;outline:none;font-family:inherit}
  .cb-foot input:focus{border-color:var(--c,#2a6fdb)}
  .cb-foot button{white-space:nowrap;border:0;background:var(--c,#2a6fdb);color:#fff;border-radius:12px;padding:0 16px;font-size:15px;font-weight:700;cursor:pointer}
  .cb-mode{display:flex;gap:6px;padding:6px 14px;background:#fff;border-bottom:1px solid var(--line,#e3e7ef);font-size:12px;align-items:center}
  .cb-mode button{border:1px solid var(--line,#e3e7ef);background:#fff;border-radius:999px;padding:3px 10px;font-size:12px;cursor:pointer}
  .cb-mode button.on{background:var(--ink,#1d2433);color:#fff;border-color:var(--ink,#1d2433)}
  @media (max-width:560px){.cb-panel,body.has-sum .cb-panel{right:8px;bottom:84px;height:calc(100vh - 100px)}.cb-fab{right:12px;bottom:12px}body.has-sum .cb-fab{bottom:120px}}
  @media print{.cb-fab,.cb-panel{display:none!important}}`;
  document.head.appendChild(css);

  function init() {
    if (document.getElementById("sum")) document.body.classList.add("has-sum");
    const fab = document.createElement("button");
    fab.className = "cb-fab"; fab.title = "질문하기 (학습 도우미)"; fab.setAttribute("aria-label", "학습 도우미 챗봇 열기");
    fab.innerHTML = '💬<span class="dot"></span>';
    const panel = document.createElement("div");
    panel.className = "cb-panel";
    panel.innerHTML = `<div class="cb-head"><div class="av">🦉</div><div><b>Profe Búho · 학습 도우미</b><small>${AI_URL ? "AI 선생님 + 교재 검색" : "교재 검색 · 문법 안내 · 어휘 퀴즈"}</small></div><button aria-label="닫기">×</button></div>
      ${AI_URL ? '<div class="cb-mode">답변 방식: <button data-m="ai" class="on">🤖 AI 선생님</button><button data-m="dict">📖 교재 검색</button></div>' : ""}
      <div class="cb-body"></div>
      <form class="cb-foot"><input placeholder="예: 접속법은 언제 써? / viaje 뜻" autocomplete="off" maxlength="600"><button>보내기</button></form>`;
    document.body.appendChild(fab); document.body.appendChild(panel);
    const body = panel.querySelector(".cb-body"), input = panel.querySelector("input");
    let mode = AI_URL ? "ai" : "dict", started = false;
    const add = (html, who) => { const d = document.createElement("div"); d.className = "cb-msg " + (who === "me" ? "cb-me" : "cb-bot"); d.innerHTML = html; body.appendChild(d); body.scrollTop = body.scrollHeight; return d; };
    async function ask(q) {
      q = q.trim(); if (!q) return;
      add(esc(q), "me"); input.value = "";
      const wait = add('<span class="cb-typing">생각 중…</span>');
      try {
        await ensureKB();
        let r;
        if (quiz) r = checkQuiz(q);
        else if (mode === "ai" && AI_URL && !/퀴즈|quiz|단원\s*목록|목차/.test(q)) {
          try { r = await answerAI(q); } catch (e) { r = answerOffline(q); r.html = '<p class="cb-mute">(AI 연결이 원활하지 않아 교재 검색으로 답해요)</p>' + r.html; }
        } else r = answerOffline(q);
        wait.innerHTML = r.html;
      } catch (e) { wait.innerHTML = "자료를 불러오지 못했어요. 인터넷 연결을 확인해 주세요."; }
      body.scrollTop = body.scrollHeight;
    }
    function open() {
      panel.classList.add("open"); fab.querySelector(".dot").style.display = "none";
      if (!started) { started = true; ensureKB().then(() => add(helpText() + CHIPS())).catch(() => add("자료를 불러오지 못했어요.")); }
      setTimeout(() => input.focus(), 50);
    }
    fab.addEventListener("click", () => panel.classList.contains("open") ? panel.classList.remove("open") : open());
    panel.querySelector(".cb-head button").addEventListener("click", () => panel.classList.remove("open"));
    panel.querySelector("form").addEventListener("submit", e => { e.preventDefault(); ask(input.value); });
    body.addEventListener("click", e => { const c = e.target.closest("[data-ask]"); if (c) { e.preventDefault(); ask(c.dataset.ask); } });
    panel.querySelectorAll(".cb-mode button").forEach(b => b.addEventListener("click", () => { mode = b.dataset.m; panel.querySelectorAll(".cb-mode button").forEach(x => x.classList.toggle("on", x === b)); }));
    window.DainChat = { open, ask };
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
