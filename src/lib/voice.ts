// ============================================================================
// Quest Master — Voice helpers (browser STT + TTS). Free tier voice.
// ============================================================================

export function speechSupported(): boolean {
  return "SpeechRecognition" in window || "webkitSpeechRecognition" in window;
}

export function ttsSupported(): boolean {
  return "speechSynthesis" in window;
}

// ---- Speech recognition (Web Speech API) ----------------------------------
export function createRecognizer(onResult: (finalText: string) => void, onEnd: () => void, onError?: (e: string) => void) {
  const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.continuous = false;
  rec.interimResults = false;
  rec.lang = "en-US";
  rec.onresult = (e: any) => {
    let t = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) t += e.results[i][0].transcript;
    }
    if (t.trim()) onResult(t.trim());
  };
  rec.onerror = (e: any) => onError?.(e?.error ?? "unknown");
  rec.onend = onEnd;
  return rec;
}

// ---- Audio context for orb voice-reactivity -------------------------------
let audioCtx: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let stream: MediaStream | null = null;

export async function ensureAudioAnalysis(): Promise<{ ctx: AudioContext; analyser: AnalyserNode } | null> {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    await audioCtx.resume();
    if (!stream) {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    }
    if (!analyser) {
      const src = audioCtx.createMediaStreamSource(stream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      src.connect(analyser);
    }
    return { ctx: audioCtx, analyser };
  } catch {
    return null;
  }
}

export function getVoiceLevel(): number {
  if (!analyser) return 0;
  const data = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(data);
  const sum = data.reduce((a, b) => a + b, 0);
  return sum / data.length / 255;
}

export async function stopVoiceStream() {
  try {
    stream?.getTracks().forEach((t) => t.stop());
  } catch {}
  stream = null;
}

// ---- Speech synthesis (TTS) -----------------------------------------------
export function speak(text: string, opts?: { onStart?: () => void; onEnd?: () => void; onError?: () => void }): SpeechSynthesisUtterance | null {
  if (!ttsSupported()) return null;
  const voices = window.speechSynthesis.getVoices();
  const utterance = new SpeechSynthesisUtterance(text);
  const preferVoice = voices.find((v) => v.lang.startsWith("en") && /female|zira|samantha|aria|jenny/i.test(v.name)) || voices.find((v) => v.lang.startsWith("en"));
  if (preferVoice) utterance.voice = preferVoice;
  utterance.rate = 0.95;
  utterance.pitch = 1.05;
  utterance.onstart = () => opts?.onStart?.();
  utterance.onend = () => opts?.onEnd?.();
  utterance.onerror = () => opts?.onError?.();
  window.speechSynthesis.speak(utterance);
  return utterance;
}

export function cancelSpeech() {
  if (ttsSupported()) window.speechSynthesis.cancel();
}
