// Qwen Image Edit front end.
// Calls the `/infer` endpoint of the Qwen/Qwen-Image-Edit Gradio Space:
//   infer(image, prompt, seed, randomize_seed, true_guidance_scale,
//         num_inference_steps, rewrite_prompt) -> [image, seed]
import { Client, handle_file } from "https://cdn.jsdelivr.net/npm/@gradio/client@1/dist/browser.js";

const TOKEN_KEY = "qwen-image-edit:hf-token";

const $ = (id) => document.getElementById(id);
const form = $("edit-form");
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
const seedInput = $("seed");
const randomizeSeed = $("randomize-seed");
const guidance = $("guidance");
const steps = $("steps");
const rewritePrompt = $("rewrite-prompt");
const spaceInput = $("space-id");
const tokenInput = $("hf-token");
const rememberToken = $("remember-token");

let selectedFile = null;
let inputPreviewUrl = null;
let client = null;
let clientKey = "";

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

// ----- Slider readouts -----
const syncOutputs = () => {
  $("guidance-out").value = Number(guidance.value).toFixed(1);
  $("steps-out").value = steps.value;
};
guidance.addEventListener("input", syncOutputs);
steps.addEventListener("input", syncOutputs);
syncOutputs();

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

// ----- Example prompts -----
document.querySelectorAll(".chip").forEach((chip) =>
  chip.addEventListener("click", () => {
    promptInput.value = chip.textContent;
    promptInput.focus();
  })
);

// ----- Status helpers -----
function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
}

function setBusy(busy) {
  runButton.disabled = busy;
  runButton.textContent = busy ? "Working…" : "Edit!";
  spinner.hidden = !busy;
  if (busy) {
    resultHint.hidden = true;
    resultImage.hidden = true;
  }
}

async function getClient() {
  const space = spaceInput.value.trim() || "Qwen/Qwen-Image-Edit";
  const token = tokenInput.value.trim();
  const key = `${space}|${token}`;
  if (client && key === clientKey) return client;
  const options = {};
  if (token) options.hf_token = token;
  client = await Client.connect(space, options);
  clientKey = key;
  return client;
}

function describeError(err) {
  const msg = err?.message || String(err);
  if (/quota|GPU|exceeded/i.test(msg)) {
    return `${msg} — the free ZeroGPU quota may be used up. Try again later or add a Hugging Face token under Advanced settings.`;
  }
  if (/metadata could not be loaded|Could not resolve app config|fetch/i.test(msg)) {
    return `${msg} — couldn't reach the Space. Check the Space ID and that it isn't sleeping or paused on Hugging Face.`;
  }
  return msg;
}

// ----- Submit -----
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const prompt = promptInput.value.trim();
  if (!selectedFile) return setStatus("Add an input image first.", true);
  if (!prompt) return setStatus("Describe the edit you want.", true);

  setBusy(true);
  setStatus("Connecting to Hugging Face Space…");

  try {
    const app = await getClient();
    const job = app.submit("/infer", {
      image: handle_file(selectedFile),
      prompt,
      seed: Number(seedInput.value) || 0,
      randomize_seed: randomizeSeed.checked,
      true_guidance_scale: Number(guidance.value),
      num_inference_steps: Number(steps.value),
      rewrite_prompt: rewritePrompt.checked,
    });

    let result = null;
    for await (const msg of job) {
      if (msg.type === "status") {
        if (msg.stage === "error") throw new Error(msg.message || "The Space returned an error.");
        if (msg.queue && msg.position != null && msg.position > 0) {
          setStatus(`Queued — position ${msg.position + 1}${msg.queue_size ? ` of ${msg.queue_size}` : ""}…`);
        } else if (msg.progress_data?.length) {
          const p = msg.progress_data[0];
          if (p.index != null && p.length) setStatus(`Generating… step ${p.index} / ${p.length}`);
        } else if (msg.stage === "pending") {
          setStatus("Generating… this usually takes 30–90 seconds.");
        }
      } else if (msg.type === "data") {
        result = msg.data;
        break;
      }
    }

    if (!result) throw new Error("No result was returned.");
    const [image, seed] = result;
    const url = image?.url || (typeof image === "string" ? image : null);
    if (!url) throw new Error("The Space returned an unexpected response.");

    resultImage.src = url;
    resultImage.hidden = false;
    downloadLink.href = url;
    downloadLink.hidden = false;
    if (seed != null) seedInput.value = seed;
    setStatus(`Done. Seed ${seed}.`);
  } catch (err) {
    console.error(err);
    resultHint.hidden = !resultImage.hidden;
    setStatus(describeError(err), true);
  } finally {
    setBusy(false);
    if (resultImage.hidden) resultHint.hidden = false;
  }
});
