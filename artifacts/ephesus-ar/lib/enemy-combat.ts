export const PLAYER_HEALTH = 10;
export const ENEMY_WARNING_LEAD_MS = 2300;

export type Corner = 'upper-left' | 'upper-right' | 'lower-left' | 'lower-right';
import type { Weapon } from './weapons.ts';

export type EnemyVariant = 'rifle' | 'scout' | 'heavy' | 'sniper' | 'rocketeer' | 'cobra' | 'tank' | 'jet' | 'sidecar';
export type RadioCue = 'standard' | 'urgent' | 'air';
export type EnemyWarning = { id: number; corner: Corner; variant: EnemyVariant; radioCue: RadioCue; appearsAt: number | null };
export type PeekingEnemy = {
  id: number;
  corner: Corner;
  variant: EnemyVariant;
  appearedAt: number;
  firesAt: number;
  leavesAt: number;
  fired: boolean;
  shotsFired: number;
  nextShotAt: number;
  armor: number;
  maxArmor: number;
};
export type EnemyDeath = { id: number; variant: EnemyVariant; x: number; y: number; diedAt: number; fromLeft: boolean };
export type EnemyProjectile = { id: number; variant: 'rocketeer' | 'cobra'; corner: Corner; launchedAt: number; impactsAt: number };
export type EnemyAttack = { id: number; variant: EnemyVariant; kind: 'shot' | 'launch' | 'impact'; at: number };
export type MedkitDrop = { id: number; corner: Corner; droppedAt: number; expiresAt: number };

export function projectileProgress(projectile: EnemyProjectile, now: number): number {
  return Math.min(1, Math.max(0, (now - projectile.launchedAt) / (projectile.impactsAt - projectile.launchedAt)));
}
export type EnemyCombat = {
  health: number;
  kills: number;
  enemy: PeekingEnemy | null;
  warning: EnemyWarning | null;
  projectile: EnemyProjectile | null;
  medkit: MedkitDrop | null;
  death: EnemyDeath | null;
  lastAttack: EnemyAttack | null;
  attackSequence: number;
  automaticHits: number;
  automaticTotalHits: number;
  nextAppearanceAt: number;
  lastDamageAt: number;
  lastCorner: Corner | null;
  lastVariant: EnemyVariant | null;
  sequence: number;
  vehicleArmor: Partial<Record<EnemyVariant, number>>;
};

const CORNERS: Corner[] = ['upper-left', 'upper-right', 'lower-left', 'lower-right'];
const VARIANTS: EnemyVariant[] = ['rifle', 'scout', 'heavy', 'sniper', 'rocketeer', 'cobra', 'tank', 'sidecar', 'jet'];
const AUTOMATIC: Partial<Record<EnemyVariant, { cadence: number; rounds: number }>> = {
  scout: { cadence: 260, rounds: 12 },
  heavy: { cadence: 190, rounds: 18 },
};

function attackDelay(variant: EnemyVariant): number {
  if (variant === 'sidecar') return 2500;
  if (variant === 'jet') return 2400;
  if (variant === 'tank') return 3000;
  if (variant === 'scout') return 1800;
  if (variant === 'heavy') return 1700;
  if (variant === 'cobra') return 2100;
  if (variant === 'rocketeer') return 2600;
  if (variant === 'sniper') return 3700;
  return 3000;
}

export function startEnemyRound(now: number): EnemyCombat {
  return { health: PLAYER_HEALTH, kills: 0, enemy: null, warning: null, projectile: null, medkit: null, death: null, lastAttack: null,
    attackSequence: 0, automaticHits: 0, automaticTotalHits: 0, nextAppearanceAt: now + 2400, lastDamageAt: now - 8000,
    lastCorner: null, lastVariant: null, sequence: 0, vehicleArmor: {} };
}

export function enemyCenter(corner: Corner, width: number, height: number): { x: number; y: number } {
  return {
    x: corner.endsWith('left') ? 76 : width - 76,
    // Clear the compact two-row HUD, while staying inside the clamped aim range.
    y: corner.startsWith('upper') ? Math.max(255, height * 0.31) : height - Math.max(192, height * 0.26),
  };
}

export function medkitAimCenter(drop: MedkitDrop, width: number, height: number, now: number): { x: number; y: number } {
  const progress = Math.min(1, Math.max(0, (now - drop.droppedAt) / 900));
  return {
    // Emerge beneath the Cobra on its own side, then fall toward the open play area.
    x: width * (drop.corner.endsWith('left') ? 0.28 : 0.72),
    y: height * (0.39 + 0.21 * progress),
  };
}

export function tankProgress(enemy: PeekingEnemy, now: number): number {
  return Math.min(1, Math.max(0, (now - enemy.appearedAt) / (enemy.leavesAt - enemy.appearedAt)));
}

