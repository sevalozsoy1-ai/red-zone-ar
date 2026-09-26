import type { CameraFrame } from '../components/camera-types';

export type ImpactKind =
  | 'bullet' | 'ember' | 'firestorm' | 'pellets' | 'scorch'
  | 'plasma' | 'pebble' | 'slash' | 'frag' | 'smoke'
  | 'flash' | 'rocket' | 'burn' | 'blast';

type Patch = {
  values: number[];
  mean: number;
  spread: number;
};

type SceneAnchor = {
  dx: number;
  dy: number;
  patch: Patch;
};

export type TrackedImpact = {
  id: number;
  kind: ImpactKind;
  x: number;
  y: number;
  createdAt: number;
  expiresAt: number;
  visible: boolean;
  patch: Patch | null;
  anchors: SceneAnchor[];
  confirmations: number;
  lastGlobalSearchAt: number;
};

export const MAX_IMPACTS = 4;
export const BURN_DURATION_MS = 120_000;
export const BLAST_DURATION_MS = 1_600;
const PATCH_RADIUS = 4;
const ANCHORED_FIRE_KINDS: ImpactKind[] = ['ember', 'firestorm', 'scorch', 'frag', 'rocket', 'burn'];
const SCENE_ANCHOR_OFFSETS = [
  { dx: -0.18, dy: 0 },
  { dx: 0.18, dy: 0 },
  { dx: 0, dy: -0.18 },
  { dx: 0, dy: 0.18 },
];

export const IMPACT_DURATIONS: Record<ImpactKind, number> = {
  bullet: 1_800,
  ember: 4_500,
  firestorm: 14_000,
  pellets: 2_300,
  scorch: 7_000,
  plasma: 6_500,
  pebble: 1_200,
  slash: 1_400,
  frag: 6_500,
  smoke: 11_000,
  flash: 1_900,
  rocket: 15_000,
  burn: BURN_DURATION_MS,
  blast: BLAST_DURATION_MS,
};

const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
const isAnchoredFire = (kind: ImpactKind) => ANCHORED_FIRE_KINDS.includes(kind);

function readPatch(frame: CameraFrame, x: number, y: number): Patch | null {
  // Read a compact context signature. Separate background anchors below
  // prevent this local signature from following a moving object.
  const spacing = Math.max(1, Math.round(frame.width / 80));
  const centerX = Math.round(x);
  const centerY = Math.round(y);
  if (centerX < PATCH_RADIUS * spacing || centerY < PATCH_RADIUS * spacing ||
      centerX >= frame.width - PATCH_RADIUS * spacing ||
      centerY >= frame.height - PATCH_RADIUS * spacing) return null;
  const values: number[] = [];
  let sum = 0;
  for (let dy = -PATCH_RADIUS; dy <= PATCH_RADIUS; dy++) {
    for (let dx = -PATCH_RADIUS; dx <= PATCH_RADIUS; dx++) {
      // A center-only signature follows the object itself. Use surrounding
      // scene texture as the world anchor instead: a moving subject may leave
      // the center, but it cannot drag this stationary context window along.
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 2) continue;
      const index = ((centerY + dy * spacing) * frame.width + centerX + dx * spacing) * 4;
      const light = frame.data[index] * 0.3 + frame.data[index + 1] * 0.59 + frame.data[index + 2] * 0.11;
      values.push(light);
      sum += light;
    }
  }
  const mean = sum / values.length;
  const spread = Math.sqrt(values.reduce((total, value) => total + (value - mean) ** 2, 0) / values.length);
  return { values, mean, spread };
}

function captureSceneAnchors(frame: CameraFrame, x: number, y: number): SceneAnchor[] {
  const anchors = SCENE_ANCHOR_OFFSETS.flatMap(({ dx, dy }) => {
    const patch = readPatch(frame, (x + dx) * frame.width, (y + dy) * frame.height);
    return patch && patch.spread >= 8 ? [{ dx, dy, patch }] : [];
  });
  if (anchors.length < 2) return [];
  // Two anchors must provide different texture signatures, not just repeat
  // the same featureless or periodic patch at two nearby positions.
  return anchors.some((anchor, index) => anchors.slice(index + 1)
    .some((other) => patchDifference(anchor.patch, other.patch) > 0.15))
    ? anchors
    : [];
}

