"""
BITS & GROOVES — PyScript (WebAssembly Python) 리듬 코어 엔진
GitHub Pages(github.io) 브라우저 환경에서 실제 Python 코드로 실행되며,
채보(Beatmap) 생성, 정박/엇박/홀드/7박 심전도 판정, 콤보·점수·랭크 산출을 수행합니다.
"""

import json
from pyodide.ffi import create_proxy, to_js
from js import window, document, Object


STAGE_CONFIG = {
    "seal": {"bpm": 120, "total_beats": 68, "title": "SNAP & BOP! (물개 파파라치)"},
    "bot": {"bpm": 126, "total_beats": 68, "title": "CLOCKWORK BOT (태엽 로봇 공방)"},
    "cat": {"bpm": 132, "total_beats": 72, "title": "RHYTHM DOCTOR DINER (7박 심박 & 엇박)"},
    "remix": {"bpm": 138, "total_beats": 84, "title": "OVERDRIVE BOPS REMIX! (올스타 리믹스)"},
}


class PythonRhythmEngine:
    def __init__(self):
        self.stage_id = "seal"
        self.chart = []
        self.score = 0
        self.combo = 0
        self.max_combo = 0
        self.groove = 55
        self.counts = {"bop": 0, "good": 0, "miss": 0}
        self.active_hold_idx = -1

    def build_chart(self, stage_id: str) -> list[dict]:
        """Python에서 스테이지별 정박·엇박(◇)·롱노트(HOLD)·리듬닥터 7박(💓) 채보를 생성합니다."""
        self.stage_id = stage_id if stage_id in STAGE_CONFIG else "seal"
        self.score = 0
        self.combo = 0
        self.max_combo = 0
        self.groove = 55
        self.counts = {"bop": 0, "good": 0, "miss": 0}
        self.active_hold_idx = -1

        total = STAGE_CONFIG[self.stage_id]["total_beats"]
        notes = []

        for bar_start in range(4, total - 4, 4):
            bar_idx = (bar_start - 4) // 4
            sub_mode = (
                ["seal", "bot", "cat"][bar_idx % 3]
                if self.stage_id == "remix"
                else self.stage_id
            )
            pattern = bar_idx % 5

            if pattern == 0:
                # 정박 + 8분음표 엇박(&) 콤비네이션
                notes.append({
                    "cueBeat": bar_start + 0.0,
                    "prepBeat": bar_start + 0.5,
                    "hitBeat": bar_start + 1.0,
                    "type": "tap",
                    "scene": sub_mode,
                    "judged": False,
                })
                notes.append({
                    "cueBeat": bar_start + 1.0,
                    "prepBeat": bar_start + 2.0,
                    "hitBeat": bar_start + 2.5,
                    "type": "offbeat",
                    "scene": sub_mode,
                    "judged": False,
                })
                notes.append({
                    "cueBeat": bar_start + 1.5,
                    "prepBeat": bar_start + 2.5,
                    "hitBeat": bar_start + 3.0,
                    "type": "tap",
                    "scene": sub_mode,
                    "judged": False,
                })
            elif pattern == 1:
                # 롱노트(HOLD & RELEASE) + 엇박 마무리
                notes.append({
                    "cueBeat": bar_start + 0.0,
                    "prepBeat": bar_start + 0.5,
                    "hitBeat": bar_start + 1.0,
                    "endBeat": bar_start + 2.5,
                    "type": "hold",
                    "scene": sub_mode,
                    "judged": False,
                    "holding": False,
                })
                notes.append({
                    "cueBeat": bar_start + 2.5,
                    "prepBeat": bar_start + 3.0,
                    "hitBeat": bar_start + 3.5,
                    "type": "offbeat",
                    "scene": sub_mode,
                    "judged": False,
                })
            elif pattern == 2:
                # 리듬 닥터 오마주: 1-2-3-4-5-6-[7!] 심전도 하트비트
                notes.append({
                    "cueBeat": bar_start + 0.0,
                    "prepBeat": bar_start + 2.5,
                    "hitBeat": bar_start + 3.0,
                    "pulseBeats": [bar_start + i * 0.5 for i in range(6)],
                    "type": "heartbeat",
                    "scene": sub_mode,
                    "judged": False,
                })
            elif pattern == 3:
                # 트레시요(Tresillo 3-3-2) 16분음표 엇박 그루브
                notes.append({
                    "cueBeat": bar_start + 0.0,
                    "prepBeat": bar_start + 0.5,
                    "hitBeat": bar_start + 1.0,
                    "type": "tap",
                    "scene": sub_mode,
                    "judged": False,
                })
                notes.append({
                    "cueBeat": bar_start + 0.5,
                    "prepBeat": bar_start + 1.25,
                    "hitBeat": bar_start + 1.75,
                    "type": "offbeat",
                    "scene": sub_mode,
                    "judged": False,
                })
                notes.append({
                    "cueBeat": bar_start + 1.0,
                    "prepBeat": bar_start + 2.0,
                    "hitBeat": bar_start + 2.5,
                    "type": "offbeat",
                    "scene": sub_mode,
                    "judged": False,
                })
                notes.append({
                    "cueBeat": bar_start + 1.5,
                    "prepBeat": bar_start + 2.5,
                    "hitBeat": bar_start + 3.0,
                    "type": "accent",
                    "scene": sub_mode,
                    "judged": False,
                })
            else:
                # 2박 롱노트 홀드 + 스타 액센트 피니시
                notes.append({
                    "cueBeat": bar_start + 0.0,
                    "prepBeat": bar_start + 0.5,
                    "hitBeat": bar_start + 1.0,
                    "endBeat": bar_start + 3.0,
                    "type": "hold",
                    "scene": sub_mode,
                    "judged": False,
                    "holding": False,
                })
                notes.append({
                    "cueBeat": bar_start + 2.5,
                    "prepBeat": bar_start + 3.0,
                    "hitBeat": bar_start + 3.5,
                    "type": "accent",
                    "scene": sub_mode,
                    "judged": False,
                })

        self.chart = notes
        return notes

    def get_chart_json(self, stage_id: str) -> str:
        return json.dumps(self.build_chart(stage_id))

    def evaluate_hit(self, diff: float, note_type: str, input_type: str) -> str:
        """Python에서 입력 타이밍 오차(diff)를 바탕으로 판정 및 점수를 계산합니다."""
        wrong_btn = note_type == "accent" and input_type != "accent"
        if diff <= 0.17 and not wrong_btn:
            label = "BOP!"
            color = "#ffd166"
        elif diff <= 0.32:
            label = "GOOD"
            color = "#38bdf8"
        else:
            label = "MISS"
            color = "#ff5964"

        return json.dumps(self._apply_judgment(label, note_type, color))

    def evaluate_release(self, release_diff: float) -> str:
        """롱노트(HOLD) 끝에서 손을 뗄 때의 오차를 Python에서 판정합니다."""
        if release_diff <= 0.26:
            label = "RELEASE BOP!"
            color = "#06d6a0"
        elif release_diff <= 0.48:
            label = "GOOD"
            color = "#38bdf8"
        else:
            label = "MISS"
            color = "#ff5964"

        return json.dumps(self._apply_judgment(label, "hold", color))

    def register_miss(self, note_type: str) -> str:
        return json.dumps(self._apply_judgment("MISS", note_type, "#ff5964"))

    def add_hold_tick(self, dt: float) -> int:
        self.score += int(round(450 * dt))
        return self.score

    def _apply_judgment(self, label: str, note_type: str, color: str) -> dict:
        is_perfect = label in ("BOP!", "RELEASE BOP!")
        if is_perfect:
            self.counts["bop"] += 1
            self.combo += 1
            self.max_combo = max(self.max_combo, self.combo)
            base_pts = {
                "heartbeat": 1800,
                "hold": 1600,
                "accent": 1500,
                "offbeat": 1300,
                "tap": 1000,
            }.get(note_type, 1000)
            self.score += base_pts + self.combo * 50
            self.groove = min(100, self.groove + 6)
        elif label == "GOOD":
            self.counts["good"] += 1
            self.combo += 1
            self.max_combo = max(self.max_combo, self.combo)
            self.score += 550 + self.combo * 20
            self.groove = min(100, self.groove + 2)
        else:
            self.counts["miss"] += 1
            self.combo = 0
            self.groove = max(5, self.groove - 9)

        popup = label
        if is_perfect:
            if note_type == "offbeat":
                popup = "◇ 엇박 BOP! ◇"
            elif note_type == "heartbeat":
                popup = "💓 7th BEAT PERFECT!!"
            elif note_type == "hold":
                popup = "⚡ HOLD & RELEASE BOP!!"
            elif note_type == "accent":
                popup = "★ SUPER BOP!! ★"

        return {
            "label": label,
            "popup": popup,
            "color": color,
            "score": self.score,
            "combo": self.combo,
            "maxCombo": self.max_combo,
            "groove": self.groove,
            "counts": self.counts,
        }

    def get_final_report(self) -> str:
        total_notes = max(1, len(self.chart))
        acc = ((self.counts["bop"] * 1.0 + self.counts["good"] * 0.6) / total_notes) * 100.0

        if acc >= 90:
            rank = "S"
            headline = "★ RHYTHM DOCTOR & BOP MASTER! ★"
            comment = "정박, 엇박, 홀드 릴리즈, 7박 심폐소생 비트까지 Python 엔진으로 완벽 마스터!"
        elif acc >= 76:
            rank = "A"
            headline = "AWESOME GROOVE!"
            comment = "엇박과 롱노트 감각이 훌륭합니다! S 랭크까지 한 걸음 남았어요!"
        elif acc >= 55:
            rank = "B"
            headline = "SOLID RHYTHM!"
            comment = "좋아요! 홀드 노트는 끝 지점(떼기!)에서 손을 떼면 점수가 크게 올라갑니다!"
        else:
            rank = "C"
            headline = "KEEP GROOVING!"
            comment = "오디오 큐 사운드와 엇박(◇), 7박 심박동 리듬에 맞춰 다시 도전해 보세요!"

        return json.dumps({
            "score": self.score,
            "accuracy": round(acc, 1),
            "rank": rank,
            "headline": headline,
            "comment": comment,
            "maxCombo": self.max_combo,
            "counts": self.counts,
        })


py_engine = PythonRhythmEngine()

# JavaScript 렌더러/오디오 스케줄러에서 직접 호출할 수 있도록 window에 Python 프록시 바인딩
window.pyRhythm = Object.fromEntries(
    to_js([
        ["getChartJson", create_proxy(py_engine.get_chart_json)],
        ["evaluateHit", create_proxy(py_engine.evaluate_hit)],
        ["evaluateRelease", create_proxy(py_engine.evaluate_release)],
        ["registerMiss", create_proxy(py_engine.register_miss)],
        ["addHoldTick", create_proxy(py_engine.add_hold_tick)],
        ["getFinalReport", create_proxy(py_engine.get_final_report)],
    ])
)

badge = document.getElementById("pyStatusBadge")
if badge:
    badge.textContent = "🐍 PyScript (Python 3.12) Engine: READY"
    badge.classList.add("ready")
