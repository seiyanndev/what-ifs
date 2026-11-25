#!/usr/bin/env bash
# One-time: local neural narrator (Kokoro, Apache-2.0). ~350 MB of model files, offline afterwards.
set -euo pipefail
cd "$(dirname "$0")/.."
python3 -m venv .venv-tts
.venv-tts/bin/pip install -q kokoro-onnx==0.6.1 soundfile
mkdir -p tts-models
base=https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0
[ -s tts-models/kokoro-v1.0.onnx ] || curl -L -o tts-models/kokoro-v1.0.onnx "$base/kokoro-v1.0.onnx"
[ -s tts-models/voices-v1.0.bin ] || curl -L -o tts-models/voices-v1.0.bin "$base/voices-v1.0.bin"
echo "Kokoro narrator ready."
