"""
BITS & BOPS 16-BIT RHYTHM STUDIO - Flask 게임 서버
커스텀 16비트 픽셀 아트 비네트 애니메이션과 샘플 정밀도 칩튠/펑크 신디사이저 리듬 게임
"""

import json
import os
import threading
import webbrowser
from pathlib import Path
from flask import Flask, jsonify, render_template, request, send_from_directory

os.environ["FLASK_SKIP_DOTENV"] = "1"

BASE_DIR = Path(__file__).resolve().parent
RECORDS_PATH = BASE_DIR / "records.json"

app = Flask(__name__)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/assets/<path:filename>")
def serve_assets(filename: str):
    return send_from_directory(BASE_DIR / "assets", filename)


@app.route("/api/records", methods=["GET", "POST"])
def api_records():
    if request.method == "GET":
        if not RECORDS_PATH.exists():
            return jsonify({"records": {}})
        try:
            return jsonify({"records": json.loads(RECORDS_PATH.read_text(encoding="utf-8"))})
        except Exception:
            return jsonify({"records": {}})

    payload = request.get_json(silent=True) or {}
    records = {}
    if RECORDS_PATH.exists():
        try:
            records = json.loads(RECORDS_PATH.read_text(encoding="utf-8"))
        except Exception:
            records = {}

    stage_id = payload.get("stageId")
    score = int(payload.get("score", 0))
    rank = payload.get("rank", "B")
    accuracy = float(payload.get("accuracy", 0))

    if stage_id:
        prev = records.get(stage_id, {})
        if score >= int(prev.get("score", 0)):
            records[stage_id] = {"score": score, "rank": rank, "accuracy": accuracy}
            RECORDS_PATH.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")

    return jsonify({"ok": True, "records": records})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8095"))
    url = f"http://127.0.0.1:{port}"
    print(f"\n🎵 [BITS & BOPS 16-Bit Rhythm] 서버가 시작되었습니다! 브라우저에서 {url} 을 엽니다...\n")
    threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    app.run(host="127.0.0.1", port=port, debug=False)
