# Qwen Image Edit — GitHub Pages

A static web page for editing images with natural-language instructions using
[Qwen-Image-Edit](https://huggingface.co/Qwen/Qwen-Image-Edit).

No server needed: the page runs entirely in the browser and calls the official
[`Qwen/Qwen-Image-Edit`](https://huggingface.co/spaces/Qwen/Qwen-Image-Edit)
Hugging Face Space through the [`@gradio/client`](https://www.gradio.app/guides/getting-started-with-the-js-client)
JavaScript library.

## Features

- Upload, drag-and-drop, or paste an input image
- Describe the edit (semantic edits, style transfer, object rotation, bilingual text editing, …)
- Advanced settings mirroring the Space: seed, randomize seed, true guidance scale,
  inference steps, and Qwen prompt rewriting
- Optional Hugging Face token for a larger ZeroGPU quota (kept in your browser only,
  optionally remembered in `localStorage`)
- Configurable Space ID, so you can point it at a duplicated Space with the same `/infer` API

## Deploy on GitHub Pages

1. Merge this branch into `main`.
2. In the repo go to **Settings → Pages** and set **Source** to **GitHub Actions**.
3. The `Deploy to GitHub Pages` workflow publishes the site on every push to `main`
   (or run it manually from the Actions tab).

The site will be available at `https://<user>.github.io/<repo>/`.

## Run locally

Any static file server works (ES modules need `http://`, not `file://`):

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Notes

- The public Space runs on ZeroGPU and has a per-visitor quota. If you hit
  “quota exceeded”, wait a bit or add a Hugging Face token in Advanced settings.
  For heavy use, [duplicate the Space](https://huggingface.co/spaces/Qwen/Qwen-Image-Edit?duplicate=true)
  and enter your copy's ID.
- Qwen-Image-Edit is licensed under Apache-2.0.
