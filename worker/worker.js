/**
 * 다인에듀 스페인어 교재 사이트 — AI 선생님 챗봇 서버 (Cloudflare Worker)
 * 11개 교재 사이트(DELE A1~B2, FLEX, SNULT, 기초문법, 여행, GdU 초·중·고급)가 하나의 Worker를 함께 씁니다.
 * 비밀 변수(Secret):  ANTHROPIC_API_KEY
 * 일반 변수(Vars):    ALLOWED_ORIGIN = https://yalli2.github.io
 */
const MODEL = 'claude-haiku-5-5';

const SYSTEM = `너는 "Profe Búho(부오 선생님)"이라는 이름의 다인에듀 스페인어 튜터야.
학생: 한국 국제학교 중·고등학생과 다인에듀 수강생 (스페인어 입문~고급).
사이트: 다인에듀 스페인어 교재별 학습 사이트 — DELE A1~B2, FLEX, SNULT, 기초 스페인어 문법, 여행 스페인어, Gramática de uso 초·중·고급 워크북. 각 단원은 핵심 문법·어휘·예문·연습 문제로, 마지막은 최종 모의고사 4회로 구성돼 있다.

답변 규칙:
- 기본은 한국어로 짧고 친절하게(6~10줄). 학생이 영어나 스페인어로 물으면 그 언어로 답한다.
- 스페인어 예문을 1~3개 꼭 넣고, 핵심 형태는 **굵게** 표시한다. 목록이 필요하면 "- " 로 시작하는 줄로 쓴다.
- 학생이 지금 보는 교재·단원 수준에 맞춘다(입문 교재에서는 어려운 문법 용어를 피한다). 스페인·중남미 표현 차이가 있으면 짧게 알려 준다.
- 연습 문제·모의고사의 정답만 요구하면 바로 정답을 주지 말고 규칙과 힌트로 스스로 풀게 돕는다. 학생이 자기 답을 보여 주면 맞는지 확인하고 이유를 설명한다.
- 작문·말하기 답안을 보여 주면 틀린 곳을 고친 문장과 함께 2~3가지 핵심 피드백을 준다. DELE·FLEX·SNULT 관련 질문에는 시험 형식에 맞춘 전략을 알려 준다.
- 실제 시험 기출 문제나 시중 교재의 문장을 그대로 옮기지 않는다.
- 스페인어·언어 학습과 무관한 요청이나 부적절한 요청은 정중히 거절하고 스페인어 공부로 돌아오게 한다.
- 확실하지 않은 내용은 추측하지 말고 선생님께 확인하라고 말한다.`;

function cors(origin, allowed) {
  return {
    'Access-Control-Allow-Origin': origin === allowed ? origin : allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

export default {
  async fetch(request, env) {
    const allowed = env.ALLOWED_ORIGIN || 'https://yalli2.github.io';
    const origin = request.headers.get('Origin') || '';
    const headers = { ...cors(origin, allowed), 'Content-Type': 'application/json; charset=utf-8' };
    if (request.method === 'OPTIONS') return new Response(null, { headers });
    if (request.method !== 'POST') return new Response(JSON.stringify({ error: 'POST only' }), { status: 405, headers });
    if (origin !== allowed) return new Response(JSON.stringify({ error: 'forbidden origin' }), { status: 403, headers });

    let body;
    try { body = await request.json(); } catch { return new Response(JSON.stringify({ error: 'bad json' }), { status: 400, headers }); }
    const messages = (Array.isArray(body.messages) ? body.messages : [])
      .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .slice(-10)
      .map(m => ({ role: m.role, content: m.content.slice(0, 2000) }));
    if (!messages.length || messages[messages.length - 1].role !== 'user') {
      return new Response(JSON.stringify({ error: 'no question' }), { status: 400, headers });
    }
    while (messages.length && messages[0].role !== 'user') messages.shift();
    const context = String(body.context || '').slice(0, 300);

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 800,
        system: SYSTEM + (context ? `\n\n학생이 지금 보고 있는 페이지: ${context}` : ''),
        messages,
      }),
    });
    if (!r.ok) {
      return new Response(JSON.stringify({ error: 'upstream ' + r.status }), { status: 502, headers });
    }
    const data = await r.json();
    const reply = (data.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n');
    return new Response(JSON.stringify({ reply }), { headers });
  },
};
