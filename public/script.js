/*
  === MJ 프로젝트 알파 버전: script.js ===
  - 역할: 가짜 데이터를 기반으로 화면을 그리고, 사용자의 입력을 처리한다. (프론트엔드)
*/

// --- 1. 데이터 설계도 (가짜 데이터) ---
// 나중에 이 부분만 Firebase에서 받아온 진짜 데이터로 교체될 거야.
// ▼▼▼ 여기에 추가 ▼▼▼
const firebaseConfig = {
  apiKey: "AIzaSyAZ_-c3-FMEMcYr04xA9_1LQMTjTLNkz1s",
  authDomain: "mjmj-65efc.firebaseapp.com",
  projectId: "mjmj-65efc",
  storageBucket: "mjmj-65efc.appspot.com",
  messagingSenderId: "240452285756",
  appId: "1:240452285756:web:c1cf4122ec9e7c9f669a39"
};

firebase.initializeApp(firebaseConfig);
const functions = firebase.functions();
const auth = firebase.auth();
// ▲▲▲ 여기까지 추가 ▲▲▲
const State = { OPEN: "OPEN", CLOSED: "CLOSED", SETTLED: "SETTLED" };
const now = Date.now();
const OPEN_GAP_MS = 30000;
const FIRST_OPEN_WINDOW_MS = 60000;
const SETTLE_DELAY_MS = 10000;

function makeMatch(id, a, b, oddsA, oddsB, index) {
  // 3분 간격으로 경기 시작 시간을 설정
  const startTime = new Date(now + 60000 + index * 180000); // 1분 뒤 첫 경기, 이후 3분 간격
  return { id, a, b, oddsA, oddsB, state: State.OPEN, startTime };
}

const matches = [
  makeMatch("m1", "김민서", "박지호", 2.1, 1.8, 0),
  makeMatch("m2", "이연", "최현우", 1.6, 2.3, 1),
  makeMatch("m3", "한지수", "백건호", 3.0, 1.5, 2),
  makeMatch("m4", "강아름", "정도현", 1.9, 2.0, 3),
  makeMatch("m5", "윤지훈", "김나래", 2.8, 1.7, 4),
];

// --- 2. HTML 화면 요소들과 연결 ---
const listEl = document.getElementById("matchList");
const betBtn = document.getElementById("betBtn");
const dinoAEl = document.getElementById("charA"); // id를 dinoA -> charA 로 변경
const dinoBEl = document.getElementById("charB"); // id를 dinoB -> charB 로 변경

let selected = {
  bets: [],      // 선택한 베팅들을 담을 장바구니 (배열)
  amount: null   // 베팅 금액은 하나만 유지
};

// --- 3. 핵심 기능 함수들 ---

// 숫자를 "분:초" 형식으로 바꿔주는 도우미 함수
function formatMMSS(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
}

// 경기 상태(State)를 한글로 바꿔주는 도우미 함수
function statusKo(m) {
  return m.state === "OPEN" ? "대기" : m.state === "CLOSED" ? "경기중" : "경기종료";
}

// 경기 결과를 표시하는 도우미 함수
function resultLabel(m) {
  if (m.state !== State.SETTLED) return "";
  const text = m.winner === "A" ? m.a + " 승" : m.b + " 승";
  return `<span class="result">🏁 ${text}</span>`;
}

// 남은 시간을 표시하는 도우미 함수
function remainSpan(m) {
  const id = `remain-${m.id}`;
  const secs = Math.max(0, Math.ceil((m.closeAt - Date.now()) / 1000));
  return m.state === "OPEN" ? `<span id="${id}" class="remain">${formatMMSS(secs)}</span>` : '';
}

// 'matches' 데이터를 바탕으로 경기 목록 HTML을 그려주는 핵심 함수
function renderList() {
  listEl.innerHTML = "";
  matches.forEach(m => {
    const row = document.createElement("div");
    row.className = "match";
    const disable = m.state !== State.OPEN;

    // startTime에서 시간:분 형식으로 바꿈
    const hours = String(m.startTime.getHours()).padStart(2, '0');
    const minutes = String(m.startTime.getMinutes()).padStart(2, '0');
    const displayTime = `${hours}:${minutes}`;

    row.innerHTML = `
      <div class="header">
        <div class="leftRow"><div class="badge ${m.state}">${statusKo(m)}</div><div class="muted">ID: ${m.id}</div></div>
        <div class="rightRow"><span class="remain">${displayTime}</span></div>
      </div>
      <div class="bet-container">
        <div class="bet-box" role="button"><span class="tname">${m.a}</span><div class="pill ${disable ? "disabled" : ""}" data-id="${m.id}" data-pick="A" data-odds="${m.oddsA}">${m.oddsA.toFixed(2)}</div></div>
        <div class="bet-box" role="button"><span class="tname">${m.b}</span><div class="pill ${disable ? "disabled" : ""}" data-id="${m.id}" data-pick="B" data-odds="${m.oddsB}">${m.oddsB.toFixed(2)}</div></div>
      </div>`;
    listEl.appendChild(row);
  });
}

