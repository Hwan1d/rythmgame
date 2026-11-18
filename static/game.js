/**
 * BITS & GROOVES — Bits & Bops + Rhythm Doctor 스타일 16비트 리듬 엔진 v2
 * - 정박(TAP), 엇박(OFF-BEAT ◇), 롱노트(HOLD & RELEASE 꾹 눌렀다 떼기),
 *   리듬 닥터 7박 심전도(ECG HEARTBEAT 1-2-3-4-5-6-[7!]), 스타 액센트(★ X) 완벽 구현
 */

const canvas = document.getElementById("rhythmCanvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  ctx.imageSmoothingEnabled = false;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

const sprites = {};
["dj_bopper", "stage_seal", "stage_bot", "stage_cat"].forEach((name) => {
  const img = new Image();
  img.src = `./assets/sprites/${name}.png`;
  sprites[name] = img;
});

let selectedStageId = "seal";
let highScores = {};

const state = {
  inStage: false,
  stageId: "seal",
  chart: [],
  activeHoldNote: null,
  isKeyDown: false,
  score: 0,
  combo: 0,
  maxCombo: 0,
  groove: 55,
  counts: { bop: 0, good: 0, miss: 0 },
  cameraFlash: 0,
  polaroids: [],
  pancakeStack: 0,
  hammerAnim: 0,
  catFlipAnim: 0,
  judgments: [],
  particles: [],
};

async function loadRecords() {
  try {
    const localRaw = localStorage.getItem("bits_grooves_records_v1");
    if (localRaw) {
      highScores = JSON.parse(localRaw) || {};
    }
  } catch (_) {}
  try {
    const res = await fetch("./api/records");
    if (res.ok) {
      const data = await res.json();
      highScores = { ...highScores, ...(data.records || {}) };
    }
  } catch (_) {}
  updateJukeboxBadges();
}

function updateJukeboxBadges() {
  ["seal", "bot", "cat", "remix"].forEach((id) => {
    const el = document.getElementById(`best_${id}`);
    if (!el) return;
    const rec = highScores[id];
    if (rec && rec.score > 0) {
      el.textContent = `${rec.rank} · ${rec.score.toLocaleString()}`;
    } else {
      el.textContent = "NEW!";
    }
  });
}

function startStage(stageId) {
  selectedStageId = stageId;
  state.stageId = stageId;
  state.inStage = true;
  state.activeHoldNote = null;
  state.isKeyDown = false;
  state.score = 0;
  state.combo = 0;
  state.maxCombo = 0;
  state.groove = 55;
  state.counts = { bop: 0, good: 0, miss: 0 };
  state.cameraFlash = 0;
  state.polaroids = [];
  state.pancakeStack = 0;
  state.hammerAnim = 0;
  state.catFlipAnim = 0;
  state.judgments = [];
  state.particles = [];

  document.getElementById("jukeboxScreen").classList.add("hidden");
  document.getElementById("resultModal").classList.add("hidden");
  document.getElementById("inGameHud").classList.remove("hidden");

  const song = STAGE_SONGS[stageId];
  document.getElementById("hudSongTitle").textContent = song.title;
  document.getElementById("hudBpmTag").textContent = `${song.bpm} BPM`;

  let pyChart = null;
  if (window.pyRhythm && typeof window.pyRhythm.getChartJson === "function") {
    try {
      pyChart = JSON.parse(window.pyRhythm.getChartJson(stageId));
    } catch (_) {}
  }

  state.chart = window.rhythmAudio.startSong(stageId, pyChart);
  updateHud();
}

function stopAndReturnToJukebox() {
  window.rhythmAudio.stopSong();
  state.inStage = false;
  state.activeHoldNote = null;
  document.getElementById("inGameHud").classList.add("hidden");
  document.getElementById("resultModal").classList.add("hidden");
  document.getElementById("jukeboxScreen").classList.remove("hidden");
  updateJukeboxBadges();
}

// 키 누름(Press Down) 처리: 단타 노트 판정 또는 롱노트(HOLD) 시작!
function handlePressDown(inputType = "tap") {
  if (!state.inStage || !window.rhythmAudio.playing) return;
  state.isKeyDown = true;

  const beat = window.rhythmAudio.getCurrentBeat();
  const activeScene = getActiveSceneAtBeat(beat);

  if (activeScene === "seal") state.cameraFlash = 0.55;
  else if (activeScene === "bot") state.hammerAnim = 1.0;
  else if (activeScene === "cat") state.catFlipAnim = 1.0;

  let targetNote = null;
  let minDiff = 999;

  for (const note of state.chart) {
    if (note.judged || note.holding) continue;
    const diff = Math.abs(note.hitBeat - beat);
    if (diff < minDiff && diff <= 0.38) {
      minDiff = diff;
      targetNote = note;
    }
  }

  if (!targetNote) {
    window.rhythmAudio._hihat(window.rhythmAudio.ctx.currentTime, 0.04);
    return;
  }

  // 1. 롱노트(HOLD) 시작 판정!
  if (targetNote.type === "hold") {
    if (minDiff <= 0.32) {
      targetNote.holding = true;
      state.activeHoldNote = targetNote;
      window.rhythmAudio.startHoldSound();
      state.judgments.push({
        text: "⚡ HOLD!! (끝에서 떼세요!)",
        color: "#ffd166",
        x: canvas.width / 2,
        y: canvas.height * 0.25,
        life: 0.55,
        maxLife: 0.55,
      });
    } else {
      targetNote.judged = true;
      registerJudgment("MISS", targetNote, "#ff5964");
    }
    return;
  }

  // 2. 일반 / 엇박(offbeat) / 리듬닥터 7박(heartbeat) / 액센트(accent) 단타 판정
  targetNote.judged = true;

  if (window.pyRhythm && typeof window.pyRhythm.evaluateHit === "function") {
    const res = JSON.parse(window.pyRhythm.evaluateHit(minDiff, targetNote.type, inputType));
    applyPythonResult(res, targetNote);
    return;
  }

  const wrongButton = targetNote.type === "accent" && inputType !== "accent";
  if (minDiff <= 0.17 && !wrongButton) {
    registerJudgment("BOP!", targetNote, "#ffd166");
  } else if (minDiff <= 0.32) {
    registerJudgment("GOOD", targetNote, "#38bdf8");
  } else {
    registerJudgment("MISS", targetNote, "#ff5964");
  }
}

// 키 뗌(Release Up) 처리: 롱노트(HOLD) 끝 타이밍 판정!
function handleReleaseUp() {
  state.isKeyDown = false;
  if (!state.inStage || !state.activeHoldNote) return;

  const note = state.activeHoldNote;
  state.activeHoldNote = null;
  note.holding = false;
  note.judged = true;
  window.rhythmAudio.stopHoldSound();

  const beat = window.rhythmAudio.getCurrentBeat();
  const releaseDiff = Math.abs(note.endBeat - beat);

  if (window.pyRhythm && typeof window.pyRhythm.evaluateRelease === "function") {
    const res = JSON.parse(window.pyRhythm.evaluateRelease(releaseDiff));
    applyPythonResult(res, note);
    return;
  }

  if (releaseDiff <= 0.26) {
    note.holdCompleted = true;
    registerJudgment("RELEASE BOP!", note, "#06d6a0");
  } else if (releaseDiff <= 0.48) {
    registerJudgment("GOOD", note, "#38bdf8");
  } else {
    registerJudgment("MISS", note, "#ff5964");
  }
}

function applyPythonResult(res, note) {
  window.rhythmAudio.playHitSound(res.label, note.type);
  state.score = res.score;
  state.combo = res.combo;
  state.maxCombo = res.maxCombo;
  state.groove = res.groove;
  state.counts = res.counts;

  const isPerfect = res.label === "BOP!" || res.label === "RELEASE BOP!";
  if (isPerfect || res.label === "GOOD") {
    spawnHitParticles(canvas.width / 2, canvas.height * 0.42, res.color, isPerfect ? 24 : 12);
    if (note.scene === "seal" && isPerfect) {
      state.polaroids.unshift({
        pose:
          note.type === "hold"
            ? "🔍 ZOOM SHOT!"
            : note.type === "offbeat"
            ? "◇ OFF-BEAT!"
            : note.type === "heartbeat"
            ? "💓 7th BEAT!"
            : "📸 CUTE POSE!",
        angle: (Math.random() - 0.5) * 0.28,
        life: 2.5,
      });
      if (state.polaroids.length > 3) state.polaroids.pop();
    } else if (note.scene === "cat") {
      state.pancakeStack = Math.min(15, state.pancakeStack + (isPerfect && note.type === "hold" ? 2 : 1));
    }
  }

  state.judgments.push({
    text: res.popup,
    color: res.color,
    x: canvas.width / 2,
    y: canvas.height * 0.24,
    life: 0.72,
    maxLife: 0.72,
  });

  updateHud();
}

function registerJudgment(label, note, color) {
  window.rhythmAudio.playHitSound(label, note.type);

  const isPerfect = label === "BOP!" || label === "RELEASE BOP!";

  if (isPerfect) {
    state.counts.bop++;
    state.combo++;
    state.maxCombo = Math.max(state.maxCombo, state.combo);
    const basePts =
      note.type === "heartbeat"
        ? 1800
        : note.type === "hold"
        ? 1600
        : note.type === "offbeat"
        ? 1300
        : note.type === "accent"
        ? 1500
        : 1000;
    state.score += basePts + state.combo * 50;
    state.groove = Math.min(100, state.groove + 6);
    spawnHitParticles(canvas.width / 2, canvas.height * 0.42, color, 24);

    if (note.scene === "seal") {
      state.polaroids.unshift({
        pose:
          note.type === "hold"
            ? "🔍 ZOOM SHOT!"
            : note.type === "offbeat"
            ? "◇ OFF-BEAT!"
            : note.type === "heartbeat"
            ? "💓 7th BEAT!"
            : "📸 CUTE POSE!",
        angle: (Math.random() - 0.5) * 0.28,
        life: 2.5,
      });
      if (state.polaroids.length > 3) state.polaroids.pop();
    } else if (note.scene === "cat") {
      state.pancakeStack = Math.min(15, state.pancakeStack + (note.type === "hold" ? 2 : 1));
    }
  } else if (label === "GOOD") {
    state.counts.good++;
    state.combo++;
    state.maxCombo = Math.max(state.maxCombo, state.combo);
    state.score += 550 + state.combo * 20;
    state.groove = Math.min(100, state.groove + 2);
    spawnHitParticles(canvas.width / 2, canvas.height * 0.42, "#38bdf8", 12);
    if (note.scene === "cat") state.pancakeStack = Math.min(15, state.pancakeStack + 1);
  } else {
    state.counts.miss++;
    state.combo = 0;
    state.groove = Math.max(5, state.groove - 9);
  }

  let popupText = label;
  if (isPerfect) {
    if (note.type === "offbeat") popupText = "◇ 엇박 BOP! ◇";
    else if (note.type === "heartbeat") popupText = "💓 7th BEAT PERFECT!!";
    else if (note.type === "hold") popupText = "⚡ HOLD & RELEASE BOP!!";
    else if (note.type === "accent") popupText = "★ SUPER BOP!! ★";
  }

  state.judgments.push({
    text: popupText,
    color,
    x: canvas.width / 2,
    y: canvas.height * 0.24,
    life: 0.72,
    maxLife: 0.72,
  });

  updateHud();
}

function spawnHitParticles(x, y, color, count = 16) {
  for (let i = 0; i < count; i++) {
    const ang = (Math.PI * 2 * i) / count + Math.random() * 0.3;
    const spd = 120 + Math.random() * 190;
    state.particles.push({
      x,
      y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      color,
      size: 6 + Math.floor(Math.random() * 6),
      life: 0.45 + Math.random() * 0.25,
    });
  }
}

function getActiveSceneAtBeat(beat) {
  if (state.stageId !== "remix") return state.stageId;
  const barIdx = Math.max(0, Math.floor((beat - 4) / 4));
  return ["seal", "bot", "cat"][barIdx % 3];
}

function updateHud() {
  document.getElementById("hudScore").textContent = String(state.score).padStart(6, "0");
  document.getElementById("hudStreak").textContent = String(state.combo);
  document.getElementById("grooveBarFill").style.width = `${state.groove}%`;
}

async function finishStage() {
  window.rhythmAudio.stopSong();
  state.inStage = false;
  state.activeHoldNote = null;

  const totalNotes = Math.max(1, state.chart.length);
  const acc = ((state.counts.bop * 1.0 + state.counts.good * 0.6) / totalNotes) * 100;
  let rank = "C";
  let headline = "KEEP GROOVING!";
  let comment = "엇박(◇)과 롱노트(HOLD), 7박 심박동 리듬에 맞춰 다시 도전해 보세요!";

  if (acc >= 90) {
    rank = "S";
    headline = "★ RHYTHM DOCTOR & BOP MASTER! ★";
    comment = "정박, 엇박, 홀드 릴리즈, 7박 심폐소생 비트까지 완벽하게 마스터하셨습니다!";
  } else if (acc >= 76) {
    rank = "A";
    headline = "AWESOME GROOVE!";
    comment = "엇박과 롱노트 감각이 훌륭합니다! S 랭크까지 한 걸음 남았어요!";
  } else if (acc >= 55) {
    rank = "B";
    headline = "SOLID RHYTHM!";
    comment = "좋아요! 홀드 노트는 끝 지점(RELEASE)에서 정확히 손을 떼면 점수가 2배가 됩니다!";
  }

  document.getElementById("resStageTitle").textContent = STAGE_SONGS[state.stageId].title;
  document.getElementById("resRankBadge").textContent = rank;
  document.getElementById("resHeadline").textContent = headline;
  document.getElementById("resComment").textContent = comment;
  document.getElementById("resScore").textContent = state.score.toLocaleString();
  document.getElementById("resAccuracy").textContent = `${acc.toFixed(1)}%`;
  document.getElementById("resMaxCombo").textContent = String(state.maxCombo);
  document.getElementById("resBreakdown").textContent = `${state.counts.bop} / ${state.counts.good} / ${state.counts.miss}`;

  document.getElementById("inGameHud").classList.add("hidden");
  document.getElementById("resultModal").classList.remove("hidden");

  const prev = highScores[state.stageId] || {};
  if (state.score >= (prev.score || 0)) {
    highScores[state.stageId] = {
      score: state.score,
      rank,
      accuracy: Number(acc.toFixed(1)),
    };
    try {
      localStorage.setItem("bits_grooves_records_v1", JSON.stringify(highScores));
    } catch (_) {}
  }

  try {
    const res = await fetch("./api/records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stageId: state.stageId,
        score: state.score,
        rank,
        accuracy: Number(acc.toFixed(1)),
      }),
    });
    if (res.ok) {
      const data = await res.json();
      highScores = { ...highScores, ...(data.records || {}) };
    }
  } catch (_) {}
}

