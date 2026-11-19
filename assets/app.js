/* 다인에듀 스페인어 학습 사이트 — 공통 스크립트
   음성(TTS) · 연습문제 렌더링 · 채점 · 진도 저장 */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const LET = "abcdefghij";
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  /* ===================================================== 음성 (TTS) */
  const synth = window.speechSynthesis;
  const FEMALE = /elvira|ximena|dalia|paulina|m[oó]nica|helena|laura|luc[ií]a|abril|elena|sabina|marisol|paloma|esperanza|irene|estrella|triana|vera|beatriz|candela|larissa|camila|valentina|catalina|salome|renata|female|mujer|teresa|isabel|angelica|marta|nuria|carmen|sof[ií]a|lupe|penelope|conchita|soledad|carlota|francisca|gabriela|belkys|yolanda|elena|karla|maria|andrea|ana\b/i;
  const MALE = /[aá]lvaro|jorge|pablo|juan|diego|arnau|enrique|gerardo|ra[uú]l|dario|tom[aá]s|alonso|jos[eé]|liberto|saul|teo|nil|gonzalo|emilio|lorenzo|mateo|sebasti[aá]n|andr[eé]s|carlos|alex|rodrigo|federico|jaime|cristian|male|hombre|miguel|antonio|eduardo|manuel|lucas|thiago|javier|mario|rafael|victor|arturo|elias|jorge|reed|grandpa|eddy|rocko/i;
  let VOICES = [];
  const tts = store.get("dain:tts", { accent: "auto", voice: "", rate: 0.92 });

  function scoreVoice(v) {
    let s = 0; const n = v.name;
    if (/natural|neural/i.test(n)) s += 60;
    if (/online/i.test(n)) s += 25;
    if (/premium|enhanced|mejorad/i.test(n)) s += 45;
    if (/google/i.test(n)) s += 35;
    if (/microsoft/i.test(n) && !/online|natural/i.test(n)) s += 5;
    if (/eloquence|compact|espeak/i.test(n)) s -= 40;
    const L = (v.lang || "").replace("_", "-").toLowerCase();
    if (tts.accent === "es" && L === "es-es") s += 30;
    if (tts.accent === "la" && /es-(mx|us|419|co|ar|cl|pe)/.test(L)) s += 30;
    if (tts.accent === "auto" && (L === "es-es" || L === "es-mx")) s += 10;
    if (v.localService === false) s += 3;
    return s;
  }
  function loadVoices() {
    if (!synth) return;
    VOICES = synth.getVoices().filter(v => /^es/i.test(v.lang)).sort((a, b) => scoreVoice(b) - scoreVoice(a));
    fillVoiceSelect();
  }
  if (synth) { loadVoices(); synth.onvoiceschanged = loadVoices; }
  function gender(v) { return FEMALE.test(v.name) ? "f" : MALE.test(v.name) ? "m" : "?"; }
  function pickVoice(g) {
    if (!VOICES.length) return null;
    if (tts.voice && !g) { const v = VOICES.find(x => x.name === tts.voice); if (v) return v; }
    const main = (tts.voice && VOICES.find(x => x.name === tts.voice)) || VOICES[0];
    if (!g) return main;
    const best = VOICES.filter(v => gender(v) === g).sort((a, b) => scoreVoice(b) - scoreVoice(a));
    // 같은 억양에서 해당 성별 음성 우선
    const sameLang = best.find(v => v.lang === main.lang);
    return sameLang || best[0] || main;
  }
  function cleanForSpeech(t) {
    return String(t)
      .replace(/<[^>]+>/g, " ")
      .replace(/\*\*?/g, "")
      .replace(/_{2,}/g, " … ")
      .replace(/[ㄱ-ㆎ가-힣]+[^\n.,;:!?¿¡]*/g, " ")
      .replace(/[→·•★🎧]/g, " ")
      .replace(/\s+/g, " ").trim();
  }
  let speakingBtn = null;
  function stopSpeak() {
    if (synth) synth.cancel();
    if (speakingBtn) { speakingBtn.classList.remove("on"); speakingBtn = null; }
  }
  function speakSegments(segs, btn) {
    if (!synth) { if (btn) btn.title = "이 브라우저는 음성 기능을 지원하지 않습니다. Chrome 또는 Edge를 사용해 주세요."; return; }
    if (btn && btn === speakingBtn) { stopSpeak(); return; }
    stopSpeak();
    if (!VOICES.length) loadVoices();
    speakingBtn = btn || null; if (btn) btn.classList.add("on");
    const only = VOICES.length < 2 || !VOICES.some(v => gender(v) === "m") || !VOICES.some(v => gender(v) === "f");
    segs = segs.map(s => ({ ...s, text: cleanForSpeech(s.text) })).filter(s => s.text);
    segs.forEach((s, i) => {
      const u = new SpeechSynthesisUtterance(s.text);
      const v = pickVoice(s.g);
      if (v) { u.voice = v; u.lang = v.lang; } else u.lang = "es-ES";
      u.rate = tts.rate * (s.slow ? 0.85 : 1);
      if (only && s.g) u.pitch = s.g === "f" ? 1.18 : 0.82;
      if (i === segs.length - 1) u.onend = u.onerror = () => { if (speakingBtn === btn) stopSpeak(); };
      synth.speak(u);
    });
  }
  window.speakText = (t, btn, g) => speakSegments([{ text: t, g: g || null }], btn);

  const F_LABEL = /^(MUJER|SECRETARIA|RECEPCIONISTA|DEPENDIENTA|ALUMNA|CLIENTA|SEÑORA|MADRE|MAMÁ|ABUELA|DOCTORA|PROFESORA|ENFERMERA|CAMARERA|A)$/;
  const M_LABEL = /^(HOMBRE|SEÑOR|PADRE|PAPÁ|ABUELO|DOCTOR|PROFESOR|CAMARERO|CLIENTE|ALUMNO|EMPLEADO|B|PERIODISTA)$/;
  function labelGender(lab) {
    const L = lab.toUpperCase().trim();
    if (F_LABEL.test(L)) return "f";
    if (M_LABEL.test(L)) return "m";
    if (/^(BEATRIZ|CARMEN|PILAR|RAQUEL|INÉS|ISABEL|MERCEDES|NURIA|LUZ|BEGOÑA|MAITE)$/.test(L)) return "f";
    if (/A$/.test(L) && !/^(LUCA|BAUTISTA)$/.test(L)) return "f";
    return "m";
  }
  function parseScript(script) {
    const segs = [];
    String(script).split(/\n+/).forEach(line => {
      line = line.trim(); if (!line) return;
      line = line.replace(/^\[[^\]]*\]\s*/, "").replace(/^\d+(-\d+)?\.\s*/, "");
      // A: ... B: ... 가 한 줄에 여러 번
      const multi = line.split(/\s(?=(?:[A-ZÁÉÍÓÚÑ]{1,15}):\s)/);
      multi.forEach(part => {
        const m = part.match(/^([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ ]{0,18}):\s*(.*)$/);
        if (m) { segs.push({ text: m[2], g: labelGender(m[1]) }); return; }
        if (/—/.test(part)) {
          const bits = part.split(/\s*—\s*/).filter(Boolean);
          bits.forEach((b, i) => segs.push({ text: b, g: i % 2 === 0 ? "f" : "m" }));
          return;
        }
        segs.push({ text: part, g: null });
      });
    });
    const nul = segs.filter(x => x.g === null);
    if (nul.length > 1) nul.forEach((x, i) => (x.g = i % 2 ? "m" : "f"));
    return segs;
  }
  window._parseScript = parseScript;
  window.speakScript = (script, btn) => speakSegments(parseScript(script), btn);

  /* ---- 음성 설정 패널 */
  function fillVoiceSelect() {
    const sel = $("#vsel"); if (!sel) return;
    sel.innerHTML = '<option value="">자동 (가장 자연스러운 음성)</option>' +
      VOICES.map(v => `<option value="${v.name}">${v.name} · ${v.lang}</option>`).join("");
    sel.value = tts.voice || "";
    const info = $("#vinfo");
    if (info) {
      const v = pickVoice();
      info.textContent = v ? `현재 음성: ${v.name} (${v.lang})` : "스페인어 음성을 찾지 못했습니다. Chrome·Edge·Safari 최신 버전을 사용해 주세요.";
      const nat = VOICES.some(v => /natural|online|google|premium|enhanced/i.test(v.name));
      $("#vtip").style.display = nat ? "none" : "block";
    }
  }
  function initSettings() {
    const btn = $("#vbtn"), pnl = $("#vpanel"); if (!btn) return;
    btn.onclick = () => { pnl.classList.toggle("open"); fillVoiceSelect(); };
    $("#vclose").onclick = () => pnl.classList.remove("open");
    $$("input[name=acc]").forEach(r => { r.checked = r.value === tts.accent; r.onchange = () => { tts.accent = r.value; tts.voice = ""; store.set("dain:tts", tts); loadVoices(); }; });
    const rate = $("#vrate"); rate.value = tts.rate; $("#vrateval").textContent = tts.rate + "×";
    rate.oninput = () => { tts.rate = +rate.value; $("#vrateval").textContent = tts.rate + "×"; store.set("dain:tts", tts); };
    $("#vsel").onchange = e => { tts.voice = e.target.value; store.set("dain:tts", tts); fillVoiceSelect(); };
    $("#vtest").onclick = e => speakScript("MUJER: ¡Hola! Bienvenidos a la clase de español de Dain Edu.\nHOMBRE: Vamos a practicar juntos. ¡Mucho ánimo!", e.currentTarget);
  }

  /* ===================================================== 유틸 */
  function norm(s) {
    return String(s).normalize("NFC").toLowerCase()
      .replace(/[¿?¡!.,;:«»"“”'‘’()…\-–—]/g, " ").replace(/\s+/g, " ").trim();
  }
  const noAcc = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
  function matchAns(input, alts) {
    const n = norm(input);
    if (!n) return 0;
    if (alts.some(a => norm(a) === n)) return 1;
    if (alts.some(a => noAcc(norm(a)) === noAcc(n))) return 0.5;
    return 0;
  }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const speakerBtn = (t, extra = "") => `<button class="spk ${extra}" data-say="${esc(t)}" title="듣기" aria-label="듣기">🔊</button>`;

  /* ===================================================== 연습문제 렌더링 */
  function passageHTML(d) {
    if (!d.text) return "";
    return d.text.map(p => `<div class="passage">${p.t ? `<div class="pt">${p.t}</div>` : ""}<div class="pb">${p.h}</div>
      <button class="mini" data-say="${esc(p.s)}">🔊 지문 듣기</button></div>`).join("");
  }
  function drillHTML(d, idx) {
    const id = "d" + idx;
    let b = `<section class="drill" id="${id}" data-i="${idx}">
      <header class="dh">${d.label ? `<span class="lab">${d.label}</span>` : ""}<h3><span class="no">${d.no}</span> ${d.instr}</h3></header>`;
    b += passageHTML(d);
    const st = d.start || 1;
    if (d.k === "listen" || d.k === "lmatch") {
      b += `<div class="listen"><button class="play" data-script="${idx}">▶ 음성 듣기</button>
        <span class="muted">실제 시험처럼 2번 들은 뒤 답을 고르세요. 대본은 채점 후 열 수 있습니다.</span></div>`;
    }
    if (d.k === "mc" || d.k === "listen") {
      b += `<ol class="items" start="${st}">` + d.items.map((it, j) => `<li class="it" data-j="${j}">
        ${it.q ? `<div class="q">${it.q}</div>` : ""}
        <div class="opts">${it.o.map((o, k) => `<label class="opt"><input type="radio" name="${id}_${j}" value="${k}"><span class="ol">${LET[k]}</span><span>${o}</span></label>`).join("")}</div>
        <div class="fb"></div></li>`).join("") + "</ol>";
    } else if (d.k === "match" || d.k === "lmatch") {
      b += `<div class="optbox">${d.options.map(o => `<div><b>${o.l}</b><span>${o.h}</span></div>`).join("")}</div>`;
      b += `<ol class="items" start="${st}">` + d.items.map((it, j) => `<li class="it row" data-j="${j}">
        <div class="q">${it.q}</div>
        <select><option value="">선택</option>${d.options.map(o => `<option value="${o.l}">${o.l}</option>`).join("")}</select>
        <div class="fb"></div></li>`).join("") + "</ol>";
    } else if (d.k === "fill") {
      b += `<ol class="items" start="${st}">` + d.items.map((it, j) => {
        let q = it.q, n = 0;
        if (it.nb > 0) q = q.replace(/\{\{B\}\}/g, () => `<input class="blank" data-b="${n++}" autocomplete="off" spellcheck="false">`);
        else q = `<div class="q">${q}</div><input class="blank wide" data-b="0" autocomplete="off" spellcheck="false" placeholder="여기에 쓰세요">`;
        return `<li class="it" data-j="${j}"><div class="q">${q}</div><div class="fb"></div></li>`;
      }).join("") + "</ol>";
    } else if (d.k === "trans") {
      b += `<ol class="items">` + d.items.map((it, j) => `<li class="it" data-j="${j}">
        <div class="q">${it.q}</div>
        <textarea rows="2" class="ta" spellcheck="false" placeholder="스페인어로 쓰세요"></textarea>
        <div class="fb"></div></li>`).join("") + "</ol>";
    } else if (d.k === "write") {
      b += `<div class="prompt">${d.prompt}</div>${d.words ? `<div class="muted">분량: ${d.words}</div>` : ""}
        <textarea class="ta big" rows="8" spellcheck="false" placeholder="여기에 작성하세요"></textarea>
        <div class="wc muted">0단어</div>`;
    } else if (d.k === "speak") {
      b += `<div class="prompt">${d.prompt}</div>
        <div class="rec"><button class="mic">🎤 말하기 (음성 인식)</button><span class="muted">마이크로 말하면 스페인어로 받아 적어 줍니다.</span></div>
        <textarea class="ta big" rows="5" spellcheck="false" placeholder="말한 내용이 여기에 표시됩니다. 직접 메모해도 됩니다."></textarea>`;
    }
    const scored = ["mc", "listen", "match", "lmatch", "fill", "trans"].includes(d.k);
    b += `<footer class="df">
      ${scored ? `<button class="chk">채점하기</button>` : `<button class="model">모범 답안 보기</button>`}
      <button class="rst ghost">다시 풀기</button>
      <span class="score"></span></footer>
      <div class="reveal"></div></section>`;
    return b;
  }

  /* ===================================================== 채점 */
  const RESULTS = {};
  function check(sec, d, idx, silent) {
    let got = 0, tot = 0;
    const its = $$(".it", sec);
    if (d.k === "mc" || d.k === "listen") {
      its.forEach((li, j) => {
        tot++;
        const c = $("input:checked", li), a = d.items[j].a;
        $$(".opt", li).forEach((o, k) => { o.classList.toggle("right", k === a); o.classList.toggle("wrong", c && +c.value === k && k !== a); });
        const ok = c && +c.value === a; if (ok) got++;
        li.classList.toggle("ok", !!ok); li.classList.toggle("ng", !ok);
        $(".fb", li).innerHTML = ok ? "✔ 정답" : `✘ 정답: <b>${LET[a]}</b>`;
      });
    } else if (d.k === "match" || d.k === "lmatch") {
      its.forEach((li, j) => {
        tot++; const v = $("select", li).value, a = d.items[j].a, ok = v === a; if (ok) got++;
        li.classList.toggle("ok", ok); li.classList.toggle("ng", !ok);
        $(".fb", li).innerHTML = ok ? "✔" : `✘ 정답: <b>${a}</b>`;
      });
    } else if (d.k === "fill") {
      its.forEach((li, j) => {
        const it = d.items[j]; tot++;
        const ins = $$("input.blank", li);
        let pts;
        if (it.self) { pts = null; }
        else {
          const scores = ins.map((inp, k) => {
            const s = matchAns(inp.value, it.alts[k] || it.alts[0]);
            inp.classList.toggle("right", s === 1); inp.classList.toggle("half", s === 0.5); inp.classList.toggle("wrong", s === 0);
            return s;
          });
          pts = scores.reduce((a, b) => a + b, 0) / scores.length;
        }
        if (pts === null) {
          $(".fb", li).innerHTML = `정답: <b>${it.ans}</b> <span class="selfq">맞았나요? <button class="sy">O</button><button class="sn">X</button></span>`;
          const fb = $(".fb", li);
          li.dataset.pts = li.dataset.pts || "0";
          $(".sy", fb).onclick = () => { li.dataset.pts = "1"; li.className = "it ok"; recount(sec, d, idx); };
          $(".sn", fb).onclick = () => { li.dataset.pts = "0"; li.className = "it ng"; recount(sec, d, idx); };
          got += +li.dataset.pts;
        } else {
          got += pts; li.dataset.pts = pts;
          li.classList.toggle("ok", pts === 1); li.classList.toggle("ng", pts < 1);
          $(".fb", li).innerHTML = pts === 1 ? "✔ 정답" : (pts > 0 ? `△ 강세 부호·철자를 확인하세요. 정답: <b>${it.ans}</b>` : `✘ 정답: <b>${it.ans}</b>`);
        }
      });
    } else if (d.k === "trans") {
      its.forEach((li, j) => {
        const it = d.items[j]; tot++;
        const v = $("textarea", li).value; const s = matchAns(v, it.alts);
        const fb = $(".fb", li);
        if (s === 1) { li.dataset.pts = 1; li.className = "it ok"; fb.innerHTML = `✔ 모범 답안과 같습니다. ${speakerBtn(it.ans)}`; }
        else {
          if (li.dataset.self === undefined) li.dataset.pts = 0;
          fb.innerHTML = `모범 답안: <b>${it.ans}</b> ${speakerBtn(it.ans)}
            <span class="selfq">의미와 문법이 맞으면 인정하세요 → <button class="sy">맞음</button><button class="sn">틀림</button></span>`;
          $(".sy", fb).onclick = () => { li.dataset.pts = 1; li.dataset.self = 1; li.className = "it ok"; recount(sec, d, idx); };
          $(".sn", fb).onclick = () => { li.dataset.pts = 0; li.dataset.self = 1; li.className = "it ng"; recount(sec, d, idx); };
          li.className = "it ng";
        }
        got += +li.dataset.pts;
      });
    }
    // 대본 공개
    if (d.script) $(".reveal", sec).innerHTML = `<details><summary>📄 듣기 대본 보기</summary><div class="script">${d.scriptH}</div></details>`;
    RESULTS[idx] = { got, tot };
    $(".score", sec).textContent = `${fmt(got)} / ${tot}점`;
    sec.classList.add("checked");
    if (!silent) updateSummary();
  }
  function recount(sec, d, idx) {
    const its = $$(".it", sec); const got = its.reduce((a, li) => a + (+li.dataset.pts || 0), 0);
    RESULTS[idx] = { got, tot: its.length }; $(".score", sec).textContent = `${fmt(got)} / ${its.length}점`; updateSummary();
  }
  const fmt = x => (Math.round(x * 10) / 10).toString();
  function showModel(sec, d) {
    const r = $(".reveal", sec);
    r.innerHTML = `<div class="modelbox"><div class="mh"><b>${d.k === "speak" ? "모범 답변" : "모범 답안"}</b>
      <button class="mini" data-say="${esc(d.modelS)}">🔊 원어민 음성으로 듣기</button></div>${d.model}</div>`;
  }
  function resetDrill(sec, d, idx) {
    $$("input[type=radio]", sec).forEach(i => (i.checked = false));
    $$("select", sec).forEach(s => (s.value = ""));
    $$("input.blank, textarea", sec).forEach(i => { i.value = ""; i.className = i.className.replace(/\b(right|wrong|half)\b/g, ""); });
    $$(".opt", sec).forEach(o => o.classList.remove("right", "wrong"));
    $$(".it", sec).forEach(li => { li.className = "it" + (li.classList.contains("row") ? " row" : ""); li.dataset.pts = ""; delete li.dataset.self; });
    $$(".fb", sec).forEach(f => (f.innerHTML = ""));
    $(".reveal", sec).innerHTML = ""; $(".score", sec).textContent = "";
    sec.classList.remove("checked"); delete RESULTS[idx]; updateSummary();
  }

  /* ===================================================== 요약·진도 */
  let PAGE = null;
  function updateSummary() {
    const box = $("#sum"); if (!box || !PAGE) return;
    let got = 0, tot = 0;
    Object.values(RESULTS).forEach(r => { got += r.got; tot += r.tot; });
    const all = PAGE.drills.filter(d => ["mc", "listen", "match", "lmatch", "fill", "trans"].includes(d.k)).reduce((a, d) => a + d.items.length, 0);
    const pct = all ? Math.round((got / all) * 100) : 0;
    $("#sumtxt").innerHTML = `채점한 문항 <b>${tot}</b> / ${all} · 점수 <b>${fmt(got)}</b>점 · 정답률 <b>${tot ? Math.round(got / tot * 100) : 0}%</b>`;
    $("#sumbar").style.width = (all ? (tot / all) * 100 : 0) + "%";
    if (PAGE.sections) {
      $$(".secscore").forEach(el => {
        const ids = el.dataset.ids.split(",").map(Number); let g = 0, t = 0, a = 0;
        ids.forEach(i => { const d = PAGE.drills[i]; if (["mc", "listen", "match", "lmatch", "fill", "trans"].includes(d.k)) a += d.items.length; if (RESULTS[i]) { g += RESULTS[i].got; t += RESULTS[i].tot; } });
        el.textContent = a ? `${fmt(g)} / ${a}` : "";
      });
    }
    if (tot && tot === all) {
      const key = "dain:" + PAGE.key; const best = store.get(key, 0);
      if (pct > best) store.set(key, pct);
      $("#sumbest").textContent = `최고 기록 ${Math.max(pct, best)}%`;
    } else {
      const best = store.get("dain:" + PAGE.key, null);
      $("#sumbest").textContent = best !== null ? `최고 기록 ${best}%` : "";
    }
  }

  /* ===================================================== 페이지 초기화 */
  function initPage() {
    PAGE = window.PAGE; if (!PAGE) return;
    const root = $("#exercises");
    if (PAGE.sections) {
      root.innerHTML = PAGE.sections.map(s => `<div class="sechead" id="${s.id}"><h2>${s.name}</h2>
        <div class="sectools">${s.min ? `<button class="timer ghost" data-min="${s.min}">⏱ ${s.min}:00 시작</button>` : ""}<span class="secscore" data-ids="${s.ids.join(",")}"></span></div></div>
        ${s.note ? `<p class="muted">${s.note}</p>` : ""}${s.ids.map(i => drillHTML(PAGE.drills[i], i)).join("")}`).join("");
    } else {
      root.innerHTML = PAGE.drills.map((d, i) => drillHTML(d, i)).join("");
    }
    $$(".drill", root).forEach(sec => {
      const idx = +sec.dataset.i, d = PAGE.drills[idx];
      const c = $(".chk", sec); if (c) c.onclick = () => check(sec, d, idx);
      const m = $(".model", sec); if (m) m.onclick = () => showModel(sec, d);
      $(".rst", sec).onclick = () => resetDrill(sec, d, idx);
      const p = $(".play", sec); if (p) p.onclick = () => speakScript(d.script, p);
      const ta = $("textarea.big", sec), wc = $(".wc", sec);
      if (ta && wc) ta.oninput = () => (wc.textContent = (ta.value.trim() ? ta.value.trim().split(/\s+/).length : 0) + "단어");
      const mic = $(".mic", sec); if (mic) initMic(mic, $("textarea", sec));
    });
    const all = $("#checkall"); if (all) all.onclick = () => {
      $$(".drill", root).forEach(sec => { const idx = +sec.dataset.i, d = PAGE.drills[idx]; if ($(".chk", sec)) check(sec, d, idx, true); });
      updateSummary(); $("#sum").scrollIntoView({ behavior: "smooth", block: "nearest" });
    };
    const ra = $("#resetall"); if (ra) { let armed = null; ra.onclick = () => {
      if (!armed) { ra.textContent = "한 번 더 누르면 모두 지워요"; armed = setTimeout(() => { armed = null; ra.textContent = "모두 지우기"; }, 3000); return; }
      clearTimeout(armed); armed = null; ra.textContent = "모두 지우기";
      $$(".drill", root).forEach(sec => resetDrill(sec, PAGE.drills[+sec.dataset.i], +sec.dataset.i)); }; }
    $$(".timer").forEach(initTimer);
    updateSummary();
  }
  function initTimer(btn) {
    let left = +btn.dataset.min * 60, h = null;
    const show = () => (btn.textContent = `⏱ ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}` + (h ? " · 일시정지" : " 시작"));
    btn.onclick = () => {
      if (h) { clearInterval(h); h = null; show(); return; }
      h = setInterval(() => { left--; show(); if (left <= 0) { clearInterval(h); h = null; btn.textContent = "⏰ 시간 종료"; btn.classList.add("over"); } }, 1000); show();
    };
  }
  function initMic(btn, ta) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { btn.disabled = true; btn.title = "Chrome 또는 Edge에서 사용할 수 있습니다."; btn.textContent = "🎤 음성 인식 미지원 브라우저"; return; }
    let rec = null;
    btn.onclick = () => {
      if (rec) { rec.stop(); return; }
      rec = new SR(); rec.lang = (pickVoice() || {}).lang || "es-ES"; rec.interimResults = true; rec.continuous = true;
      const base = ta.value ? ta.value + " " : "";
      rec.onresult = e => { let t = ""; for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript; ta.value = base + t; };
      rec.onend = () => { rec = null; btn.classList.remove("on"); btn.textContent = "🎤 말하기 (음성 인식)"; };
      rec.start(); btn.classList.add("on"); btn.textContent = "⏹ 그만 말하기";
    };
  }

  /* ---- 전역: 🔊 버튼, 진도 표시, 검색 */
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-say]"); if (b) { e.preventDefault(); speakText(b.dataset.say, b); }
  });
  function initProgress() {
    $$("[data-prog]").forEach(el => {
      const v = store.get("dain:" + el.dataset.prog, null);
      if (v !== null) { el.textContent = v + "%"; el.classList.add(v >= 80 ? "good" : v >= 50 ? "mid" : "low"); }
    });
  }
  function initSearch() {
    const q = $("#q"); if (!q) return;
    const run = () => {
      const t = norm(q.value), cat = ($(".cat.on") || {}).dataset ? $(".cat.on").dataset.cat : "all";
      $$(".bookrow").forEach(row => {
        const okCat = cat === "all" || row.dataset.cat === cat;
        let any = false;
        $$(".uchip", row).forEach(c => { const hit = !t || noAcc(norm(c.dataset.s)).includes(noAcc(t)); c.style.display = hit ? "" : "none"; if (hit) any = true; });
        const titleHit = !t || noAcc(norm(row.dataset.s)).includes(noAcc(t));
        if (titleHit && t) $$(".uchip", row).forEach(c => (c.style.display = ""));
        row.style.display = okCat && (any || titleHit) ? "" : "none";
      });
    };
    q.oninput = run;
    $$(".cat").forEach(c => (c.onclick = () => { $$(".cat").forEach(x => x.classList.remove("on")); c.classList.add("on"); run(); }));
  }
  /* ---- 뜻 가리기 · 해석 가리기 (상태는 다른 단원에서도 유지) */
  function initHide() {
    const tgs = $$("[data-hide]"); if (!tgs.length) return;
    const st = store.get("dain:hide", { mn: false, ko: false });
    const apply = () => {
      document.body.classList.toggle("hide-mn", !!st.mn); document.body.classList.toggle("hide-ko", !!st.ko);
      tgs.forEach(b => b.classList.toggle("on", !!st[b.dataset.hide]));
      $$(".peek").forEach(e => e.classList.remove("peek"));
    };
    tgs.forEach(b => (b.onclick = () => { st[b.dataset.hide] = !st[b.dataset.hide]; store.set("dain:hide", st); apply(); }));
    document.addEventListener("click", e => {
      const k = e.target.closest(".vw .ko, .exs .ko"); if (!k) return;
      const hidden = (k.closest(".vw") && st.mn) || (k.closest(".exs") && st.ko);
      if (hidden) k.classList.toggle("peek");
    });
    ["#voc", "#ex"].forEach(id => { const c = $(id); if (c) c.querySelector(".chead").insertAdjacentHTML("afterend", '<div class="hidehint">💡 가려진 부분을 누르면 하나씩 확인할 수 있어요. 먼저 스스로 뜻을 떠올려 보세요!</div>'); });
    apply();
  }
  document.addEventListener("DOMContentLoaded", () => { initSettings(); initPage(); initProgress(); initSearch(); initHide(); });
})();
