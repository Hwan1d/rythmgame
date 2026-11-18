/**
 * BITS & GROOVES — 16-BIT AUDIO & SAMPLE-ACCURATE RHYTHM SYNTHESIZER v2
 * - 엇박(Syncopation / Off-beat), 롱노트(Hold & Release 충전 사운드),
 *   리듬 닥터(Rhythm Doctor) 스타일 7박 심장박동(ECG Defibrillator) 패턴 완벽 지원
 */

const NOTE_FREQ = {
  C2: 65.41, D2: 73.42, E2: 82.41, F2: 87.31, G2: 98.00, A2: 110.00, Bb2: 116.54, B2: 123.47,
  C3: 130.81, D3: 146.83, Eb3: 155.56, E3: 164.81, F3: 174.61, G3: 196.00, Ab3: 207.65, A3: 220.00, Bb3: 233.08, B3: 246.94,
  C4: 261.63, D4: 293.66, Eb4: 311.13, E4: 329.63, F4: 349.23, Fs4: 369.99, G4: 392.00, Ab4: 415.30, A4: 440.00, Bb4: 466.16, B4: 493.88,
  C5: 523.25, D5: 587.33, Eb5: 622.25, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00, Bb5: 932.33, B5: 987.77,
  C6: 1046.50, D6: 1174.66, E6: 1318.51
};

const CHORDS = {
  Cmaj7: ["C4", "E4", "G4", "B4"],
  Fmaj7: ["F4", "A4", "C5", "E5"],
  Dm7: ["D4", "F4", "A4", "C5"],
  G7: ["G3", "B3", "D4", "F4"],
  Em7: ["E4", "G4", "B4", "D5"],
  Am7: ["A3", "C4", "E4", "G4"],
  Bb7: ["Bb3", "D4", "F4", "Ab4"],
};

const STAGE_SONGS = {
  seal: {
    id: "seal",
    title: "SNAP & BOP! (물개 파파라치)",
    subtitle: "정박 셔터 + 엇박(◇) 더블 포즈 + 꾹 눌러 줌인(HOLD) 촬영!",
    bpm: 120,
    totalBeats: 68,
    themeColor: "#38bdf8",
    progression: ["Cmaj7", "Am7", "Dm7", "G7"],
    bassLine: ["C2", "C3", "A2", "E2", "D2", "A2", "G2", "D3"],
    melody16: [
      "E5", null, "G5", "E5", "C5", null, "D5", null,
      "E5", "G5", "A5", "G5", "E5", null, null, null,
      "F5", null, "A5", "F5", "D5", null, "C5", null,
      "B4", "D5", "G5", "F5", "E5", "D5", "C5", null
    ],
  },
  bot: {
    id: "bot",
    title: "CLOCKWORK BOT (태엽 로봇 공방)",
    subtitle: "꾹 눌러 나사 조이기(HOLD) + 트레시요 엇박(3-3-2) 해머링!",
    bpm: 126,
    totalBeats: 68,
    themeColor: "#facc15",
    progression: ["Am7", "Fmaj7", "Dm7", "G7"],
    bassLine: ["A2", "A2", "F2", "C3", "D2", "A2", "G2", "B2"],
    melody16: [
      "A5", null, "E5", "A5", "G5", "E5", "C5", null,
      "F5", null, "C5", "F5", "E5", "C5", "A4", null,
      "D5", "E5", "F5", "A5", "G5", null, "E5", null,
      "D5", null, "G5", null, "E5", "C5", "A4", null
    ],
  },
  cat: {
    id: "cat",
    title: "RHYTHM DOCTOR DINER (7박 심박 & 엇박 다이너)",
    subtitle: "리듬 닥터식 7박자 심폐소생 토스 + 엇박 스윙 + 롱노트 시럽 붓기!",
    bpm: 132,
    totalBeats: 72,
    themeColor: "#fb923c",
    progression: ["Fmaj7", "Em7", "Dm7", "Cmaj7"],
    bassLine: ["F2", "C3", "E2", "B2", "D2", "A2", "C2", "G2"],
    melody16: [
      "A5", "G5", "F5", "C5", "E5", null, "G5", null,
      "G5", "F5", "E5", "B4", "D5", null, "F5", null,
      "F5", "E5", "D5", "A4", "C5", "D5", "E5", "G5",
      "C6", null, "G5", "E5", "C5", null, null, null
    ],
  },
  remix: {
    id: "remix",
    title: "OVERDRIVE BOPS REMIX! (올스타 리믹스)",
    subtitle: "정박·엇박·롱노트(HOLD)·리듬닥터 7박 심박이 총출동하는 최종 리믹스!",
    bpm: 138,
    totalBeats: 84,
    themeColor: "#f43f5e",
    progression: ["Cmaj7", "Bb7", "Fmaj7", "G7"],
    bassLine: ["C2", "G2", "Bb2", "F2", "F2", "C3", "G2", "D3"],
    melody16: [
      "C6", null, "G5", "E5", "Bb5", null, "F5", "D5",
      "A5", "G5", "F5", "A5", "G5", "B5", "D6", null,
      "E6", "D6", "C6", "G5", "A5", "F5", "C5", null,
      "D5", "E5", "F5", "G5", "A5", "B5", "C6", null
    ],
  },
};

