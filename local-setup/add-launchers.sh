#!/bin/bash
# Puts two one-click buttons on the AIRDRIVE flash drive:
#   "Start AI.command" - opens AIKIT, starts ComfyUI, opens the simple page
#   "Stop AI.command"  - stops ComfyUI and safely ejects AIKIT, then the drive
set -euo pipefail

DRIVE="${1:-/Volumes/AIRDRIVE}"
if [ ! -e "$DRIVE/AIKit.sparsebundle" ]; then
  echo "Can't find $DRIVE/AIKit.sparsebundle. Is the flash drive plugged in?" >&2
  exit 1
fi

cat > "$DRIVE/Start AI.command" <<'START'
#!/bin/bash
# One-click start: open AIKIT (if needed), start ComfyUI, open the simple page.
DRIVE="$(cd "$(dirname "$0")" && pwd)"
cd "$HOME"
if [ ! -d /Volumes/AIKIT/ComfyUI ]; then
  echo "Opening AIKIT..."
  hdiutil attach "$DRIVE/AIKit.sparsebundle" >/dev/null || { echo "Couldn't open AIKIT. Press Enter to close."; read -r; exit 1; }
fi
if curl -fs -o /dev/null http://127.0.0.1:1234/simple; then
  echo "Already running - opening the page."
  open http://127.0.0.1:1234/simple
  exit 0
fi
echo "Starting... the page opens by itself in a minute. Keep this window open while you work."
exec "/Volumes/AIKIT/Start ComfyUI.command"
START

cat > "$DRIVE/Stop AI.command" <<'STOP'
#!/bin/bash
# One-click stop: quit ComfyUI, eject AIKIT, then eject the flash drive.
DRIVE="$(cd "$(dirname "$0")" && pwd)"
cd "$HOME"
echo "Stopping ComfyUI..."
pkill -f "main.py --port 1234" 2>/dev/null
for _ in $(seq 1 15); do pgrep -f "main.py --port 1234" >/dev/null || break; sleep 1; done
pkill -9 -f "main.py --port 1234" 2>/dev/null
if [ -d /Volumes/AIKIT ]; then
  echo "Ejecting AIKIT..."
  hdiutil detach /Volumes/AIKIT >/dev/null 2>&1 || hdiutil detach -force /Volumes/AIKIT >/dev/null 2>&1 || {
    echo "AIKIT is still in use (a Finder window or app may have a file open). Close it and try again."
    read -r; exit 1; }
fi
echo "Ejecting the flash drive... wait until it disappears from Finder, then unplug."
# Eject after this script exits, since the script itself lives on the drive.
nohup bash -c "sleep 2; diskutil eject '$DRIVE' >/dev/null 2>&1" >/dev/null 2>&1 &
exit 0
STOP

chmod +x "$DRIVE/Start AI.command" "$DRIVE/Stop AI.command"
echo "All set. On the flash drive, double-click 'Start AI.command' to begin and 'Stop AI.command' when done."
