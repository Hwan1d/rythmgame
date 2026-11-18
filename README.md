# BITS & GROOVES — PyScript 16-Bit Rhythm Arcade

- **GitHub 저장소 주소**: https://github.com/Hwan1d/rythmgame
- **웹 즉시 실행 주소 (GitHub Pages + PyScript)**: https://hwan1d.github.io/rythmgame/

《Bits & Bops》 및 《리듬 닥터(Rhythm Doctor)》의 감성을 담아 **브라우저 내장 Python(PyScript / Pyodide) 엔진(`rhythm_engine.py`)** 과 **6채널 16비트 칩튠 신디사이저(`music.js`)**, **16비트 도트 애니메이션(`game.js`)** 으로 구현한 리듬 게임입니다.

## 최적화된 프로젝트 구조
```text
rithm/
├── index.html            # PyScript 런타임 및 16비트 아케이드 메인 엔트리
├── rhythm_engine.py      # [Python] 채보 생성, 정박/엇박/홀드/7박 판정 및 랭크 산출 엔진
├── static/
│   ├── style.css         # 16비트 픽셀 UI 및 CRT 스캔라인 스타일
│   ├── music.js          # Web Audio API 0ms 하드웨어 클럭 6채널 칩튠 신디사이저
│   └── game.js           # 60 FPS 픽셀 비네트 애니메이션 렌더러 & PyScript 연동 브릿지
└── assets/
    └── sprites/          # 16비트 도트 캐릭터 스프라이트 (DJ Bopper, 물개, 로봇, 고양이)
```

## 조작법
- **`Space` / `Z` / `마우스 좌클릭`**: 정박 탭 · `◇ 엇박` · `꾹! HOLD -> 떼기!` · `💓 7박!`
- **`X` / `→ 방향키` / `마우스 우클릭`**: `★ X` 스타 액센트 노트
- **`ESC`**: 주크박스 스테이지 선택 화면으로 복귀
