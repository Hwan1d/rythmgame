# BITS & GROOVES — 16-Bit Call & Response Rhythm Arcade

- **GitHub 저장소 주소**: https://github.com/Hwan1d/rythmgame
- **웹 즉시 실행 주소 (GitHub Pages)**: https://hwan1d.github.io/rythmgame/

《Bits & Bops》 및 《리듬 닥터(Rhythm Doctor)》의 감성을 담아 **직접 제작한 16비트 도트 그래픽 애니메이션**과 **오차 0ms 하드웨어 오디오 클럭(`AudioContext.currentTime`) 기반 6채널 칩튠/펑크 신디사이저 음악**으로 구현한 리듬 게임입니다.

## 주요 특징

### 1. 4개의 개성 넘치는 16비트 비네트 리듬 스테이지
1. **📸 STAGE 01: SNAP & BOP! (물개 파파라치 · 120 BPM 트로피컬 펑크)**
   - 바다에서 튀어오른 아기 물개가 카메라 뷰파인더 정중앙에서 포즈를 취하는 순간 셔터(`Space / 좌클릭`)를 눌러 폴라로이드 특종 사진을 찍으세요!
2. **🔨 STAGE 02: CLOCKWORK BOT (태엽 로봇 공방 · 126 BPM 일렉트로 신스팝)**
   - 컨베이어 벨트를 따라 이동하는 태엽 로봇이 해머 아래에 도달하는 정박에 볼트를 조여 로봇을 가동시키세요!
3. **🥞 STAGE 03: RHYTHM DOCTOR DINER (리듬 팬케이크 & 7박 심전도 · 132 BPM 재즈 스윙)**
   - 셰프 고양이가 높이 토스한 팬케이크를 정박·엇박·7박 심전도 리듬에 맞춰 뒤집어 팬케이크 타워를 쌓으세요!
4. **🎸 FINAL REMIX: OVERDRIVE BOPS REMIX! (올스타 리믹스 · 138 BPM 하이에너지 칩튠)**
   - 마디마다 물개·로봇·고양이 스테이지가 실시간으로 전환되는 하이에너지 그랜드 피날레 리믹스!

### 2. 다채로운 리듬 노트 기믹
- **정박(`SPACE`) & 스타 액센트(`★ X`)**
- **`◇ 엇박` (Syncopation)**: 8분음표 및 트레시요(3-3-2) 16분음표 엇박 다이아몬드 노트
- **`꾹! HOLD ━━▶ 떼기!`**: 차징 신스 사운드와 함께 누르고 있다가 끝 지점에서 손을 떼는 롱노트
- **`💓 7박!` (Rhythm Doctor ECG)**: `1 - 2 - 3 - 4 - 5 - 6 - [7!]` 심전도 파형 모니터와 함께 7번째 박자에 치는 제세동기 노트

## 조작법
- **`Space` / `Z` / `마우스 좌클릭`**: 기본 리듬 히트 & 롱노트 홀드 (`BOP!`)
- **`X` / `→ 방향키` / `마우스 우클릭`**: ★ 스타 액센트 히트 (`SUPER BOP!`)
- **`ESC`**: 주크박스 스테이지 선택 화면으로 복귀

## 실행 방법

### 1. 웹 브라우저 즉시 실행 (GitHub Pages)
- https://hwan1d.github.io/rythmgame/ 접속

### 2. 로컬 Python 서버 실행 (`app.py`)
```bash
cd /Users/hwan1d/Desktop/DCO/rithm
python3 app.py
```
실행 시 브라우저에서 **`http://127.0.0.1:8095`** 가 자동으로 열립니다.
