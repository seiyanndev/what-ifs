#!/usr/bin/env node
// One-time: build whisper.cpp locally and download a speech model (free, offline afterwards).
//   npm run audio:setup                 # default model: base.en (fast, good for clear narration)
//   npm run audio:setup -- small.en     # better accuracy, slower
import { downloadWhisperModel, installWhisperCpp } from "@remotion/install-whisper-cpp";
import path from "node:path";

export const WHISPER_DIR = path.join(process.cwd(), "whisper.cpp");
export const WHISPER_VERSION = "1.5.5";
const model = process.argv[2] ?? "base.en";

await installWhisperCpp({ to: WHISPER_DIR, version: WHISPER_VERSION, printOutput: true });
await downloadWhisperModel({ model, folder: WHISPER_DIR, printOutput: true });
console.log(`\nwhisper.cpp ${WHISPER_VERSION} + model ${model} ready in ${WHISPER_DIR}`);
