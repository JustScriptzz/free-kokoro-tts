import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { KokoroTTS } from "kokoro-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

// Model choice: quantized (q8) keeps RAM/CPU usage low enough to run
// comfortably on a free Render web service, while still sounding good.
const MODEL_ID = process.env.KOKORO_MODEL_ID || "onnx-community/Kokoro-82M-v1.0-ONNX";
const DTYPE = process.env.KOKORO_DTYPE || "q8";

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

let tts = null;
let loadingPromise = null;

// Load the model once and keep it warm in memory. Loading lazily (on first
// request) avoids slowing down / failing Render's health check on boot,
// but we also kick it off immediately so the first real user isn't the
// one waiting for the full download+load.
function getTTS() {
  if (tts) return Promise.resolve(tts);
  if (!loadingPromise) {
    console.log(`Loading Kokoro model "${MODEL_ID}" (dtype=${DTYPE})...`);
    loadingPromise = KokoroTTS.from_pretrained(MODEL_ID, {
      dtype: DTYPE,
      device: "cpu",
      progress_callback: (p) => {
        if (p.status === "progress") {
          console.log(`  ${p.file}: ${Math.round(p.progress || 0)}%`);
        }
      },
    }).then((model) => {
      tts = model;
      console.log("Kokoro model loaded and ready.");
      return tts;
    });
  }
  return loadingPromise;
}
getTTS().catch((err) => console.error("Initial model load failed:", err));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, modelReady: !!tts });
});

app.get("/api/voices", async (req, res) => {
  try {
    const model = await getTTS();
    res.json({ voices: model.voices });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load voices." });
  }
});

app.post("/api/tts", async (req, res) => {
  try {
    const { text, voice = "af_heart", speed = 1 } = req.body || {};

    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "Field 'text' is required." });
    }
    if (text.length > 5000) {
      return res.status(400).json({ error: "Text too long (max 5000 characters)." });
    }

    const model = await getTTS();
    const clampedSpeed = Math.min(2, Math.max(0.5, Number(speed) || 1));

    const audio = await model.generate(text, { voice, speed: clampedSpeed });
    const wavBuffer = Buffer.from(audio.toWav());

    res.set({
      "Content-Type": "audio/wav",
      "Content-Length": wavBuffer.length,
      "Cache-Control": "no-store",
    });
    res.send(wavBuffer);
  } catch (err) {
    console.error("TTS generation failed:", err);
    res.status(500).json({ error: "TTS generation failed.", details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Free Kokoro TTS server listening on port ${PORT}`);
});