/**
 * 스테이지별 다채로운 노트 패턴 생성기
 * - type:
 *   "tap"      : 기본 정박 노트 (Space / Z / 좌클릭)
 *   "offbeat"  : 엇박(Syncopation) 노트 (0.5박, 0.75박 등 엇박 타이밍! ◇ 마커)
 *   "hold"     : 꾹 눌렀다가 endBeat에 떼는 롱노트 (Space 꾹 누르기 -> 떼기!)
 *   "heartbeat": 리듬 닥터 스타일 1-2-3-4-5-6-[7!] 일곱 번째 박자 강타 노트
 *   "accent"   : ★ 스타 액센트 노트 (X / → / 우클릭)
 */
function buildStageChart(stageId) {
  const notes = [];
  const song = STAGE_SONGS[stageId];
  const total = song.totalBeats;

  for (let barStart = 4; barStart < total - 4; barStart += 4) {
    const barIdx = Math.floor((barStart - 4) / 4);
    const subMode =
      stageId === "remix"
        ? ["seal", "bot", "cat"][barIdx % 3]
        : stageId;

    const patternType = barIdx % 5;

    if (patternType === 0) {
      // 패턴 1: 정박 + 엇박(Syncopation, +0.5박) 콤비네이션 ("쿵 - 짝 - 엇짝!")
      notes.push({
        cueBeat: barStart + 0.0,
        prepBeat: barStart + 0.5,
        hitBeat: barStart + 1.0,
        type: "tap",
        scene: subMode,
        judged: false,
      });
      notes.push({
        cueBeat: barStart + 1.0,
        prepBeat: barStart + 2.0,
        hitBeat: barStart + 2.5, // 엇박(&)!
        type: "offbeat",
        scene: subMode,
        judged: false,
      });
      notes.push({
        cueBeat: barStart + 1.5,
        prepBeat: barStart + 2.5,
        hitBeat: barStart + 3.0,
        type: "tap",
        scene: subMode,
        judged: false,
      });
    } else if (patternType === 1) {
      // 패턴 2: 롱노트 HOLD & RELEASE! ("꾸우욱 누르고(1.5박) -> 정박/엇박에 떼기!")
      notes.push({
        cueBeat: barStart + 0.0,
        prepBeat: barStart + 0.5,
        hitBeat: barStart + 1.0,
        endBeat: barStart + 2.5, // 1.5박 동안 꾹 눌렀다가 2.5박(엇박)에 떼기!
        type: "hold",
        scene: subMode,
        judged: false,
        holding: false,
        holdCompleted: false,
      });
      notes.push({
        cueBeat: barStart + 2.5,
        prepBeat: barStart + 3.0,
        hitBeat: barStart + 3.5, // 이어지는 엇박 마무리 탭!
        type: "offbeat",
        scene: subMode,
        judged: false,
      });
    } else if (patternType === 2) {
      // 패턴 3: 리듬 닥터(Rhythm Doctor) 오마주 7박 심장박동!
      // 0.5박 단위 6번의 심전도 펄스(0.0, 0.5, 1.0, 1.5, 2.0, 2.5) 후 7번째(3.0박)에 제세동기 샷!
      notes.push({
        cueBeat: barStart + 0.0,
        prepBeat: barStart + 2.5,
        hitBeat: barStart + 3.0,
        pulseBeats: [
          barStart + 0.0,
          barStart + 0.5,
          barStart + 1.0,
          barStart + 1.5,
          barStart + 2.0,
          barStart + 2.5,
        ],
        type: "heartbeat",
        scene: subMode,
        judged: false,
      });
    } else if (patternType === 3) {
      // 패턴 4: 트레시요(Tresillo 3-3-2) 16분음표 엇박 그루브 (1.0 -> 1.75 -> 2.5 -> 3.0★)
      notes.push({
        cueBeat: barStart + 0.0,
        prepBeat: barStart + 0.5,
        hitBeat: barStart + 1.0,
        type: "tap",
        scene: subMode,
        judged: false,
      });
      notes.push({
        cueBeat: barStart + 0.5,
        prepBeat: barStart + 1.25,
        hitBeat: barStart + 1.75, // 16분음표 엇박!
        type: "offbeat",
        scene: subMode,
        judged: false,
      });
      notes.push({
        cueBeat: barStart + 1.0,
        prepBeat: barStart + 2.0,
        hitBeat: barStart + 2.5, // 8분음표 엇박!
        type: "offbeat",
        scene: subMode,
        judged: false,
      });
      notes.push({
        cueBeat: barStart + 1.5,
        prepBeat: barStart + 2.5,
        hitBeat: barStart + 3.0,
        type: "accent",
        scene: subMode,
        judged: false,
      });
    } else {
      // 패턴 5: 2박 롱노트 홀드 후 스타 액센트 피니시!
      notes.push({
        cueBeat: barStart + 0.0,
        prepBeat: barStart + 0.5,
        hitBeat: barStart + 1.0,
        endBeat: barStart + 3.0,
        type: "hold",
        scene: subMode,
        judged: false,
        holding: false,
        holdCompleted: false,
      });
      notes.push({
        cueBeat: barStart + 2.5,
        prepBeat: barStart + 3.0,
        hitBeat: barStart + 3.5,
        type: "accent",
        scene: subMode,
        judged: false,
      });
    }
  }
  return notes;
}

class RhythmAudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.playing = false;
    this.song = null;
    this.chart = [];
    this.startTime = 0;
    this.nextSubStep = 0;
    this.schedulerTimer = null;

    // 롱노트(HOLD) 누르고 있는 동안 재생되는 차징 신스 오실레이터
    this.holdOsc = null;
    this.holdGain = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.85;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.init();
    this.muted = !this.muted;
    this.master.gain.setValueAtTime(this.muted ? 0 : 0.85, this.ctx.currentTime);
    return this.muted;
  }

  startSong(stageId) {
    this.init();
    this.stopSong();
    this.song = STAGE_SONGS[stageId] || STAGE_SONGS.seal;
    this.chart = buildStageChart(stageId);
    this.playing = true;
    this.startTime = this.ctx.currentTime + 0.15;
    this.nextSubStep = 0;

    this.schedulerTimer = setInterval(() => this._scheduleLookahead(), 22);
    return this.chart;
  }

  stopSong() {
    this.playing = false;
    this.stopHoldSound();
    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
  }

  getCurrentBeat() {
    if (!this.playing || !this.ctx || !this.song) return 0;
    const elapsed = this.ctx.currentTime - this.startTime;
    return elapsed * (this.song.bpm / 60);
  }

  // 롱노트(HOLD) 누르기 시작할 때 상승하는 16비트 충전 신스 사운드
  startHoldSound() {
    if (this.muted || !this.ctx) return;
    this.stopHoldSound();
    const now = this.ctx.currentTime;
    this.holdOsc = this.ctx.createOscillator();
    this.holdGain = this.ctx.createGain();
    this.holdOsc.type = "sawtooth";
    this.holdOsc.frequency.setValueAtTime(329.63, now);
    this.holdOsc.frequency.exponentialRampToValueAtTime(880.0, now + 1.5);

    this.holdGain.gain.setValueAtTime(0.01, now);
    this.holdGain.gain.linearRampToValueAtTime(0.18, now + 0.05);

    this.holdOsc.connect(this.holdGain);
    this.holdGain.connect(this.master);
    this.holdOsc.start(now);
  }

  stopHoldSound() {
    if (this.holdOsc) {
      try {
        this.holdOsc.stop();
        this.holdOsc.disconnect();
      } catch (_) {}
      this.holdOsc = null;
      this.holdGain = null;
    }
  }

  _scheduleLookahead() {
    if (!this.playing || !this.ctx || !this.song) return;
    const secPerBeat = 60 / this.song.bpm;
    const secPerSub = secPerBeat * 0.25;

    while (this.nextSubStep * secPerSub < this.ctx.currentTime - this.startTime + 0.12) {
      const beat = this.nextSubStep * 0.25;
      if (beat >= this.song.totalBeats) break;
      const exactTime = this.startTime + this.nextSubStep * secPerSub;
      this._scheduleSubStep(this.nextSubStep, beat, exactTime, secPerBeat);
      this.nextSubStep++;
    }
  }

  _scheduleSubStep(subStep, beat, time, secPerBeat) {
    if (beat < 4 && subStep % 4 === 0) {
      this._tone(beat === 3 ? 1046.5 : 523.25, time, 0.08, "triangle", 0.35);
    }

    if (subStep % 4 === 0) this._kick(time);
    if (subStep % 8 === 4) this._snare(time);
    if (subStep % 2 === 0) this._hihat(time, subStep % 4 === 2 ? 0.11 : 0.045);

    const barIdx = Math.floor(beat / 4);
    const chordName = this.song.progression[barIdx % this.song.progression.length];
    const chordNotes = CHORDS[chordName] || CHORDS.Cmaj7;
    if (subStep % 16 === 0 || subStep % 16 === 6 || subStep % 16 === 12) {
      chordNotes.forEach((n) => {
        if (NOTE_FREQ[n]) this._tone(NOTE_FREQ[n], time, secPerBeat * 0.42, "triangle", 0.1);
      });
    }

    if (subStep % 2 === 0) {
      const bassIdx = Math.floor(subStep / 2) % this.song.bassLine.length;
      const bNote = this.song.bassLine[bassIdx];
      if (bNote && NOTE_FREQ[bNote]) {
        this._tone(NOTE_FREQ[bNote], time, secPerBeat * 0.36, "sawtooth", 0.22);
      }
    }

    if (beat >= 4 && subStep % 2 === 0) {
      const melIdx = Math.floor((subStep - 16) / 2) % this.song.melody16.length;
      const mNote = this.song.melody16[melIdx];
      if (mNote && NOTE_FREQ[mNote]) {
        this._tone(NOTE_FREQ[mNote], time, secPerBeat * 0.4, "square", 0.16);
      }
    }

    // 노트별 맞춤 오디오 큐 스케줄링
    this.chart.forEach((note) => {
      if (note.type === "heartbeat" && note.pulseBeats) {
        // 리듬 닥터 1-2-3-4-5-6 심전도 비프음!
        note.pulseBeats.forEach((pb, idx) => {
          if (Math.abs(pb - beat) < 0.01) {
            const pitch = idx === 5 ? 987.77 : 659.25;
            this._tone(pitch, time, 0.07, "square", 0.34);
          }
        });
      } else {
        if (Math.abs(note.cueBeat - beat) < 0.01) {
          const f = note.type === "offbeat" ? 783.99 : note.type === "hold" ? 587.33 : 659.25;
          this._tone(f, time, 0.08, "sine", 0.3);
        }
        if (Math.abs(note.prepBeat - beat) < 0.01) {
          if (note.type === "offbeat") {
            // 엇박 전용 림샷/클라비넷 스냅 큐!
            this._sweep(1174.66, 587.33, time, 0.07, "square", 0.32);
          } else if (note.type === "hold") {
            this._sweep(440, 659.25, time, 0.12, "triangle", 0.28);
          } else {
            this._sweep(523.25, 880, time, 0.09, "triangle", 0.26);
          }
        }
      }
    });
  }

  playHitSound(judgment, noteType = "tap") {
    if (this.muted) return;
    this.init();
    const now = this.ctx.currentTime;

    if (judgment.includes("BOP")) {
      if (noteType === "heartbeat") {
        // 리듬 닥터 7박 제세동기 강타 사운드!
        this._kick(now);
        [523.25, 783.99, 1046.5, 1567.98].forEach((f, i) => {
          this._tone(f, now + i * 0.015, 0.2, "sawtooth", 0.28);
        });
      } else if (noteType === "accent" || judgment === "RELEASE BOP!") {
        [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, idx) => {
          this._tone(f, now + idx * 0.018, 0.15, "square", 0.25);
        });
      } else if (noteType === "offbeat") {
        // 엇박 펑키 코드 스냅
        this._tone(587.33, now, 0.11, "square", 0.32);
        this._tone(880.0, now + 0.015, 0.12, "triangle", 0.32);
        this._snare(now);
      } else {
        this._tone(523.25, now, 0.11, "triangle", 0.35);
        this._tone(783.99, now + 0.02, 0.13, "square", 0.28);
        this._snare(now);
      }
    } else if (judgment === "GOOD" || judgment === "HOLDING...") {
      this._tone(493.88, now, 0.09, "triangle", 0.28);
    } else {
      this._sweep(155, 70, now, 0.16, "sawtooth", 0.32);
    }
  }

  _tone(freq, startTime, duration, type = "square", vol = 0.2) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(vol, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0008, startTime + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  _sweep(f1, f2, startTime, duration, type = "sine", vol = 0.25) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f1, startTime);
    osc.frequency.exponentialRampToValueAtTime(f2, startTime + duration);
    gain.gain.setValueAtTime(vol, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  _kick(time) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(145, time);
    osc.frequency.exponentialRampToValueAtTime(36, time + 0.11);
    gain.gain.setValueAtTime(0.55, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(time);
    osc.stop(time + 0.13);
  }

  _snare(time) {
    this._sweep(220, 95, time, 0.08, "triangle", 0.3);
    const bufferSize = this.ctx.sampleRate * 0.08;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.setValueAtTime(900, time);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.24, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    noise.start(time);
  }

  _hihat(time, dur = 0.05) {
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.setValueAtTime(5500, time);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.12, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    noise.start(time);
  }
}

window.rhythmAudio = new RhythmAudioEngine();
