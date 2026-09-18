"""Generate the original, offline weapon Foley bundled by the app.

The sounds are synthesized from filtered noise, decaying resonances, and short
reflections.  They deliberately contain no sampled or copyrighted material.
"""

import math
import random
import struct
import wave
from pathlib import Path

SAMPLE_RATE = 44100
OUTPUT = Path(__file__).resolve().parents[1] / "assets" / "audio"
RNG = random.Random(5719)


def noise():
    return RNG.uniform(-1.0, 1.0)


def write_wav(name, duration, sample):
    frames = []
    peak = 0.0
    for i in range(int(duration * SAMPLE_RATE)):
        value = sample(i / SAMPLE_RATE)
        frames.append(value)
        peak = max(peak, abs(value))

    # Preserve impact while leaving headroom for overlapping automatic fire.
    gain = 0.84 / max(peak, 0.001)
    pcm = b"".join(
        struct.pack("<h", int(max(-1.0, min(1.0, value * gain)) * 32767))
        for value in frames
    )
    with wave.open(str(OUTPUT / name), "wb") as file:
        file.setnchannels(1)
        file.setsampwidth(2)
        file.setframerate(SAMPLE_RATE)
        file.writeframes(pcm)


def pistol(t):
    # Compact muzzle crack, slide snap, and a restrained indoor reflection.
    crack = noise() * math.exp(-t * 75) if t < 0.09 else 0
    body = (math.sin(2 * math.pi * 118 * t) * 0.34 + math.sin(2 * math.pi * 285 * t) * 0.13) * math.exp(-t * 18)
    slide = noise() * math.exp(-(t - 0.045) * 105) * 0.20 if 0.045 < t < 0.105 else 0
    reflection = noise() * math.exp(-(t - 0.12) * 19) * 0.10 if t > 0.12 else 0
    return crack * 0.72 + body + slide + reflection


def rifle(t):
    # Short, hard gas-operated rifle report with a mechanical bolt follow-up.
    blast = noise() * math.exp(-t * 92) if t < 0.075 else 0
    thump = (math.sin(2 * math.pi * 82 * t) * 0.45 + math.sin(2 * math.pi * 176 * t) * 0.16) * math.exp(-t * 26)
    bolt = noise() * math.exp(-(t - 0.055) * 135) * 0.26 if 0.055 < t < 0.12 else 0
    room = noise() * math.exp(-(t - 0.11) * 27) * 0.09 if t > 0.11 else 0
    return blast * 0.88 + thump + bolt + room


def smg(t):
    blast = noise() * math.exp(-t * 120) if t < 0.055 else 0
    body = (math.sin(2 * math.pi * 145 * t) * 0.29 + math.sin(2 * math.pi * 330 * t) * 0.10) * math.exp(-t * 34)
    bolt = noise() * math.exp(-(t - 0.036) * 170) * 0.20 if 0.036 < t < 0.085 else 0
    return blast * 0.65 + body + bolt


def shotgun(t):
    blast = noise() * math.exp(-t * 48) if t < 0.16 else 0
    pressure = (math.sin(2 * math.pi * 48 * t) * 0.72 + math.sin(2 * math.pi * 104 * t) * 0.20) * math.exp(-t * 8)
    tail = noise() * math.exp(-(t - 0.15) * 7) * 0.16 if t > 0.15 else 0
    return blast + pressure + tail


def machinegun(t):
    blast = noise() * math.exp(-t * 105) if t < 0.07 else 0
    body = (math.sin(2 * math.pi * 72 * t) * 0.50 + math.sin(2 * math.pi * 156 * t) * 0.14) * math.exp(-t * 24)
    mechanism = noise() * math.exp(-(t - 0.04) * 145) * 0.28 if 0.04 < t < 0.11 else 0
    return blast * 0.90 + body + mechanism


def sniper(t):
    # A larger initial pressure wave followed by a longer low-frequency tail.
    blast = noise() * math.exp(-t * 58) if t < 0.13 else 0
    pressure = (math.sin(2 * math.pi * 57 * t) * 0.65 + math.sin(2 * math.pi * 133 * t) * 0.19) * math.exp(-t * 9)
    echo = noise() * math.exp(-(t - 0.19) * 8) * 0.19 if t > 0.19 else 0
    ring = math.sin(2 * math.pi * 226 * t) * math.exp(-(t - 0.05) * 13) * 0.10 if t > 0.05 else 0
    return blast * 0.95 + pressure + echo + ring


def reload_sound(t):
    # Magazine handling: metal body click, insertion clack, then charging snap.
    click_a = noise() * math.exp(-(t - 0.04) * 150) * 0.42 if 0.04 < t < 0.09 else 0
    click_b = noise() * math.exp(-(t - 0.29) * 105) * 0.58 if 0.29 < t < 0.38 else 0
    rack = noise() * math.exp(-(t - 0.52) * 90) * 0.48 if 0.52 < t < 0.64 else 0
    metal = (
        math.sin(2 * math.pi * 1640 * t) * math.exp(-abs(t - 0.31) * 36) * 0.14
        + math.sin(2 * math.pi * 920 * t) * math.exp(-abs(t - 0.54) * 29) * 0.12
    )
    return click_a + click_b + rack + metal


OUTPUT.mkdir(parents=True, exist_ok=True)
write_wav("pistol-shot.wav", 0.42, pistol)
write_wav("smg-shot.wav", 0.22, smg)
write_wav("rifle-shot.wav", 0.30, rifle)
write_wav("shotgun-shot.wav", 0.78, shotgun)
write_wav("sniper-shot.wav", 0.90, sniper)
write_wav("machinegun-shot.wav", 0.28, machinegun)
write_wav("reload.wav", 0.82, reload_sound)
print(f"Wrote original weapon audio to {OUTPUT}")