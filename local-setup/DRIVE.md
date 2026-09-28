# My AI drive: what it is and how it's set up

Paste this into a new chat so the assistant understands my setup.

## Hardware
- **Flash drive** named **AIRDRIVE**, 250 GB, formatted **exFAT** (readable on Mac and Windows).
  Measured write speed about 24 MB/s (slow). It once dropped its connection during
  heavy small-file writes, so keep downloads/caches off it where possible and plug it
  directly into the Mac (no hub).
- **Main computer:** MacBook Pro 14" (2021), **Apple M1 Pro, 16 GB memory**, macOS Tahoe.
  This is a work-issued Mac. (An older Intel Mac with 16 GB can't run these models.)

## Layout
```
AIRDRIVE  (exFAT, 250 GB)
├── AIKit.sparsebundle      ← a Mac disk image (APFS, max 200 GB, grows as needed)
│                             Double-click it to mount it as the "AIKIT" drive.
└── (other files; exFAT so Windows can read them)

AIKIT  (APFS, lives inside AIKit.sparsebundle; mounts at /Volumes/AIKIT)
├── Start ComfyUI.command   ← double-click to start; opens the simple page
├── tools/                  ← uv + a private Python 3.12 (nothing installed on the Mac)
└── ComfyUI/                ← ComfyUI (latest), with its own .venv (PyTorch for Apple Silicon)
    ├── custom_nodes/
    │   ├── ComfyUI-GGUF/           ← loads compressed .gguf models
    │   └── aikit-simple-ui/        ← my simple page at http://127.0.0.1:1234/simple
    ├── models/
    │   ├── checkpoints/Qwen-Rapid-AIO-NSFW-v23.safetensors   (28 GB, too big for 16 GB RAM)
    │   ├── unet/Qwen-Rapid-NSFW-v23_Q3_K.gguf                (10 GB, the one I use)
    │   ├── text_encoders/qwen_2.5_vl_7b_fp8_scaled.safetensors
    │   └── vae/qwen_image_vae.safetensors
    ├── user/default/workflows/     ← saved ComfyUI workflows (.json)
    └── output/                     ← every image I make is saved here
```

**Why a disk image inside the drive:** Python programs can't run from an exFAT drive on a
Mac (no symlink support), so everything that runs lives in the APFS image **AIKIT**.
The image and everything in it only works on **Apple Silicon Macs** (M1 or newer).

## How I use it
- **Start:** plug in AIRDRIVE, double-click **`Start AI.command`** on it. It opens AIKIT,
  starts ComfyUI and opens the simple page at `http://127.0.0.1:1234/simple`
  (ComfyUI's full editor is at `http://127.0.0.1:1234`). Keep its Terminal window open.
- **Stop:** double-click **`Stop AI.command`** on AIRDRIVE. It quits ComfyUI, ejects AIKIT,
  then ejects AIRDRIVE. Unplug when AIRDRIVE disappears from Finder.
- The simple page has three tabs: edit a picture, put a character in a scene
  (Picture 1 = scene, Picture 2 = character), or create from a description.
- Manual way (if the buttons fail): double-click `AIKit.sparsebundle`, then
  `AIKIT/Start ComfyUI.command`; to quit, Ctrl+C in its Terminal, eject AIKIT, then AIRDRIVE.

## Model notes
- The model is **Qwen-Image-Edit 2511**, "Rapid AIO v23" (4-step) community merge, GGUF Q3_K.
  Settings: steps 4, cfg 1, sampler `sa_solver`, scheduler `beta`. In prompts,
  refer to images as "Picture 1" / "Picture 2" (that's how the model labels them).
- 16 GB memory is the limit: the 28 GB file gets `Killed: 9`. Keep output around 512 px.
- Setup scripts live in my GitHub repo `jpolsley/Image-gen`, folder `local-setup/`
  (branch `claude/github-qwen-image-gen-0wx25d`): `setup-aikit.sh`, `add-lite-qwen.sh`,
  `add-simple-ui.sh`, `add-launchers.sh`.

## Adding more things
- **New AI models** go in the matching `AIKIT/ComfyUI/models/<type>/` folder
  (e.g. LoRAs in `models/loras/`).
- **Anything that runs** (programs, Python tools) goes inside **AIKIT**, not the exFAT part.
- **Plain files** (documents, images, backups) can go on either.
- AIKIT's current size limit is 200 GB. It can be grown later with `hdiutil resize`.