function patchDifference(reference: Patch, candidate: Patch): number {
  if (candidate.spread < 3 || Math.abs(reference.mean - candidate.mean) > 75) return Infinity;
  let difference = 0;
  for (let i = 0; i < reference.values.length; i++) {
    difference += Math.abs(
      (reference.values[i] - reference.mean) / Math.max(8, reference.spread) -
      (candidate.values[i] - candidate.mean) / Math.max(8, candidate.spread)
    );
  }
  return difference / reference.values.length;
}

function supportsSceneTranslation(
  frame: CameraFrame,
  anchors: SceneAnchor[],
  x: number,
  y: number,
): boolean {
  let matches = 0;
  for (const anchor of anchors) {
    const candidate = readPatch(frame, (x + anchor.dx) * frame.width, (y + anchor.dy) * frame.height);
    if (candidate && patchDifference(anchor.patch, candidate) < 0.82) {
      matches += 1;
      if (matches >= 2) return true;
    }
  }
  return false;
}

function sharesSceneSignature(first: SceneAnchor[], second: SceneAnchor[]): boolean {
  const used = new Set<number>();
  let matches = 0;
  for (const anchor of first) {
    const index = second.findIndex((candidate, candidateIndex) =>
      !used.has(candidateIndex) && patchDifference(anchor.patch, candidate.patch) < 0.35,
    );
    if (index < 0) continue;
    used.add(index);
    matches += 1;
    if (matches >= 2) return true;
  }
  return false;
}

function findMatch(frame: CameraFrame, impact: TrackedImpact, global: boolean): { x: number; y: number } | null {
  if (!impact.patch) return null;
  const cx = impact.x * frame.width;
  const cy = impact.y * frame.height;
  const radiusX = global ? frame.width / 2 : Math.max(16, frame.width * 0.16);
  const radiusY = global ? frame.height / 2 : Math.max(22, frame.height * 0.16);
  const centerX = global ? frame.width / 2 : cx;
  const centerY = global ? frame.height / 2 : cy;
  const step = Math.max(2, Math.round(frame.width / (global ? 42 : 110)));
  let best = { score: Infinity, x: cx, y: cy };
  const coarseCandidates: { score: number; x: number; y: number }[] = [];
  const compare = (x: number, y: number) => {
    const patch = readPatch(frame, x, y);
    if (!patch) return Infinity;
    const score = patchDifference(impact.patch!, patch);
    if (score < best.score) best = { score, x, y };
    return score;
  };
  // Check the previous location exactly: a stable scene should not drift because
  // the coarse search grid happened to miss its pixel.
  if (!global) compare(cx, cy);
  for (let y = Math.max(0, centerY - radiusY); y <= Math.min(frame.height - 1, centerY + radiusY); y += step) {
    for (let x = Math.max(0, centerX - radiusX); x <= Math.min(frame.width - 1, centerX + radiusX); x += step) {
      const score = compare(x, y);
      if (global && Number.isFinite(score)) coarseCandidates.push({ score, x, y });
    }
  }
  if (global) {
    // Keep several spatially distinct coarse candidates. A repeating window
    // can produce a slightly better coarse score than the true match; refine
    // each candidate before deciding, since small camera rotations shift the
    // old scene point between grid cells.
    const candidates = coarseCandidates.sort((a, b) => a.score - b.score);
    const selected: typeof candidates = [];
    for (const candidate of candidates) {
      if (selected.some((existing) => Math.abs(existing.x - candidate.x) <= step * 2 &&
        Math.abs(existing.y - candidate.y) <= step * 2)) continue;
      selected.push(candidate);
      if (selected.length === 8) break;
    }
    let refined = { score: Infinity, x: cx, y: cy };
    for (const candidate of selected) {
      best = { score: candidate.score, x: candidate.x, y: candidate.y };
      for (let y = candidate.y - step; y <= candidate.y + step; y++) {
        for (let x = candidate.x - step; x <= candidate.x + step; x++) compare(x, y);
      }
      if (best.score < refined.score) refined = { ...best };
    }
    best = refined;
  } else if (best.score < 1.3) {
    // A local coarse scan can land a few pixels away from the exact anchor.
    const coarse = { ...best };
    for (let y = coarse.y - step; y <= coarse.y + step; y++) {
      for (let x = coarse.x - step; x <= coarse.x + step; x++) compare(x, y);
    }
  }
  return best.score < (global ? 0.68 : 0.82) ? { x: best.x / frame.width, y: best.y / frame.height } : null;
}