// 배당률 숫자를 소수점 둘째 자리까지 보여주게 정규화하는 함수
function normalizePills() {
  document.querySelectorAll(".pill").forEach(el => {
    const n = parseFloat(el.dataset.odds);
    if (!Number.isNaN(n)) el.textContent = n.toFixed(2);
  });
}

// 하단 요약 텍스트를 업데이트하는 함수
// script.js

      function updateSummary() {
        betBtn.disabled = true;

        // 1. 장바구니에 담긴 베팅이 없으면 초기 메시지 표시
        if (selected.bets.length === 0) {
          summaryEl.textContent = "경기/배당 선택 먼저 해줘";
          selected.amount = null; // 금액 선택도 초기화
          document.querySelectorAll(".abtn").forEach(b => b.classList.remove("active"));
          return;
        }

        // 2. 장바구니에 담긴 모든 배당률을 곱한다.
        // a: 누적값, b: 현재 베팅정보, 1: 초기값
        const totalOdds = selected.bets.reduce((a, b) => a * b.odds, 1);
        
        const summaryText = `${selected.bets.length}개 경기 선택 / 총 배당: ${totalOdds.toFixed(2)}`;

        // 3. 베팅 금액이 선택되었는지에 따라 다른 메시지 표시
        if (!selected.amount) {
          summaryEl.textContent = `${summaryText} → 금액 선택`;
        } else {
          summaryEl.textContent = `${summaryText} / 금액 ₩${selected.amount.toLocaleString()}`;
          betBtn.disabled = false;
        }
      }

// --- 4. 이벤트 리스너 (사용자 행동 감지) ---

// 베팅할 경기를 선택했을 때
// ▼▼▼ 이 코드로 덮어쓰기 ▼▼▼

// 베팅할 경기를 선택했을 때 (다폴더-장바구니 방식)
// script.js

      listEl.addEventListener("click", (e) => {
        const betBox = e.target.closest(".bet-box");
        if (!betBox) return;

        const pill = betBox.querySelector(".pill");
        if (!pill || pill.classList.contains("disabled")) return;
        
        const matchId = pill.dataset.id;
        const matchRow = betBox.closest(".match");

        // 1. 방금 클릭한 박스가 이미 선택된 상태였는지 기억해둠 (선택 취소용)
        const isDeselect = betBox.classList.contains("active");

        // 2. 일단 이 경기에 대한 모든 시각적 선택 효과를 제거
        matchRow.querySelectorAll(".bet-box").forEach(box => box.classList.remove("active"));
        
        // 3. 장바구니에서도 이 경기에 대한 모든 베팅 정보를 제거
        const existingBetIndex = selected.bets.findIndex(bet => bet.matchId === matchId);
        if (existingBetIndex > -1) {
          selected.bets.splice(existingBetIndex, 1);
        }

        // 4. 만약 방금 클릭이 '선택 취소'가 아니었다면 (새로운 선택 또는 다른 팀으로 변경)
        if (!isDeselect) {
          // 클릭한 박스에만 시각적 효과를 다시 적용하고
          betBox.classList.add("active");
          // 장바구니에 새로운 베팅 정보를 추가한다
          const pick = pill.dataset.pick;
          const odds = parseFloat(pill.dataset.odds);
          selected.bets.push({ matchId, pick, odds });
        }
        
        updateSummary();
      });

// ▼▼▼ 바로 이 코드를 추가! ▼▼▼
      // 베팅할 금액을 선택했을 때
      document.getElementById("amountButtons").addEventListener("click", e => {
        const btn = e.target.closest(".abtn");
        if (!btn) return;
        
        // 일단 모든 금액 버튼의 활성 상태를 끄고
        document.querySelectorAll(".abtn").forEach(b => b.classList.remove("active"));
        
        // 클릭한 버튼만 활성화
        btn.classList.add("active");

        // 선택한 금액을 selected.amount에 저장
        selected.amount = parseInt(btn.dataset.amt, 10);
        
        // 요약 정보 업데이트
        updateSummary();
      });
      // ▲▲▲ 여기까지 추가 ▲▲▲

      // '베팅하기' 버튼 기능
betBtn.addEventListener("click", () => {
  // 1. 베팅할 경기가 없거나, 금액이 선택되지 않았으면 막기
  if (selected.bets.length === 0 || !selected.amount) {
    alert("먼저 베팅할 경기와 금액을 선택해주세요.");
    return;
  }

  // 2. 간단한 성공 메시지를 alert로 보여주기
        alert("베팅이 완료되었습니다!");
        
        // 여기에 나중에 실제 서버로 베팅 정보를 보내는 코드가 들어갈 거야.
      });
  
// --- 5. 시각 효과 (화면을 살아있게 만듦) ---

let hpA = 100, hpB = 100, rnd = 1;
setInterval(() => {
  // 1초마다 시간을 업데이트하던 로직을 제거.
  // 나중에 여기에 경기 상태를 자동으로 바꾸는 등의 서버 연동 코드가 들어갈 수 있어.
}, 1000);

// --- 6. 초기 실행 ---
renderList();
normalizePills();
updateSummary();