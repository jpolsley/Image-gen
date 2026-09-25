// Novel Illustrator front end.
// Each engine is a public Gradio Space on Hugging Face; the signatures below
// mirror each Space's app.py so the page can call it with @gradio/client.
import { Client, handle_file } from "https://cdn.jsdelivr.net/npm/@gradio/client@2.7.0/dist/browser.js";

const TOKEN_KEY = "novel-illustrator:hf-token";
const MAX_SEED = 2147483647;
const TIMEOUT_MS = 5 * 60 * 1000;

const QWEN_FAST_LORAS = [
  "Edit-Skin", "Next-Scene", "Relight", "Multiple-Angles", "Multi-Angle-Lighting",
  "Light-Restoration", "Photo-to-Anime", "Dotted-Illustration", "Flat-Log",
  "Upscale-Image", "Upscale2K",
];

const ENGINES = {
  realvis: {
    mode: "create",
    label: "RealVisXL V5 — realistic / cinematic",
    note: "Photorealistic people and scenes. Good default for a novel.",
    space: "seawolf2357/REALVISXL-V5",
    steps: 28, guidance: 3,
    negative: "(deformed, distorted, disfigured:1.3), poorly drawn, bad anatomy, extra limb, missing limb, mutated hands and fingers, blurry, watermark, text",
    sizes: { portrait: [896, 1152], square: [1024, 1024], landscape: [1152, 896] },
    endpoint: "/generate",
    args: (o) => [
      "REALVISXL V5.0", o.prompt, o.negative, Boolean(o.negative), "HD+",
      o.seed, o.size[0], o.size[1], o.guidance, o.steps, o.randomize, 1,
    ],
  },
  illustrious: {
    mode: "create",
    label: "WAI Illustrious — illustrated / anime",
    note: "Painterly and anime styles; works best with comma-separated tags. Always describe characters as adults (e.g. \"adult woman, 30 years old\").",
    space: "IbarakiDouji/WAI-NSFW-illustrious-SDXL",
    steps: 28, guidance: 7,
    negative: "bad quality, worst quality, worst detail, sketch, censor, child, loli, young",
    sizes: { portrait: "1344 x 1728", square: "1536 x 1536", landscape: "1728 x 1344" },
    endpoint: "/generate",
    // The Space randomizes the seed in a separate hidden step, so we do it here.
    args: (o) => [
      o.prompt, o.negative, o.randomize ? randomSeed() : o.seed, 1024, 1024,
      o.guidance, o.steps, "Euler a", "v17", o.size, false, 0.55, 1.5, true,
    ],
  },
  qwenFast: {
    mode: "edit",
    label: "Qwen Edit 2509 Fast — community (recommended)",
    note: "Qwen-Image-Edit 2509 with a fast 4-step model. The add-on (Advanced settings) nudges the style; Edit-Skin is the most neutral.",
    space: "prithivMLmods/Qwen-Image-Edit-2509-LoRAs-Fast",
    steps: 4, guidance: 1,
    endpoint: "/edit_image",
    args: async (o) => ({
      image_b64: await fileToDataUrl(o.file, 1024),
      prompt: o.prompt,
      lora_adapter: o.lora,
      seed: o.seed,
      randomize_seed: o.randomize,
      guidance_scale: o.guidance,
      steps: o.steps,
    }),
  },
  qwenOfficial: {
    mode: "edit",
    label: "Qwen-Image-Edit — official demo",
    note: "The original official demo. Often overloaded or down; try the community engine first.",
    space: "Qwen/Qwen-Image-Edit",
    steps: 50, guidance: 4,
    endpoint: "/infer",
    args: (o) => [
      handle_file(o.file), o.prompt, o.seed, o.randomize, o.guidance, o.steps, o.rewrite,
    ],
  },
};

const PLACEHOLDERS = {
  create: "Describe the scene, e.g. “an adult woman in a flowing linen dress standing on a cliff at dawn, wind in her hair, oil painting, warm light”",
  edit: "Describe the change, e.g. “change the background to a candle-lit library at night”",
};

const $ = (id) => document.getElementById(id);
const form = $("gen-form");
const tabs = [...document.querySelectorAll(".tab")];
const engineSelect = $("engine");
const engineNote = $("engine-note");
const fileInput = $("image-input");
const dropzone = $("dropzone");
const inputPreview = $("input-preview");
const dropzoneHint = $("dropzone-hint");
const promptInput = $("prompt");
const runButton = $("run-button");
const resultImage = $("result-image");
const resultHint = $("result-hint");
const spinner = $("spinner");
const downloadLink = $("download-link");
const statusEl = $("status");
const aspect = $("aspect");
const negative = $("negative");
const loraSelect = $("lora");
const rewritePrompt = $("rewrite-prompt");
const seedInput = $("seed");
const randomizeSeed = $("randomize-seed");
const guidance = $("guidance");
const steps = $("steps");
const tokenInput = $("hf-token");
const rememberToken = $("remember-token");