let lastFrameTime = performance.now();

function gameLoop(now) {
  const dt = Math.min(0.05, (now - lastFrameTime) / 1000);
  lastFrameTime = now;

  updateFrame(dt);
  renderFrame();

  requestAnimationFrame(gameLoop);
}

function updateFrame(dt) {
  if (state.cameraFlash > 0) state.cameraFlash = Math.max(0, state.cameraFlash - dt * 3.2);
  if (state.hammerAnim > 0) state.hammerAnim = Math.max(0, state.hammerAnim - dt * 5.0);
  if (state.catFlipAnim > 0) state.catFlipAnim = Math.max(0, state.catFlipAnim - dt * 4.5);

  for (let i = state.polaroids.length - 1; i >= 0; i--) {
    state.polaroids[i].life -= dt;
    if (state.polaroids[i].life <= 0) state.polaroids.splice(i, 1);
  }

  for (let i = state.judgments.length - 1; i >= 0; i--) {
    state.judgments[i].y -= 45 * dt;
    state.judgments[i].life -= dt;
    if (state.judgments[i].life <= 0) state.judgments.splice(i, 1);
  }

  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 320 * dt;
    p.life -= dt;
    if (p.life <= 0) state.particles.splice(i, 1);
  }

  if (!state.inStage || !window.rhythmAudio.playing) return;

  const beat = window.rhythmAudio.getCurrentBeat();
  const song = STAGE_SONGS[state.stageId];

  // 롱노트(HOLD) 누르고 있는 동안 충전 스파크 & 점수 틱 증가
  if (state.activeHoldNote) {
    state.score += Math.round(450 * dt);
    if (Math.random() < 0.45) {
      spawnHitParticles(canvas.width * 0.24, canvas.height * 0.86, "#ffd166", 2);
    }
    updateHud();

    // 끝 지점(endBeat)을 너무 지나치도록 안 뗐을 때 자동 릴리즈 처리
    if (beat > state.activeHoldNote.endBeat + 0.32) {
      const n = state.activeHoldNote;
      state.activeHoldNote = null;
      n.holding = false;
      n.judged = true;
      window.rhythmAudio.stopHoldSound();
      registerJudgment("GOOD", n, "#38bdf8");
    }
  }

  // 미입력 노트 자동 MISS 처리
  for (const note of state.chart) {
    if (!note.judged && !note.holding && beat - note.hitBeat > 0.36) {
      note.judged = true;
      registerJudgment("MISS", note, "#ff5964");
    }
  }

  if (beat >= song.totalBeats) {
    finishStage();
  }
}

