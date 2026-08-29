# Free Kokoro TTS

A tiny full-stack web app that gives you free, unlimited text-to-speech by running the open-weight [Kokoro-82M](https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX) model **directly on the server**, via [kokoro-js](https://www.npmjs.com/package/kokoro-js) (ONNX runtime, CPU-only, no GPU needed). No third-party API keys, no per-request billing, no rate limits — it's just your own server doing the inference.

## How it works

- `server.js` is an Express app. On boot it starts loading the quantized (`q8`) Kokoro model in the background.
- `POST /api/tts` takes `{ text, voice, speed }`, runs inference locally, and streams back a WAV file.
- `GET /api/voices` lists the available voices (dozens of English voices, male/female, several accents).
- `public/index.html` is a small frontend: textarea, voice picker, speed slider, play/download.

Nothing is static — every audio clip is generated on demand by the Node server.

## Run locally

```bash
npm install
npm start
```

Then open `http://localhost:3000`. The very first request downloads the model weights (a few hundred MB) and caches them; after that, generation is fast and fully offline/local.

## Deploy to Render (free tier)

1. Push this repo to GitHub (already done if you're reading this from the repo).
2. On Render, click **New > Web Service**, connect the repo. Render will pick up `render.yaml` automatically (Blueprint), or set manually:
   - **Build command:** `npm install`
   - **Start command:** `npm start`
   - **Plan:** Free
3. Deploy. First boot will take a little longer as the model downloads — subsequent requests are served from the warm in-memory model.

> Note: Render's free plan spins the service down after inactivity, and the free plan's disk isn't persistent, so the model re-downloads on cold starts. It's still free and unlimited in terms of usage/quota — just budget for that first-request delay after idling.

## Configuration

Environment variables (all optional):

| Variable          | Default                                   | Notes                                              |
|-------------------|--------------------------------------------|-----------------------------------------------------|
| `PORT`            | `3000`                                     | Set automatically by Render                        |
| `KOKORO_MODEL_ID`| `onnx-community/Kokoro-82M-v1.0-ONNX`      | Hugging Face model id                               |
| `KOKORO_DTYPE`    | `q8`                                        | `fp32`, `fp16`, `q8`, `q4`, `q4f16` — lower = lighter/faster, slightly lower quality |

## License

MIT for this app's code. Kokoro-82M itself is released under Apache 2.0 by its authors.