let mode = "create";
let selectedFile = null;
let inputPreviewUrl = null;
const clients = new Map();

const randomSeed = () => Math.floor(Math.random() * MAX_SEED);

// ----- Local storage (optional convenience only) -----
function loadToken() {
  try {
    const saved = localStorage.getItem(TOKEN_KEY);
    if (saved) {
      tokenInput.value = saved;
      rememberToken.checked = true;
    }
  } catch { /* storage unavailable */ }
}
function persistToken() {
  try {
    if (rememberToken.checked && tokenInput.value.trim()) {
      localStorage.setItem(TOKEN_KEY, tokenInput.value.trim());
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch { /* storage unavailable */ }
}
loadToken();
rememberToken.addEventListener("change", persistToken);
tokenInput.addEventListener("change", persistToken);

// ----- Mode + engine selection -----
QWEN_FAST_LORAS.forEach((name) => loraSelect.add(new Option(name, name)));

function currentEngine() {
  return ENGINES[engineSelect.value];
}

function applyEngine() {
  const engine = currentEngine();
  engineNote.textContent = engine.note;
  steps.value = engine.steps;
  guidance.value = engine.guidance;
  negative.value = engine.negative || "";
  document.querySelectorAll(".opt-lora").forEach((el) => (el.hidden = engineSelect.value !== "qwenFast"));
  document.querySelectorAll(".opt-rewrite").forEach((el) => (el.hidden = engineSelect.value !== "qwenOfficial"));
  syncOutputs();
}

function setMode(next) {
  mode = next;
  tabs.forEach((t) => t.setAttribute("aria-selected", String(t.dataset.mode === mode)));
  form.dataset.mode = mode;
  engineSelect.innerHTML = "";
  for (const [id, engine] of Object.entries(ENGINES)) {
    if (engine.mode === mode) engineSelect.add(new Option(engine.label, id));
  }
  promptInput.placeholder = PLACEHOLDERS[mode];
  runButton.textContent = mode === "edit" ? "Edit" : "Generate";
  setStatus("");
  applyEngine();
}

tabs.forEach((t) => t.addEventListener("click", () => setMode(t.dataset.mode)));
engineSelect.addEventListener("change", applyEngine);

// ----- Slider readouts -----
function syncOutputs() {
  $("guidance-out").value = Number(guidance.value).toFixed(1);
  $("steps-out").value = steps.value;
}
guidance.addEventListener("input", syncOutputs);
steps.addEventListener("input", syncOutputs);

// ----- Image selection: click, drag & drop, paste -----
function setImage(file) {
  if (!file || !file.type.startsWith("image/")) {
    setStatus("Please choose an image file.", true);
    return;
  }
  selectedFile = file;
  if (inputPreviewUrl) URL.revokeObjectURL(inputPreviewUrl);
  inputPreviewUrl = URL.createObjectURL(file);
  inputPreview.src = inputPreviewUrl;
  inputPreview.hidden = false;
  dropzoneHint.hidden = true;
  setStatus("");
}

fileInput.addEventListener("change", () => setImage(fileInput.files[0]));

["dragenter", "dragover"].forEach((type) =>
  dropzone.addEventListener(type, (e) => {
    e.preventDefault();
    dropzone.classList.add("dragover");
  })
);
["dragleave", "drop"].forEach((type) =>
  dropzone.addEventListener(type, () => dropzone.classList.remove("dragover"))
);
dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  setImage(e.dataTransfer.files[0]);
});

document.addEventListener("paste", (e) => {
  const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith("image/"));
  if (item) setImage(item.getAsFile());
});

// Downscale to keep uploads small (the Space resizes to ~1024px anyway).
async function fileToDataUrl(file, maxDim) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}

// ----- Status helpers -----
function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
}

let timer = null;
let startedAt = 0;
let progressText = "";
function setProgress(message) {
  progressText = message;
  const secs = Math.round((Date.now() - startedAt) / 1000);
  setStatus(`${progressText} (${secs}s)`);
}
function startTimer() {
  startedAt = Date.now();
  timer = setInterval(() => setProgress(progressText), 1000);
}
function stopTimer() {
  clearInterval(timer);
  timer = null;
}

function setBusy(busy) {
  runButton.disabled = busy;
  runButton.textContent = busy ? "Working…" : mode === "edit" ? "Edit" : "Generate";
  tabs.forEach((t) => (t.disabled = busy));
  engineSelect.disabled = busy;
  spinner.hidden = !busy;
  if (busy) {
    resultHint.hidden = true;
    resultImage.hidden = true;
    downloadLink.hidden = true;
  }
}

