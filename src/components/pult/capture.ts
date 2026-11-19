import { create } from "zustand";

type CaptureUi = {
  armed: boolean;
  recording: boolean;
  takeId: string | null;
  bytes: number;
  error: string;
};

export const useCapture = create<CaptureUi>(() => ({
  armed: false,
  recording: false,
  takeId: null,
  bytes: 0,
  error: "",
}));

const blobs = new Map<string, Blob>();
const urls = new Map<string, string>();

let stream: MediaStream | null = null;
let recorder: MediaRecorder | null = null;
let chunks: Blob[] = [];
let shareEnded: (() => void) | null = null;
let onDone: ((blob: Blob) => void) | null = null;

export function preferredMime(): string {
  if (typeof MediaRecorder === "undefined") return "video/webm";
  if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")) return "video/webm;codecs=vp9,opus";
  if (MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")) return "video/webm;codecs=vp8,opus";
  return "video/webm";
}

export function captureArmed(): boolean {
  return !!stream && stream.getVideoTracks().some((track) => track.readyState === "live");
}

export function isRecording(): boolean {
  return !!recorder && recorder.state === "recording";
}

export function playbackUrl(id: string): string | null {
  const existing = urls.get(id);
  if (existing) return existing;
  const blob = blobs.get(id);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  urls.set(id, url);
  return url;
}

export function putBlob(id: string, blob: Blob) {
  blobs.set(id, blob);
  const prev = urls.get(id);
  if (prev) URL.revokeObjectURL(prev);
  urls.set(id, URL.createObjectURL(blob));
}

function releaseStream() {
  stream?.getTracks().forEach((track) => track.stop());
  stream = null;
}

export async function armCapture(onShareEnded: () => void): Promise<void> {
  if (!navigator.mediaDevices?.getDisplayMedia) {
    throw new Error("unsupported");
  }
  shareEnded = onShareEnded;
  let next: MediaStream;
  try {
    next = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: 30 },
      audio: true,
    });
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    if (name === "NotAllowedError") throw error;
    next = await navigator.mediaDevices.getDisplayMedia({ video: true });
  }
  releaseStream();
  stream = next;
  const track = next.getVideoTracks()[0];
  track?.addEventListener("ended", () => {
    if (recorder && recorder.state === "recording") recorder.stop();
    else {
      releaseStream();
      shareEnded?.();
    }
  });
}

export function startRecorder(mime: string, done: (blob: Blob) => void) {
  if (!stream) throw new Error("no-stream");
  if (recorder && recorder.state === "recording") return;
  chunks = [];
  onDone = done;
  const rec = new MediaRecorder(stream, { mimeType: mime });
  recorder = rec;
  let bytes = 0;
  rec.ondataavailable = (event) => {
    if (!event.data.size) return;
    chunks.push(event.data);
    bytes += event.data.size;
    useCapture.setState({ bytes });
  };
  rec.onstop = () => {
    const blob = new Blob(chunks, { type: rec.mimeType || mime });
    chunks = [];
    recorder = null;
    const finish = onDone;
    onDone = null;
    if (blob.size) finish?.(blob);
    if (!captureArmed()) shareEnded?.();
  };
  rec.start(2000);
}

export function stopRecorder() {
  if (recorder && recorder.state === "recording") recorder.stop();
}

export function disarmCapture() {
  if (recorder && recorder.state === "recording") {
    recorder.stop();
  }
  releaseStream();
  shareEnded?.();
  shareEnded = null;
}
