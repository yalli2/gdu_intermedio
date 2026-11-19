# 다인에듀 Gramática del Uso 중급 워크북 — 인터랙티브 학습 사이트

사이트 주소: https://yalli2.github.io/gdu_intermedio/

다인에듀 스페인어 교재 「Gramática del Uso 중급 워크북」의 수업용 학습 사이트입니다. 16개 단원(핵심 문법·어휘·예문·연습 문제)과 최종 모의고사 4회로 구성되어 있으며, 모든 문제를 사이트에서 바로 풀고 점수와 정답을 확인할 수 있습니다. 모든 지문·문항은 다인에듀 자체 제작 콘텐츠입니다.

## 💬 학습 도우미 챗봇 (Profe Búho)
모든 페이지 오른쪽 아래 💬 버튼으로 엽니다.

**① 내장 모드 (설정 없이 바로 작동, 무료)**
- 교재 문법 검색: "접속법은 언제 써?", "과거 시제 차이" → 관련 단원의 문법 설명과 이동 링크
- 단어 찾기: "viaje 뜻", "'예약하다' 스페인어" → 교재 어휘와 원어민 발음 🔊
- 교재 안내: "단원 목록", "Unidad 3", "시험 구성", "모의고사"
- 어휘 퀴즈: "퀴즈 내줘" → 지금 보는 단원의 어휘로 출제·채점
- 교재 데이터(`assets/kb.js`)는 챗봇을 열 때만 불러옵니다.

**② AI 선생님 모드 (자유 질문·작문 첨삭, 선택)**
API 키를 공개 사이트에 넣으면 누구나 훔쳐 쓸 수 있으므로, 키는 Cloudflare Worker(무료 플랜 가능)에만 보관합니다. 11개 교재 사이트가 Worker 하나를 함께 쓸 수 있습니다.
1. https://console.anthropic.com 에서 API 키 발급 (사용량만큼 과금 — Console에서 월 사용 한도를 꼭 설정하세요)
2. https://dash.cloudflare.com → Workers & Pages → Create → "Hello World" Worker 생성 (이름 예: `dainedu-chat`)
3. Edit code → `worker/worker.js` 내용을 붙여넣고 Deploy
4. Worker의 Settings → Variables and Secrets
   - Secret `ANTHROPIC_API_KEY` = 발급받은 키
   - Text `ALLOWED_ORIGIN` = `https://yalli2.github.io`
5. Worker 주소(예: `https://dainedu-chat.계정.workers.dev`)를 `assets/config.js`의 `chatEndpoint`에 넣고 커밋
→ 챗봇 상단에 "🤖 AI 선생님 / 📖 교재 검색" 전환 버튼이 생깁니다. 단원 목록·퀴즈는 계속 교재 검색으로 즉시 답하고, AI 연결이 실패하면 자동으로 교재 검색 답변으로 넘어갑니다. 모의고사 페이지에서는 정답을 바로 알려 주지 않고 힌트로 돕습니다.

## 🔊 음성
기기·브라우저의 스페인어 음성 중 가장 자연스러운 음성을 자동으로 고릅니다. Edge(Natural 음성)·Chrome(Google español)에서 가장 좋습니다. 오른쪽 위 '음성 설정'에서 억양(스페인/중남미)·음성·속도를 바꿀 수 있습니다.
