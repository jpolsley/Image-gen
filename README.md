# Novel Illustrator — GitHub Pages

A static web page for illustrating a novel with free, open image models.
It runs entirely in the browser and calls public Hugging Face Spaces through
[`@gradio/client`](https://www.gradio.app/guides/getting-started-with-the-js-client) —
no server, no API keys.

## Engines

| Tab    | Engine | Space | Best for |
|--------|--------|-------|----------|
| Create | RealVisXL V5 | [seawolf2357/REALVISXL-V5](https://huggingface.co/spaces/seawolf2357/REALVISXL-V5) | Realistic / cinematic scenes |
| Create | WAI Illustrious | [IbarakiDouji/WAI-NSFW-illustrious-SDXL](https://huggingface.co/spaces/IbarakiDouji/WAI-NSFW-illustrious-SDXL) | Painterly / anime illustration |
| Edit   | Qwen Edit 2509 Fast | [prithivMLmods/Qwen-Image-Edit-2509-LoRAs-Fast](https://huggingface.co/spaces/prithivMLmods/Qwen-Image-Edit-2509-LoRAs-Fast) | Changing an existing image (4-step, fast) |
| Edit   | Qwen-Image-Edit (official) | [Qwen/Qwen-Image-Edit](https://huggingface.co/spaces/Qwen/Qwen-Image-Edit) | Same, when the official demo is up |

These are community demos on free ZeroGPU hardware: any of them can be asleep,
overloaded or out of quota at a given moment. If one fails, pick another engine.
A free Hugging Face token (Advanced settings) raises the per-visitor GPU quota.

Tip for consistent characters: create a character once in the Create tab, then
use the Edit tab on that image to place them in new scenes.

## Deploy

GitHub Pages serves this branch directly (Settings → Pages → Deploy from a branch),
and `.github/workflows/pages.yml` also deploys on push.

## Run locally

```sh
python3 -m http.server 8000
# open http://localhost:8000
```
