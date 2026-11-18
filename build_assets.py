"""
Bits & Bops 스타일 16비트 픽셀 아트 스프라이트(PNG) & 리듬 사운드(WAV) 에셋 빌더
"""

import math
import struct
import wave
from pathlib import Path
from PIL import Image, ImageDraw

BASE_DIR = Path(__file__).resolve().parent
SPRITES_DIR = BASE_DIR / "assets" / "sprites"
AUDIO_DIR = BASE_DIR / "assets" / "audio"


def ensure_dirs() -> None:
    SPRITES_DIR.mkdir(parents=True, exist_ok=True)
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)


def draw_pixel_art(grid: list[str], palette: dict[str, tuple[int, int, int, int]], scale: int = 4) -> Image.Image:
    h = len(grid)
    w = len(grid[0]) if h else 16
    img = Image.new("RGBA", (w * scale, h * scale), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    for y, row in enumerate(grid):
        for x, ch in enumerate(row):
            if ch in palette:
                draw.rectangle(
                    [x * scale, y * scale, (x + 1) * scale - 1, (y + 1) * scale - 1],
                    fill=palette[ch],
                )
    return img


def generate_sprites() -> None:
    # 1. 마스코트 DJ 강아지 "BOPPER" (헤드폰을 쓴 16비트 카툰 캐릭터)
    bopper_grid = [
        "....RRRRRRRR....",
        "..RRRRRRRRRRRR..",
        ".RRKOOOOOOOOOKRR",
        ".RKOYYYYYYYYYOKR",
        "RKOYYYYYYYYYYYOK",
        "RKOYYKKYYYKKYYOK",
        "RKOYYKWYYYKWYYOK",
        ".KOYYYYNNNYYYYOK",
        "..OYYYYWWWYYYYO.",
        "...OOOOOOOOOOO..",
        "..BBBBBBBBBBBBB.",
        ".BBBBYYYYYYYBBBB",
        ".BBB..BBBBBB..BB",
        "......KK..KK....",
    ]
    bopper_pal = {
        "R": (239, 68, 68, 255),
        "K": (15, 23, 42, 255),
        "O": (245, 158, 11, 255),
        "Y": (254, 240, 138, 255),
        "W": (255, 255, 255, 255),
        "N": (30, 41, 59, 255),
        "B": (59, 130, 246, 255),
    }
    draw_pixel_art(bopper_grid, bopper_pal, scale=5).save(SPRITES_DIR / "dj_bopper.png")

    # 2. 물개 파파라치 (Stage 1: Snap & Bop)
    seal_grid = [
        ".....CCCCCC.....",
        "...CCCCCCCCCC...",
        "..CCCCCCCCCCCC..",
        "..CCKWCCCCWKCC..",
        "..CCKKCCCCKKCC..",
        "..CCCCCNNCCCCC..",
        "...CCCWWWWCCC...",
        "..CCCCCCCCCCCC..",
        ".CCCCCCCCCCCCCC.",
        "CCCC.CCCCCC.CCCC",
        ".....CCCCCC.....",
        "....CCCCCCCC....",
    ]
    seal_pal = {
        "C": (125, 211, 252, 255),
        "K": (15, 23, 42, 255),
        "W": (255, 255, 255, 255),
        "N": (244, 63, 94, 255),
    }
    draw_pixel_art(seal_grid, seal_pal, scale=5).save(SPRITES_DIR / "stage_seal.png")

    # 3. 태엽 로봇 (Stage 2: Clockwork Bot)
    bot_grid = [
        ".......YY.......",
        "......YYYY......",
        "...SSSSSSSSSS...",
        "..SBBBBBBBBBBS..",
        "..SBYYBBBBYYBS..",
        "..SBYYBBBBYYBS..",
        "..SBBBBBBBBBBS..",
        "..SBBWWWWWWBBS..",
        "...SSSSSSSSSS...",
        "..YYYYYYYYYYYY..",
        "..YY.YYYYYY.YY..",
        ".....KK..KK.....",
    ]
    bot_pal = {
        "Y": (250, 204, 21, 255),
        "S": (148, 163, 184, 255),
        "B": (30, 58, 138, 255),
        "W": (56, 189, 248, 255),
        "K": (15, 23, 42, 255),
    }
    draw_pixel_art(bot_grid, bot_pal, scale=5).save(SPRITES_DIR / "stage_bot.png")

    # 4. 팬케이크 셰프 고양이 (Stage 3: Flippin' Diner)
    cat_grid = [
        "....WWWWWWWW....",
        "...WWWWWWWWWW...",
        "..RRRRRRRRRRRR..",
        ".PP...PPPP...PP.",
        ".PPPPPPPPPPPPPP.",
        ".PPKKPPPPPPKKPP.",
        ".PPPPPPNNPPPPPP.",
        "..PPPPWWWWPPPP..",
        "...WWWWWWWWWW...",
        "..WWWWWWWWWWWW..",
        "....KK....KK....",
    ]
    cat_pal = {
        "W": (248, 250, 252, 255),
        "R": (239, 68, 68, 255),
        "P": (251, 146, 60, 255),
        "K": (15, 23, 42, 255),
        "N": (244, 114, 182, 255),
    }
    draw_pixel_art(cat_grid, cat_pal, scale=5).save(SPRITES_DIR / "stage_cat.png")


def save_wav(filename: Path, samples: list[float], sr: int = 44100) -> None:
    with wave.open(str(filename), "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        buf = bytearray()
        for s in samples:
            c = max(-1.0, min(1.0, s))
            buf.extend(struct.pack("<h", int(c * 32767)))
        wf.writeframes(bytes(buf))


def generate_audio() -> None:
    sr = 44100
    # 1. BOP! (퍼펙트 히트 사운드: 경쾌한 16비트 코드 차임)
    bop = []
    dur = 0.14
    for i in range(int(sr * dur)):
        t = i / sr
        env = (1.0 - t / dur) ** 1.8
        val = (
            0.45 * math.sin(2 * math.pi * 523.25 * t)
            + 0.35 * math.sin(2 * math.pi * 659.25 * t)
            + 0.35 * math.sin(2 * math.pi * 1046.5 * t)
        ) * env
        bop.append(val)
    save_wav(AUDIO_DIR / "bop_perfect.wav", bop, sr)


if __name__ == "__main__":
    ensure_dirs()
    generate_sprites()
    generate_audio()
    print("RITHM_ASSETS_BUILT")
