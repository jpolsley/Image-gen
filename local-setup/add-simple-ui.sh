#!/bin/bash
# Installs the AIKIT Simple UI (a plain page at /simple on top of ComfyUI)
# and makes 'Start ComfyUI.command' open that page instead of the node editor.
set -euo pipefail

ROOT="/Volumes/AIKIT"
COMFY="$ROOT/ComfyUI"
if [ ! -d "$COMFY/custom_nodes" ]; then
  echo "AIKIT isn't mounted or ComfyUI isn't set up. Double-click AIKit.sparsebundle first." >&2
  exit 1
fi
BASE="https://raw.githubusercontent.com/jpolsley/Image-gen/claude/github-qwen-image-gen-0wx25d/local-setup/simple-ui"
DEST="$COMFY/custom_nodes/aikit-simple-ui"

echo "==> Installing the simple page"
mkdir -p "$DEST/web"
curl -fsSL "$BASE/__init__.py" -o "$DEST/__init__.py"
curl -fsSL "$BASE/web/index.html" -o "$DEST/web/index.html"

echo "==> Updating the start button to open the simple page"
cat > "$ROOT/Start ComfyUI.command" <<'START'
#!/bin/bash
cd /Volumes/AIKIT/ComfyUI || { echo "AIKIT is not mounted. Double-click AIKit.sparsebundle first."; read -r; exit 1; }
# Open the simple page once ComfyUI is up (it can take a minute to start).
( for _ in $(seq 1 180); do
    sleep 2
    if curl -fs -o /dev/null http://127.0.0.1:1234/simple; then open http://127.0.0.1:1234/simple; break; fi
  done ) &
exec ./.venv/bin/python main.py --port 1234
START
chmod +x "$ROOT/Start ComfyUI.command"

echo
echo "All set. Quit ComfyUI (Ctrl+C in its Terminal), then double-click 'Start ComfyUI.command'."
echo "The simple page opens by itself at http://127.0.0.1:1234/simple"