function renderFrame() {
  const w = canvas.width;
  const h = canvas.height;
  ctx.imageSmoothingEnabled = false;

  if (!state.inStage) {
    ctx.fillStyle = "#191528";
    ctx.fillRect(0, 0, w, h);
    return;
  }

  const beat = window.rhythmAudio.getCurrentBeat();
  const beatFrac = ((beat % 1) + 1) % 1;
  const beatPulse = Math.exp(-beatFrac * 5.5);
  const activeScene = getActiveSceneAtBeat(beat);
  const stageH = Math.floor(h * 0.70);

  if (activeScene === "seal") {
    renderSealStage(w, stageH, beat, beatPulse);
  } else if (activeScene === "bot") {
    renderBotStage(w, stageH, beat, beatPulse);
  } else {
    renderCatStage(w, stageH, beat, beatPulse);
  }

  // 리듬 닥터(Rhythm Doctor) 스타일 7박 심전도(ECG Heartbeat) 파형 오버레이!
  renderHeartbeatOverlay(w, stageH, beat);

  // 좌하단 마스코트 DJ BOPPER
  if (sprites.dj_bopper && sprites.dj_bopper.complete) {
    const djScale = 1 + beatPulse * 0.14;
    const dw = 84 * djScale;
    const dh = 74 * djScale;
    ctx.drawImage(sprites.dj_bopper, 28, stageH - dh - 12, dw, dh);
  }

  if (beat < 4) {
    const countNum = 4 - Math.floor(beat);
    ctx.save();
    ctx.font = "900 52px Pretendard, monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = "#000";
    ctx.fillText(`READY... ${countNum}`, w / 2 + 4, stageH / 2 + 4);
    ctx.fillStyle = "#ffd166";
    ctx.fillText(`READY... ${countNum}`, w / 2, stageH / 2);
    ctx.restore();
  }

  // 하단 30%: 정박 / 엇박(◇) / 롱노트(HOLD 리본) / 7박 심장박동(💓) 리듬 하이웨이
  renderBeatHighway(w, h, stageH, beat, beatPulse);

  state.particles.forEach((p) => {
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);
  });

  state.judgments.forEach((j) => {
    ctx.save();
    ctx.font = "900 36px Pretendard, monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = "#000";
    ctx.fillText(j.text, j.x + 3, j.y + 3);
    ctx.fillStyle = j.color;
    ctx.fillText(j.text, j.x, j.y);
    ctx.restore();
  });

  if (state.cameraFlash > 0) {
    ctx.fillStyle = `rgba(255, 255, 255, ${state.cameraFlash * 0.55})`;
    ctx.fillRect(0, 0, w, stageH);
  }
}