async function getClient(space) {
  const token = tokenInput.value.trim();
  const key = `${space}|${token}`;
  if (!clients.has(key)) {
    const options = token ? { token, hf_token: token } : {};
    clients.set(key, Client.connect(space, options).catch((err) => {
      clients.delete(key);
      throw err;
    }));
  }
  return clients.get(key);
}

// Finds the first image URL in whatever shape the Space returns
// (FileData, gallery items, {image: dataURL}, nested arrays…).
function findImageUrl(value) {
  if (!value) return null;
  if (typeof value === "string") {
    return value.startsWith("data:image") || /^https?:\/\//.test(value) ? value : null;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const url = findImageUrl(item);
      if (url) return url;
    }
    return null;
  }
  if (typeof value === "object") {
    if (typeof value.url === "string") return value.url;
    for (const key of ["image", "value", "data"]) {
      const url = findImageUrl(value[key]);
      if (url) return url;
    }
  }
  return null;
}

function findSeed(data) {
  if (!Array.isArray(data)) return data?.seed;
  for (const item of data.slice(1)) {
    if (typeof item === "number") return item;
    if (item && typeof item.seed === "number") return item.seed;
  }
  return data[0]?.seed;
}

function describeError(err) {
  const msg = err?.message || String(err);
  if (/quota|exceeded|ZeroGPU/i.test(msg)) {
    return `${msg} — the free GPU quota is used up for now. Wait a while, or add a free Hugging Face token under Advanced settings.`;
  }
  if (/metadata could not be loaded|Could not resolve app config|fetch|connect|sleeping|paused|runtime error/i.test(msg)) {
    return `${msg} — this engine's Space seems to be down or asleep. Try another engine from the list.`;
  }
  return msg;
}

// ----- Submit -----
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const engine = currentEngine();
  const prompt = promptInput.value.trim();
  if (engine.mode === "edit" && !selectedFile) return setStatus("Add an input image first.", true);
  if (!prompt) return setStatus("Describe what you want.", true);

  const options = {
    prompt,
    negative: negative.value.trim(),
    size: engine.sizes?.[aspect.value],
    file: selectedFile,
    lora: loraSelect.value,
    rewrite: rewritePrompt.checked,
    seed: Number(seedInput.value) || 0,
    randomize: randomizeSeed.checked,
    guidance: Number(guidance.value),
    steps: Number(steps.value),
  };

  setBusy(true);
  startTimer();
  setProgress(`Connecting to ${engine.space}…`);
  let job = null;
  const timeout = setTimeout(() => job?.cancel(), TIMEOUT_MS);

  try {
    const app = await getClient(engine.space);
    setProgress("Sending request…");
    job = app.submit(engine.endpoint, await engine.args(options));

    let result = null;
    for await (const msg of job) {
      if (msg.type === "status") {
        if (msg.stage === "error") throw new Error(msg.message || "The Space returned an error.");
        if (msg.queue && msg.position != null && msg.position > 0) {
          setProgress(`Queued — position ${msg.position + 1}${msg.queue_size ? ` of ${msg.queue_size}` : ""}…`);
        } else if (msg.progress_data?.length) {
          const p = msg.progress_data[0];
          if (p.index != null && p.length) setProgress(`Generating… step ${p.index} / ${p.length}`);
        } else if (msg.stage === "pending") {
          setProgress("Waiting for a GPU and generating… usually 20–120 seconds");
        }
      } else if (msg.type === "data") {
        result = msg.data;
        break;
      }
    }

    if (!result) {
      throw new Error(Date.now() - startedAt >= TIMEOUT_MS
        ? "Timed out after 5 minutes. The Space may be overloaded; try another engine."
        : "The Space finished without returning an image. Try again, or change the prompt.");
    }
    const url = findImageUrl(result);
    if (!url) throw new Error("The Space returned an unexpected response.");

    resultImage.src = url;
    resultImage.hidden = false;
    downloadLink.href = url;
    // Browsers block opening data: URLs in a new tab, but allow downloading them.
    if (url.startsWith("data:")) downloadLink.removeAttribute("target");
    else downloadLink.target = "_blank";
    downloadLink.hidden = false;
    const seed = findSeed(result);
    if (typeof seed === "number") seedInput.value = seed;
    setStatus(typeof seed === "number" ? `Done. Seed ${seed}.` : "Done.");
  } catch (err) {
    console.error(err);
    setStatus(describeError(err), true);
  } finally {
    clearTimeout(timeout);
    stopTimer();
    setBusy(false);
    if (resultImage.hidden) resultHint.hidden = false;
  }
});

setMode("create");

// Tells the inline fallback in index.html that this module loaded.
window.appReady = true;