export function enemyAimCenter(enemy: PeekingEnemy, width: number, height: number, now: number): { x: number; y: number } {
  if (enemy.variant !== 'tank' && enemy.variant !== 'jet' && enemy.variant !== 'sidecar') return enemyCenter(enemy.corner, width, height);
  const progress = tankProgress(enemy, now);
  const fromLeft = enemy.corner.endsWith('left');
  return { x: fromLeft ? -120 + (width + 240) * progress : width + 120 - (width + 240) * progress, y: height * (enemy.variant === 'jet' ? 0.31 : enemy.variant === 'sidecar' ? 0.58 : 0.49) };
}

export function enemyArmor(variant: EnemyVariant): number {
  return variant === 'tank' ? 20 : variant === 'cobra' ? 12 : variant === 'jet' ? 10 : variant === 'sidecar' ? 8 : 1;
}

export function weaponDamage(variant: EnemyVariant, weapon: Pick<Weapon, 'id' | 'archetype'>): number {
  if (weapon.id === 'flashbang' || weapon.id === 'smoke-grenade') return 0;
  if (variant !== 'tank' && variant !== 'cobra' && variant !== 'jet' && variant !== 'sidecar') return 1;
  if (weapon.archetype === 'launcher') return enemyArmor(variant);
  if (weapon.archetype === 'melee' || weapon.archetype === 'slingshot') return 0;
  if (weapon.archetype === 'grenade') return variant === 'tank' ? 5 : 4;
  if (weapon.archetype === 'sniper') return weapon.id === 'barrett-m82' ? 6 : 4;
  if (weapon.archetype === 'energy') return weapon.id === 'electric-arc' ? 4 : 2;
  if (weapon.archetype === 'shotgun') return 2;
  if (weapon.archetype === 'minigun' || weapon.archetype === 'machinegun') return 2;
  if (weapon.id === 'desert-eagle') return 2;
  return 1;
}

export function advanceEnemyCombat(state: EnemyCombat, now: number, chance: number): EnemyCombat {
  if (state.death && now >= state.death.diedAt + 1000) state = { ...state, death: null };
  if (state.medkit && now >= state.medkit.expiresAt) state = { ...state, medkit: null };
  if (state.health === 0) return state;
  if (state.projectile && now >= state.projectile.impactsAt) {
    const hit = now - state.lastDamageAt >= 5000;
    return { ...state, projectile: null, health: hit ? Math.max(0, state.health - 1) : state.health,
      lastDamageAt: hit ? now : state.lastDamageAt, attackSequence: state.attackSequence + 1,
      lastAttack: { id: state.attackSequence + 1, variant: state.projectile.variant, kind: 'impact', at: now } };
  }
  if (state.enemy) {
    const { enemy } = state;
    const burst = AUTOMATIC[enemy.variant];
    const canShoot = enemy.shotsFired < (burst?.rounds ?? 1);
    if (canShoot && now >= enemy.nextShotAt && now < enemy.leavesAt) {
      const shotsFired = enemy.shotsFired + 1;
      const nextEnemy = { ...enemy, shotsFired, fired: true, nextShotAt: now + (burst?.cadence ?? 1000) };
      const attackSequence = state.attackSequence + 1;
      if (burst) {
        const automaticHits = (state.automaticHits + 1) % 10;
        return { ...state, enemy: nextEnemy, attackSequence, automaticHits, automaticTotalHits: state.automaticTotalHits + 1,
          health: automaticHits === 0 ? Math.max(0, state.health - 1) : state.health,
          lastAttack: { id: attackSequence, variant: enemy.variant, kind: 'shot', at: now } };
      }
      if (enemy.variant === 'rocketeer' || enemy.variant === 'cobra') {
        return { ...state, enemy: nextEnemy, attackSequence,
          projectile: { id: attackSequence, variant: enemy.variant, corner: enemy.corner, launchedAt: now,
            impactsAt: now + (enemy.variant === 'cobra' ? 850 : 1050) },
          lastAttack: { id: attackSequence, variant: enemy.variant, kind: 'launch', at: now } };
      }
      const hit = now - state.lastDamageAt >= 5000;
      return { ...state, enemy: nextEnemy, attackSequence,
        health: hit ? Math.max(0, state.health - 1) : state.health,
        lastDamageAt: hit ? now : state.lastDamageAt,
        lastAttack: { id: attackSequence, variant: enemy.variant, kind: 'shot', at: now } };
    }
    if (now >= enemy.leavesAt) {
      return { ...state, enemy: null, nextAppearanceAt: now + 2600 + Math.floor(chance * 1800) };
    }
    return state;
  }
  if (state.warning) {
    if (state.warning.appearsAt === null || now < state.warning.appearsAt) return state;
    const { id, corner, variant } = state.warning;
    const firesAt = now + attackDelay(variant);
    const medkitChance = Math.max(0, Math.min(0.999999, chance));
    return {
      ...state, warning: null,
      enemy: { id, corner, variant, appearedAt: now, firesAt, nextShotAt: firesAt, shotsFired: 0,
        leavesAt: now + (variant === 'tank' ? 6900 : variant === 'jet' ? 5200 : variant === 'sidecar' ? 5700 : variant === 'cobra' ? 6900 : variant === 'rocketeer' ? 6300 : variant === 'heavy' || variant === 'scout' ? 6100 : 5600),
        fired: false, armor: state.vehicleArmor[variant] ?? enemyArmor(variant), maxArmor: enemyArmor(variant) },
      medkit: variant === 'cobra' && state.health < PLAYER_HEALTH && !state.medkit && medkitChance < 0.3
        ? { id, corner, droppedAt: now, expiresAt: now + 3200 }
        : state.medkit,
    };
  }
  if (now < state.nextAppearanceAt) return state;
  const previous = state.lastCorner ? CORNERS.indexOf(state.lastCorner) : -1;
  const safeChance = Math.max(0, Math.min(0.999999, chance));
  const selectedCorner = CORNERS[(previous + 1 + Math.floor(safeChance * (state.lastCorner ? 3 : 4))) % 4];
  const candidates = VARIANTS.filter((candidate) => candidate !== state.lastVariant);
  const variant = candidates[Math.floor(safeChance * candidates.length)];
  const corner: Corner = variant === 'cobra' || variant === 'jet' ? (selectedCorner.endsWith('left') ? 'upper-left' : 'upper-right') : selectedCorner;
  const radioCue: RadioCue = variant === 'cobra' || variant === 'jet' ? 'air' : state.sequence % 2 === 0 ? 'urgent' : 'standard';
  return {
    ...state, lastCorner: corner, lastVariant: variant, sequence: state.sequence + 1,
    warning: { id: state.sequence + 1, corner, variant, radioCue, appearsAt: null },
  };
}