// 리듬 닥터 오마주: 1-2-3-4-5-6-[7!] 심전도(ECG) 모니터 라인 & 카운트!
function renderHeartbeatOverlay(w, stageH, beat) {
  const hbNote = state.chart.find(
    (n) => n.type === "heartbeat" && beat >= n.cueBeat - 0.3 && beat <= n.hitBeat + 0.5
  );
  if (!hbNote) return;

  const yBase = stageH * 0.22;
  ctx.save();
  ctx.fillStyle = "rgba(15, 23, 42, 0.82)";
  ctx.strokeStyle = "#06d6a0";
  ctx.lineWidth = 3;
  ctx.fillRect(w * 0.22, yBase - 46, w * 0.56, 84);
  ctx.strokeRect(w * 0.22, yBase - 46, w * 0.56, 84);

  // 심전도 ECG 지그재그 파형
  ctx.beginPath();
  ctx.strokeStyle = beat >= hbNote.prepBeat ? "#ff5964" : "#06d6a0";
  ctx.lineWidth = 3.5;
  const startX = w * 0.25;
  const endX = w * 0.75;
  for (let x = startX; x <= endX; x += 6) {
    const norm = (x - startX) / (endX - startX);
    const pulseWave = Math.sin(norm * Math.PI * 14 - beat * 12) * (norm > 0.8 ? 28 : 12);
    const py = yBase + pulseWave;
    if (x === startX) ctx.moveTo(x, py);
    else ctx.lineTo(x, py);
  }
  ctx.stroke();

  // 1 - 2 - 3 - 4 - 5 - 6 - [7!] 박자 카운트 표시
  const stepIndex = Math.min(7, Math.max(1, Math.floor((beat - hbNote.cueBeat) * 2) + 1));
  ctx.font = "900 22px Pretendard, monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = stepIndex === 7 ? "#ffd166" : "#fff8e7";
  ctx.fillText(
    stepIndex < 7
      ? `💓 RHYTHM DOCTOR ECG: ${stepIndex} / 7 (7번째 박자에 치세요!)`
      : "⚡ [ 7!! 지금 치세요! ] ⚡",
    w / 2,
    yBase - 18
  );
  ctx.restore();
}