export function addImpact(
  existing: TrackedImpact[],
  frame: CameraFrame | null,
  point: { x: number; y: number },
  kind: ImpactKind,
  id: number,
  now: number,
): TrackedImpact[] {
  const x = clamp(point.x, 0, 1);
  const y = clamp(point.y, 0, 1);
  const patch = frame ? readPatch(frame, x * frame.width, y * frame.height) : null;
  const anchors = frame ? captureSceneAnchors(frame, x, y) : [];
  // Featureless surfaces cannot be re-identified. Show a brief impact rather
  // than pretending a screen-space point is a persistent physical object. A
  // central target patch without reliable background anchors is not trackable.
  const trackable = patch && patch.spread >= 3 && anchors.length >= 2 ? patch : null;
  const active = existing.filter((item) => item.expiresAt > now);
  if (trackable && isAnchoredFire(kind)) {
    const existingAnchor = active.find((item) =>
      isAnchoredFire(item.kind) &&
      item.patch &&
      item.anchors.length >= 2 &&
      patchDifference(item.patch, trackable) < 0.35 &&
      sharesSceneSignature(item.anchors, anchors),
    );
    if (existingAnchor) {
      const refreshed = { ...existingAnchor, expiresAt: now + BURN_DURATION_MS };
      return active.map((item) => item.id === existingAnchor.id ? refreshed : item);
    }
  }
  const duration = trackable && isAnchoredFire(kind) ? BURN_DURATION_MS : IMPACT_DURATIONS[kind];
  const impact: TrackedImpact = {
    id, kind, x, y, createdAt: now,
    expiresAt: now + (trackable ? duration : Math.min(IMPACT_DURATIONS[kind], kind === 'smoke' ? 2_500 : 1_200)),
    visible: true, patch: trackable, anchors: trackable ? anchors : [], confirmations: 2, lastGlobalSearchAt: now,
  };
  return [...active, impact].slice(-MAX_IMPACTS);
}

export function updateImpacts(impacts: TrackedImpact[], frame: CameraFrame, now: number): TrackedImpact[] {
  return impacts.filter((impact) => impact.expiresAt > now).map((impact) => {
    if (!impact.patch) return impact;
    let match = findMatch(frame, impact, false);
    let searchedGlobally = false;
    if (!match && now - impact.lastGlobalSearchAt >= 650) {
      searchedGlobally = true;
      match = findMatch(frame, impact, true);
    }
    if (match && !supportsSceneTranslation(frame, impact.anchors, match.x, match.y)) match = null;
    if (!match) {
      return { ...impact, visible: false, confirmations: 0,
        lastGlobalSearchAt: searchedGlobally ? now : impact.lastGlobalSearchAt };
    }
    // Two matching frames are required after reacquisition to avoid one-frame
    // false positives on repeating textures when the camera turns away.
    const confirmations = Math.min(2, impact.confirmations + 1);
    return { ...impact, ...match, confirmations, visible: confirmations >= 2,
      lastGlobalSearchAt: searchedGlobally ? now : impact.lastGlobalSearchAt };
  });
}