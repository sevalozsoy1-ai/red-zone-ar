import { encode } from 'jpeg-js';
import { classifyVisionTarget } from '@workspace/api-client-react';
import type { CameraFrame } from '../components/camera-types';

// The already-captured local analysis frame is reduced before an optional,
// user-consented request. No continuous video or background upload is used.
function smallJpeg(frame: CameraFrame): string {
  const width = Math.min(144, frame.width);
  const height = Math.max(1, Math.round(frame.height * width / frame.width));
  const rgba = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const sourceY = Math.min(frame.height - 1, Math.floor(y * frame.height / height));
    for (let x = 0; x < width; x++) {
      const sourceX = Math.min(frame.width - 1, Math.floor(x * frame.width / width));
      const source = (sourceY * frame.width + sourceX) * 4;
      const target = (y * width + x) * 4;
      rgba[target] = frame.data[source];
      rgba[target + 1] = frame.data[source + 1];
      rgba[target + 2] = frame.data[source + 2];
      rgba[target + 3] = 255;
    }
  }
  const bytes = encode({ data: rgba, width, height }, 50).data;
  if (bytes.length > 60_000) throw new Error('Image exceeds AI request limit.');
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const chunks: string[] = [];
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = bytes[i + 1] ?? 0;
    const c = bytes[i + 2] ?? 0;
    chunks.push(alphabet[a >> 2] + alphabet[((a & 3) << 4) | (b >> 4)] +
      (i + 1 < bytes.length ? alphabet[((b & 15) << 2) | (c >> 6)] : '=') +
      (i + 2 < bytes.length ? alphabet[c & 63] : '='));
  }
  return chunks.join('');
}

export async function recognizeAtSight(frame: CameraFrame, point: { x: number; y: number }) {
  return classifyVisionTarget({
    imageBase64: smallJpeg(frame),
    aimX: Math.max(0, Math.min(1, point.x)),
    aimY: Math.max(0, Math.min(1, point.y)),
  });
}