function renderSealStage(w, stageH, beat, beatPulse) {
  ctx.fillStyle = "#38bdf8";
  ctx.fillRect(0, 0, w, stageH);
  ctx.fillStyle = "#bae6fd";
  ctx.fillRect(0, stageH * 0.45, w, stageH * 0.2);

  const sunR = 44 + beatPulse * 8;
  ctx.fillStyle = "#fde047";
  ctx.beginPath();
  ctx.arc(w * 0.16, stageH * 0.22, sunR, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#0284c7";
  ctx.fillRect(0, stageH * 0.62, w, stageH * 0.38);
  ctx.fillStyle = "#0369a1";
  ctx.fillRect(0, stageH * 0.76, w, stageH * 0.24);

  const cx = w / 2;
  const cy = stageH * 0.54;

  state.chart.forEach((note) => {
    const endB = note.type === "hold" ? note.endBeat : note.hitBeat;
    if (beat < note.cueBeat - 0.2 || beat > endB + 0.5) return;

    let progress = (beat - note.cueBeat) / Math.max(0.1, note.hitBeat - note.cueBeat);
    if (note.type === "hold" && beat >= note.hitBeat && beat <= note.endBeat) {
      progress = 1.0; // 홀드 중에는 뷰파인더 정중앙에서 줌인 포즈 유지!
    }

    const jumpArc = Math.sin(Math.min(1.2, Math.max(0, progress)) * (Math.PI / 2));
    const sx = cx + (1 - Math.min(1, progress)) * -140;
    const sy = stageH * 0.78 - jumpArc * (stageH * 0.26);

    if (sprites.stage_seal && sprites.stage_seal.complete) {
      const holdScale = note.holding ? 1.25 + Math.sin(beat * 18) * 0.08 : 1.0;
      const sz = (note.type === "accent" ? 110 : 92) * holdScale;
      ctx.drawImage(sprites.stage_seal, sx - sz / 2, sy - sz / 2, sz, sz);

      ctx.font = "900 15px monospace";
      ctx.textAlign = "center";
      if (note.type === "offbeat") {
        ctx.fillStyle = "#c084fc";
        ctx.fillText("◇ 엇박 포즈!", sx, sy - sz / 2 - 8);
      } else if (note.type === "hold") {
        ctx.fillStyle = "#ffd166";
        ctx.fillText(note.holding ? "🔍 줌 촬영 중... (끝에 떼기!)" : "🔍 꾹 눌러 줌 촬영!", sx, sy - sz / 2 - 8);
      }
    }
  });

  const vfScale = state.activeHoldNote ? 0.78 : 1.0;
  const vfW = (190 - beatPulse * 10) * vfScale;
  const vfH = (150 - beatPulse * 8) * vfScale;
  ctx.strokeStyle = state.activeHoldNote ? "#ffd166" : "#fff8e7";
  ctx.lineWidth = 4;
  ctx.strokeRect(cx - vfW / 2, cy - vfH / 2, vfW, vfH);

  state.polaroids.forEach((pol, idx) => {
    ctx.save();
    ctx.translate(w - 150 - idx * 35, stageH * 0.36 + idx * 18);
    ctx.rotate(pol.angle);
    ctx.fillStyle = "#fff8e7";
    ctx.fillRect(-58, -64, 116, 132);
    ctx.fillStyle = "#38bdf8";
    ctx.fillRect(-48, -54, 96, 86);
    if (sprites.stage_seal && sprites.stage_seal.complete) {
      ctx.drawImage(sprites.stage_seal, -34, -44, 68, 68);
    }
    ctx.fillStyle = "#191528";
    ctx.font = "900 11px monospace";
    ctx.textAlign = "center";
    ctx.fillText(pol.pose, 0, 52);
    ctx.restore();
  });
}

function renderBotStage(w, stageH, beat, beatPulse) {
  ctx.fillStyle = "#1e1b2e";
  ctx.fillRect(0, 0, w, stageH);

  [w * 0.25, w * 0.75].forEach((gx, i) => {
    ctx.save();
    ctx.translate(gx, stageH * 0.32);
    ctx.rotate(beat * (i === 0 ? 0.5 : -0.5));
    ctx.strokeStyle = "#33294f";
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(0, 0, 68, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  });

  const beltY = stageH * 0.70;
  ctx.fillStyle = "#475569";
  ctx.fillRect(0, beltY, w, 34);
  ctx.fillStyle = "#facc15";
  const stripeOffset = ((beat * 90) % 60 + 60) % 60;
  for (let x = -60 + stripeOffset; x < w; x += 60) {
    ctx.fillRect(x, beltY + 8, 24, 18);
  }

  const cx = w / 2;

  state.chart.forEach((note) => {
    const endB = note.type === "hold" ? note.endBeat : note.hitBeat;
    if (beat < note.cueBeat - 1.0 || beat > endB + 1.2) return;
    let offsetBeats = note.hitBeat - beat;
    if (note.type === "hold" && beat >= note.hitBeat && beat <= note.endBeat) {
      offsetBeats = 0; // 홀드 중에는 중앙 드릴 아래 고정!
    } else if (note.type === "hold" && beat > note.endBeat) {
      offsetBeats = note.endBeat - beat;
    }

    const rx = cx - offsetBeats * 145;
    const bounce = note.judged ? Math.abs(Math.sin(beat * Math.PI * 2)) * 18 : 0;
    const ry = beltY - 46 - bounce;

    if (sprites.stage_bot && sprites.stage_bot.complete) {
      const sz = note.type === "accent" ? 104 : 88;
      ctx.drawImage(sprites.stage_bot, rx - sz / 2, ry - sz / 2, sz, sz);
    }
  });

  const isHolding = Boolean(state.activeHoldNote);
  const hammerY =
    stageH * 0.18 + (isHolding ? 130 + Math.sin(beat * 28) * 6 : state.hammerAnim * 135);
  ctx.fillStyle = "#94a3b8";
  ctx.fillRect(cx - 12, 0, 24, hammerY);
  ctx.fillStyle = isHolding ? "#ffd166" : "#ff5964";
  ctx.strokeStyle = "#fff8e7";
  ctx.lineWidth = 4;
  ctx.fillRect(cx - 48, hammerY, 96, 44);
  ctx.strokeRect(cx - 48, hammerY, 96, 44);
}

function renderCatStage(w, stageH, beat, beatPulse) {
  ctx.fillStyle = "#431407";
  ctx.fillRect(0, 0, w, stageH);

  for (let x = 0; x < w; x += 48) {
    ctx.fillStyle = (x / 48) % 2 === 0 ? "#7c2d12" : "#9a3412";
    ctx.fillRect(x, stageH * 0.56, 48, stageH * 0.44);
  }

  const cx = w / 2;
  const panY = stageH * 0.66 - state.catFlipAnim * 24;

  if (sprites.stage_cat && sprites.stage_cat.complete) {
    const catBounce = beatPulse * 10;
    ctx.drawImage(sprites.stage_cat, cx - 150, stageH * 0.46 - catBounce, 110, 110);
  }

  ctx.fillStyle = "#1e293b";
  ctx.fillRect(cx - 56, panY, 112, 16);
  ctx.fillStyle = "#facc15";
  ctx.fillRect(cx - 88, panY + 4, 34, 8);

  state.chart.forEach((note) => {
    const endB = note.type === "hold" ? note.endBeat : note.hitBeat;
    if (note.judged || beat < note.cueBeat || beat > endB + 0.3) return;
    const t = Math.min(1, (beat - note.cueBeat) / Math.max(0.1, note.hitBeat - note.cueBeat));
    const px = cx - 95 + t * 95;
    const arcH = note.type === "accent" ? 200 : 135;
    const py = panY - Math.sin(t * Math.PI) * arcH;

    ctx.fillStyle = note.type === "offbeat" ? "#c084fc" : note.type === "hold" ? "#ffd166" : "#f59e0b";
    ctx.strokeStyle = "#fef08a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(px, py, 28, 12, t * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });

  const plateX = cx + 175;
  const plateY = stageH * 0.70;
  ctx.fillStyle = "#fff8e7";
  ctx.fillRect(plateX - 48, plateY, 96, 10);
  for (let i = 0; i < state.pancakeStack; i++) {
    ctx.fillStyle = i % 2 === 0 ? "#f59e0b" : "#d97706";
    ctx.fillRect(plateX - 34, plateY - (i + 1) * 11, 68, 9);
  }
}

// 하단 30%: 정박 / 엇박(◇) / 롱노트(HOLD 리본) / 7박 심박(💓) 리듬 하이웨이
function renderBeatHighway(w, h, stageH, beat, beatPulse) {
  const hwY = stageH;
  const hwH = h - stageH;

  ctx.fillStyle = "#141022";
  ctx.fillRect(0, hwY, w, hwH);
  ctx.fillStyle = "#ffd166";
  ctx.fillRect(0, hwY, w, 4);

  const hitX = Math.floor(w * 0.24);
  const centerY = Math.floor(hwY + hwH * 0.54);
  const pxPerBeat = 220;

  // 정박 실선 & 엇박(0.5박) 점선 가이드라인
  const firstBeat = Math.floor(beat);
  for (let b = firstBeat; b < firstBeat + 6; b += 0.5) {
    const bx = hitX + (b - beat) * pxPerBeat;
    if (bx >= hitX - 40 && bx <= w) {
      const isOnBeat = Math.abs(b % 1) < 0.01;
      ctx.fillStyle = isOnBeat ? "rgba(255, 248, 231, 0.2)" : "rgba(192, 132, 252, 0.12)";
      ctx.fillRect(bx, hwY + (isOnBeat ? 14 : 34), isOnBeat ? 2 : 1, hwH - (isOnBeat ? 28 : 68));
    }
  }

  // 판정 타겟 링 (BOP ZONE)
  const ringR = 32 + beatPulse * 6;
  ctx.strokeStyle = state.activeHoldNote ? "#06d6a0" : "#ffd166";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(hitX, centerY, ringR, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "#fff8e7";
  ctx.font = "900 11px monospace";
  ctx.textAlign = "center";
  ctx.fillText(state.activeHoldNote ? "HOLDING!" : "HIT ZONE", hitX, centerY + ringR + 18);

  // 노트 렌더링 (롱노트 리본 -> 헤드/테일 -> 엇박 다이아몬드 -> 7박 하트비트)
  state.chart.forEach((note) => {
    if (note.judged) return;
    const endB = note.type === "hold" ? note.endBeat : note.hitBeat;
    if (endB - beat < -0.4 || note.hitBeat - beat > 4.6) return;

    const headX = note.holding ? hitX : hitX + (note.hitBeat - beat) * pxPerBeat;

    if (note.type === "hold") {
      // 1. 롱노트(HOLD & RELEASE) 리본 바 + 테일 마커
      const tailX = hitX + (note.endBeat - beat) * pxPerBeat;
      const barWidth = Math.max(0, tailX - headX);

      ctx.fillStyle = note.holding ? "rgba(6, 214, 160, 0.55)" : "rgba(255, 209, 102, 0.38)";
      ctx.strokeStyle = note.holding ? "#06d6a0" : "#ffd166";
      ctx.lineWidth = 3;
      ctx.fillRect(headX, centerY - 14, barWidth, 28);
      ctx.strokeRect(headX, centerY - 14, barWidth, 28);

      // RELEASE 테일 원
      ctx.fillStyle = "#06d6a0";
      ctx.beginPath();
      ctx.arc(tailX, centerY, 19, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#091e18";
      ctx.font = "900 10px monospace";
      ctx.textAlign = "center";
      ctx.fillText("떼기!", tailX, centerY + 4);

      // HOLD 헤드 원
      ctx.fillStyle = "#ffd166";
      ctx.beginPath();
      ctx.arc(headX, centerY, 23, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#191528";
      ctx.fillText("꾹!HOLD", headX, centerY + 4);
    } else if (note.type === "offbeat") {
      // 2. 엇박(Syncopation) 퍼플/시안 다이아몬드 노트 (◇)
      ctx.save();
      ctx.translate(headX, centerY);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = "#c084fc";
      ctx.strokeStyle = "#fff8e7";
      ctx.lineWidth = 3;
      ctx.fillRect(-18, -18, 36, 36);
      ctx.strokeRect(-18, -18, 36, 36);
      ctx.restore();

      ctx.fillStyle = "#191528";
      ctx.font = "900 11px monospace";
      ctx.textAlign = "center";
      ctx.fillText("◇엇박", headX, centerY + 4);
    } else if (note.type === "heartbeat") {
      // 3. 리듬 닥터 7박 심전도 예비 펄스 점들 + 7번째 하트비트 강타 노트
      if (note.pulseBeats) {
        note.pulseBeats.forEach((pb, idx) => {
          const px = hitX + (pb - beat) * pxPerBeat;
          if (px > hitX) {
            ctx.fillStyle = idx === 5 ? "#ffd166" : "#06d6a0";
            ctx.beginPath();
            ctx.arc(px, centerY, 6, 0, Math.PI * 2);
            ctx.fill();
          }
        });
      }
      ctx.save();
      ctx.translate(headX, centerY);
      ctx.fillStyle = "#ff5964";
      ctx.strokeStyle = "#ffd166";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#fff8e7";
      ctx.font = "900 12px monospace";
      ctx.textAlign = "center";
      ctx.fillText("💓7박!", 0, 4);
      ctx.restore();
    } else {
      // 4. 기본 정박(TAP) 및 스타 액센트(★ X) 노트
      const isAccent = note.type === "accent";
      ctx.save();
      ctx.translate(headX, centerY);
      ctx.fillStyle = isAccent ? "#ff5964" : "#38bdf8";
      ctx.strokeStyle = "#fff8e7";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, isAccent ? 25 : 21, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#191528";
      ctx.font = "900 11px monospace";
      ctx.textAlign = "center";
      ctx.fillText(isAccent ? "★ X" : "SPACE", 0, 4);
      ctx.restore();
    }
  });
}

// 이벤트 바인딩
document.querySelectorAll(".cartridge-card").forEach((card) => {
  card.addEventListener("click", () => {
    document.querySelectorAll(".cartridge-card").forEach((c) => c.classList.remove("selected"));
    card.classList.add("selected");
    selectedStageId = card.getAttribute("data-stage");

    const iconMap = {
      seal: "./assets/sprites/stage_seal.png",
      bot: "./assets/sprites/stage_bot.png",
      cat: "./assets/sprites/stage_cat.png",
      remix: "./assets/sprites/dj_bopper.png",
    };
    document.getElementById("vinylIcon").src = iconMap[selectedStageId];
    window.rhythmAudio.init();
    window.rhythmAudio.playHitSound("GOOD");
  });
});

document.getElementById("playStageBtn").addEventListener("click", () => startStage(selectedStageId));

document.getElementById("crtToggleBtn").addEventListener("click", () => {
  document.body.classList.toggle("crt-active");
  const on = document.body.classList.contains("crt-active");
  document.getElementById("crtToggleBtn").textContent = `📺 CRT 스캔라인: ${on ? "ON" : "OFF"}`;
});

document.getElementById("backToMenuBtn").addEventListener("click", () => stopAndReturnToJukebox());
document.getElementById("retryStageBtn").addEventListener("click", () => startStage(selectedStageId));
document.getElementById("returnJukeboxBtn").addEventListener("click", () => stopAndReturnToJukebox());

document.getElementById("muteBtn").addEventListener("click", () => {
  const m = window.rhythmAudio.toggleMute();
  document.getElementById("muteBtn").textContent = m ? "🔇" : "🔊";
});

window.addEventListener("keydown", (e) => {
  if (e.repeat) return;
  if (e.code === "Escape" && state.inStage) {
    stopAndReturnToJukebox();
    return;
  }
  if (!state.inStage) return;

  if (["Space", "KeyZ", "Enter"].includes(e.code)) {
    e.preventDefault();
    handlePressDown("tap");
  } else if (["KeyX", "ArrowRight", "ShiftLeft", "ShiftRight"].includes(e.code)) {
    e.preventDefault();
    handlePressDown("accent");
  }
});

window.addEventListener("keyup", (e) => {
  if (["Space", "KeyZ", "Enter", "KeyX", "ArrowRight"].includes(e.code)) {
    handleReleaseUp();
  }
});

canvas.addEventListener("mousedown", (e) => {
  if (!state.inStage) return;
  if (e.button === 2) {
    handlePressDown("accent");
  } else if (e.button === 0) {
    handlePressDown("tap");
  }
});

window.addEventListener("mouseup", () => {
  if (state.inStage) handleReleaseUp();
});

canvas.addEventListener("contextmenu", (e) => e.preventDefault());

loadRecords();
requestAnimationFrame(gameLoop);
