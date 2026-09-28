#!/bin/bash
# One-time setup: builds a self-contained ComfyUI on the AIKIT drive image.
# Everything (uv, Python, ComfyUI, packages, cache) lives under /Volumes/AIKIT;
# nothing is installed on the Mac itself. Apple Silicon Macs only.
set -euo pipefail

ROOT="/Volumes/AIKIT"
if [ ! -d "$ROOT" ]; then
  echo "AIKIT is not mounted. Double-click AIKit.sparsebundle on AIDRIVE first." >&2
  exit 1
fi
if [ "$(uname -m)" != "arm64" ]; then
  echo "This setup is for Apple Silicon (M1/M2/M3/M4) Macs." >&2
  exit 1
fi

TOOLS="$ROOT/tools"
mkdir -p "$TOOLS"
export UV_INSTALL_DIR="$TOOLS"
export INSTALLER_NO_MODIFY_PATH=1
export UV_PYTHON_INSTALL_DIR="$TOOLS/python"
# The download cache is disposable and thousands of small files; keep it in
# the Mac's temp folder so the external drive only receives the final install.
export UV_CACHE_DIR="${TMPDIR:-/tmp}/aikit-uv-cache"
# Copy files instead of hard-linking them from the cache (different disks).
export UV_LINK_MODE=copy

echo "==> Installing uv (Python manager) onto the drive"
if [ ! -x "$TOOLS/uv" ]; then
  curl -LsSf https://astral.sh/uv/install.sh | sh
fi
UV="$TOOLS/uv"

echo "==> Downloading ComfyUI onto the drive"
if [ ! -d "$ROOT/ComfyUI" ]; then
  curl -L https://github.com/comfyanonymous/ComfyUI/archive/refs/heads/master.tar.gz | tar xz -C "$ROOT"
  mv "$ROOT/ComfyUI-master" "$ROOT/ComfyUI"
fi
cd "$ROOT/ComfyUI"

echo "==> Creating ComfyUI's private Python"
if [ ! -x .venv/bin/python ]; then
  "$UV" venv --python 3.12 .venv
fi
PY="$ROOT/ComfyUI/.venv/bin/python"

echo "==> Installing PyTorch (Apple Silicon GPU support included)"
"$UV" pip install --python "$PY" torch torchvision torchaudio

echo "==> Installing ComfyUI's requirements"
if ! "$UV" pip install --python "$PY" -r requirements.txt; then
  echo "    Retrying without optional packages that have no Mac build"
  grep -v -i "comfy-angle" requirements.txt > requirements-mac.txt
  "$UV" pip install --python "$PY" -r requirements-mac.txt
fi

mkdir -p models/checkpoints user/default/workflows

echo "==> Adding the start button"
cat > "$ROOT/Start ComfyUI.command" <<'START'
#!/bin/bash
cd /Volumes/AIKIT/ComfyUI || { echo "AIKIT is not mounted. Double-click AIKit.sparsebundle first."; read -r; exit 1; }
exec ./.venv/bin/python main.py --port 1234 --auto-launch
START
chmod +x "$ROOT/Start ComfyUI.command"

rm -rf "$UV_CACHE_DIR"

echo
echo "All set. Put models in:     $ROOT/ComfyUI/models/checkpoints/"
echo "Put workflows in:           $ROOT/ComfyUI/user/default/workflows/"
echo "To start: double-click 'Start ComfyUI.command' on AIKIT."