export function scheduleEnemyAppearance(state: EnemyCombat, warningId: number, now: number): EnemyCombat {
  if (!state.warning || state.warning.id !== warningId || state.warning.appearsAt !== null) return state;
  return { ...state, warning: { ...state.warning, appearsAt: now + ENEMY_WARNING_LEAD_MS } };
}

export function hitPeekingEnemy(state: EnemyCombat, aim: { x: number; y: number }, width: number, height: number, now: number, radius = 1, weapon: Pick<Weapon, 'id' | 'archetype'> = { id: 'glock-17', archetype: 'pistol' }): EnemyCombat {
  if (!state.enemy || state.health === 0) return state;
  const center = enemyAimCenter(state.enemy, width, height, now);
  const xTolerance = state.enemy.variant === 'tank' || state.enemy.variant === 'jet' || state.enemy.variant === 'sidecar' ? 100 : state.enemy.variant === 'cobra' ? 82 : 43;
  const yTolerance = state.enemy.variant === 'tank' || state.enemy.variant === 'sidecar' ? 57 : state.enemy.variant === 'jet' ? 42 : state.enemy.variant === 'cobra' ? 45 : 61;
  if (Math.abs(aim.x - center.x) > xTolerance * radius || Math.abs(aim.y - center.y) > yTolerance * radius) return state;
  const damage = weaponDamage(state.enemy.variant, weapon);
  if (damage === 0) return state;
  const armor = Math.max(0, state.enemy.armor - damage);
  if (armor > 0) return { ...state, enemy: { ...state.enemy, armor },
    vehicleArmor: state.enemy.maxArmor > 1 ? { ...state.vehicleArmor, [state.enemy.variant]: armor } : state.vehicleArmor };
  const vehicleArmor = { ...state.vehicleArmor };
  delete vehicleArmor[state.enemy.variant];
  return { ...state, enemy: null, kills: state.kills + 1, nextAppearanceAt: now + 1800,
    vehicleArmor,
    death: { id: state.enemy.id, variant: state.enemy.variant, x: center.x, y: center.y, diedAt: now, fromLeft: state.enemy.corner.endsWith('left') } };
}

export function hitMedkitDrop(state: EnemyCombat, aim: { x: number; y: number }, width: number, height: number, now: number, radius = 1): EnemyCombat {
  const drop = state.medkit;
  if (!drop || state.health === 0 || now >= drop.expiresAt) return state;
  const center = medkitAimCenter(drop, width, height, now);
  if (Math.abs(aim.x - center.x) > 34 * radius || Math.abs(aim.y - center.y) > 30 * radius) return state;
  return { ...state, health: Math.min(PLAYER_HEALTH, state.health + 1), medkit: null };
}

export function hideEnemy(state: EnemyCombat, now: number): EnemyCombat {
  if (!state.enemy && !state.warning && !state.projectile && !state.medkit && !state.death && !state.lastAttack) return state;
  return { ...state, enemy: null, warning: null, projectile: null, medkit: null, death: null, lastAttack: null, nextAppearanceAt: now + 2400 };
}