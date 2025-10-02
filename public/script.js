/*
  === MJ 프로젝트 알파 버전: script.js ===
  - 역할: 가짜 데이터를 기반으로 화면을 그리고, 사용자의 입력을 처리한다. (프론트엔드)
*/

// --- 1. Firebase 초기화 (임시) ---
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

// --- 2. 데이터 구조 ---
const State = { OPEN: "OPEN", CLOSED: "CLOSED", SETTLED: "SETTLED" };
const now = Date.now();

function makeMatch(id, a, b, oddsA, oddsB, index) {
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

// --- 3. 화면 요소 연결 ---
const listEl = document.getElementById("matchList");
const betBtn = document.getElementById("betBtn");
const dinoAEl = document.getElementById("charA");
const dinoBEl = document.getElementById("charB");

// --- 4. 베팅 선택 상태 ---
let selected = {
  bets: [],
  amount: null
};

// --- 5. 유틸 함수 ---
function formatMMSS(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
}

function statusKo(m) {
  return m.state === "OPEN" ? "대기" : m.state === "CLOSED" ? "경기중" : "경기종료";
}

function resultLabel(m) {
  if (m.state !== State.SETTLED) return "";
  const text = m.winner === "A" ? m.a + " 승" : m.b + " 승";
  return `<span class="result">🏁 ${text}</span>`;
}

function renderList() {
  listEl.innerHTML = "";
  matches.forEach(m => {
    const row = document.createElement("div");
    row.className = "match";
    const disable = m.state !== State.OPEN;

    const hours = String(m.startTime.getHours()).padStart(2, '0');
    const minutes = String(m.startTime.getMinutes()).padStart(2, '0');
    const displayTime = `${hours}:${minutes}`;

    row.innerHTML = `
      <div class="header">
        <div class="leftRow">
          <div class="badge ${m.state}">${statusKo(m)}</div>
          <div class="muted">ID: ${m.id}</div>
        </div>
        <div class="rightRow"><span class="remain">${displayTime}</span></div>
      </div>
      <div class="bet-container">
        <div class="bet-box" role="button">
          <span class="tname">${m.a}</span>
          <div class="pill ${disable ? "disabled" : ""}" 
               data-id="${m.id}" data-pick="A" data-odds="${m.oddsA}">
               ${m.oddsA.toFixed(2)}</div>
        </div>
        <div class="bet-box" role="button">
          <span class="tname">${m.b}</span>
          <div class="pill ${disable ? "disabled" : ""}" 
               data-id="${m.id}" data-pick="B" data-odds="${m.oddsB}">
               ${m.oddsB.toFixed(2)}</div>
        </div>
      </div>`;
    listEl.appendChild(row);
  });
}

function normalizePills() {
  document.querySelectorAll(".pill").forEach(el => {
    const n = parseFloat(el.dataset.odds);
    if (!Number.isNaN(n)) el.textContent = n.toFixed(2);
  });
}

function updateSummary() {
  betBtn.disabled = true;
  if (selected.bets.length === 0) {
    selected.amount = null;
    document.querySelectorAll(".abtn").forEach(b => b.classList.remove("active"));
    return;
  }
  if (selected.amount) betBtn.disabled = false;
}

// --- 6. 전투 관련 ---
let hpA = 100, hpB = 100;

function updateHP() {
  document.getElementById("hpA").style.width = hpA + "%";
  document.getElementById("hpB").style.width = hpB + "%";
}

function showDamage(targetEl, dmg) {
  const dmgEl = document.createElement("div");
  dmgEl.className = "damage-text";
  dmgEl.textContent = `-${dmg}`;

   // 크리티컬 판정 (예: 25 이상이면 크리티컬)
  if (dmg >= 25) {
    dmgEl.style.color = "#ffeb3b"; // 노란색
    dmgEl.style.fontSize = "16px";
    dmgEl.style.textShadow = "2px 2px 4px #000";
  } else {
    dmgEl.style.color = "#ff4444"; // 빨강
    dmgEl.style.fontSize = "12px";
  }

  dmgEl.style.left = "50%";
  dmgEl.style.transform = "translateX(-50%)";
  dmgEl.style.top = "-5px";

  targetEl.appendChild(dmgEl);
  
  setTimeout(() => dmgEl.remove(), 1000);
}

function battleTick() {
   if (hpA <= 0 || hpB <= 0) {
    clearInterval(battleInterval); // 루프 완전히 정지
    return;
  }
  const attacker = Math.random() < 0.5 ? "A" : "B";
  const arenaEl = document.querySelector(".arena");

  if (attacker === "A") {
    dinoAEl.classList.add("attack");
    const dmg = Math.floor(Math.random() * 21 + 10); // 10~30 랜덤
    hpB = Math.max(0, hpB - dmg);
    showDamage(dinoBEl, dmg);
  } else {
    dinoBEl.classList.add("attack");
    const dmg = Math.floor(Math.random() * 21 + 10);
    hpA = Math.max(0, hpA - dmg);
    showDamage(dinoAEl, dmg);
  }

  updateHP();

  setTimeout(() => {
    dinoAEl.classList.remove("attack");
    dinoBEl.classList.remove("attack");
  }, 500);

  arenaEl.classList.add("shake");
  setTimeout(() => arenaEl.classList.remove("shake"), 400);
}

// --- 7. 이벤트 리스너 ---
listEl.addEventListener("click", (e) => {
  const betBox = e.target.closest(".bet-box");
  if (!betBox) return;
  const pill = betBox.querySelector(".pill");
  if (!pill || pill.classList.contains("disabled")) return;
  
  const matchId = pill.dataset.id;
  const matchRow = betBox.closest(".match");
  const isDeselect = betBox.classList.contains("active");

  matchRow.querySelectorAll(".bet-box").forEach(box => box.classList.remove("active"));
  const existingBetIndex = selected.bets.findIndex(bet => bet.matchId === matchId);
  if (existingBetIndex > -1) selected.bets.splice(existingBetIndex, 1);

  if (!isDeselect) {
    betBox.classList.add("active");
    const pick = pill.dataset.pick;
    const odds = parseFloat(pill.dataset.odds);
    selected.bets.push({ matchId, pick, odds });
  }
  updateSummary();
});

document.getElementById("amountButtons").addEventListener("click", e => {
  const btn = e.target.closest(".abtn");
  if (!btn) return;
  document.querySelectorAll(".abtn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  selected.amount = parseInt(btn.dataset.amt, 10);
  updateSummary();
});

betBtn.addEventListener("click", () => {
  if (selected.bets.length === 0 || !selected.amount) {
    alert("먼저 베팅할 경기와 금액을 선택해주세요.");
    return;
  }
  alert("베팅이 완료되었습니다!");
});

// --- 8. 초기 실행 ---
renderList();
normalizePills();
updateSummary();
updateHP();
battleInterval = setInterval(battleTick, 3000);
