#!/bin/bash
# Adds a memory-friendly (GGUF) version of Qwen-Image-Edit Rapid AIO NSFW v23
# to the AIKIT drive, for Macs with 16 GB of memory. Everything goes onto AIKIT.
set -euo pipefail

ROOT="/Volumes/AIKIT"
COMFY="$ROOT/ComfyUI"
if [ ! -x "$COMFY/.venv/bin/python" ]; then
  echo "AIKIT isn't mounted or ComfyUI isn't set up yet. Run setup-aikit.sh first." >&2
  exit 1
fi
UV="$ROOT/tools/uv"
export UV_CACHE_DIR="${TMPDIR:-/tmp}/aikit-uv-cache"
export UV_LINK_MODE=copy
BRANCH_URL="https://raw.githubusercontent.com/jpolsley/Image-gen/claude/github-qwen-image-gen-0wx25d/local-setup"

download() { # url dest
  if [ -s "$2" ]; then echo "    already have $(basename "$2")"; return; fi
  echo "    downloading $(basename "$2")"
  curl -L --fail --retry 5 -C - -o "$2.part" "$1"
  mv "$2.part" "$2"
}

echo "==> Installing the GGUF loader add-on (city96/ComfyUI-GGUF)"
if [ ! -d "$COMFY/custom_nodes/ComfyUI-GGUF" ]; then
  curl -L https://github.com/city96/ComfyUI-GGUF/archive/refs/heads/main.tar.gz | tar xz -C "$COMFY/custom_nodes"
  mv "$COMFY/custom_nodes/ComfyUI-GGUF-main" "$COMFY/custom_nodes/ComfyUI-GGUF"
fi
"$UV" pip install --python "$COMFY/.venv/bin/python" -r "$COMFY/custom_nodes/ComfyUI-GGUF/requirements.txt"

mkdir -p "$COMFY/models/unet" "$COMFY/models/text_encoders" "$COMFY/models/vae" "$COMFY/user/default/workflows"

echo "==> Downloading model files onto AIKIT (about 20 GB; this takes a while)"
download "https://huggingface.co/Novice25/Qwen-Image-Edit-Rapid-AIO-GGUF/resolve/main/v23/Qwen-Rapid-NSFW-v23_Q3_K.gguf" \
  "$COMFY/models/unet/Qwen-Rapid-NSFW-v23_Q3_K.gguf"
download "https://huggingface.co/Comfy-Org/Qwen-Image_ComfyUI/resolve/main/split_files/text_encoders/qwen_2.5_vl_7b_fp8_scaled.safetensors" \
  "$COMFY/models/text_encoders/qwen_2.5_vl_7b_fp8_scaled.safetensors"
download "https://huggingface.co/Comfy-Org/Qwen-Image_ComfyUI/resolve/main/split_files/vae/qwen_image_vae.safetensors" \
  "$COMFY/models/vae/qwen_image_vae.safetensors"

echo "==> Adding the 'Qwen-Lite (16GB Mac)' workflow"
curl -fsSL "$BRANCH_URL/Qwen-Lite-16GB-Mac.json" -o "$COMFY/user/default/workflows/Qwen-Lite (16GB Mac).json"

rm -rf "$UV_CACHE_DIR"
echo
echo "All set. Restart ComfyUI, then open Workflows > 'Qwen-Lite (16GB Mac)'."
