"""Speak sentences with Kokoro, an open-source neural voice.

    python3 tour/speak.py job.json

The job file names a voice and lists sentences with the sound file each
should become:

    {"voice": "af_heart", "speed": 1.0,
     "items": [{"text": "The game is a function.", "file": "out/a1b2.wav"}]}

The model is loaded once and speaks every sentence. It expects the model
files in ~/.cache/kokoro (or the folder named by KOKORO_HOME); tour/README.md
says where to get them.
"""
import json
import os
import sys

import soundfile as sf
from kokoro_onnx import Kokoro

home = os.environ.get("KOKORO_HOME", os.path.expanduser("~/.cache/kokoro"))
job = json.load(open(sys.argv[1]))
voice = job["voice"]
# Voice names starting with "b" are British; the rest used here are American.
lang = "en-gb" if voice.startswith("b") else "en-us"

kokoro = Kokoro(f"{home}/kokoro-v1.0.onnx", f"{home}/voices-v1.0.bin")
for item in job["items"]:
    samples, rate = kokoro.create(item["text"], voice=voice, speed=job.get("speed", 1.0), lang=lang)
    sf.write(item["file"], samples, rate, subtype="PCM_16")
print(f"spoke {len(job['items'])} sentences as {voice}")
