export const PLAYER_HEALTH = 10;
export const ENEMY_WARNING_LEAD_MS = 2300;

export type Corner = 'upper-left' | 'upper-right' | 'lower-left' | 'lower-right';
import type { Weapon } from './weapons.ts';

export type EnemyVariant = 'rifle' | 'scout' | 'heavy' | 'sniper' | 'rocketeer' | 'cobra' | 'tank' | 'jet' | 'sidecar'
  | 'mortar-team' | 'machinegun-team' | 'squad' | 'laser' | 'robot';
export type RadioCue = 'standard' | 'urgent' | 'air';
export type EnemyWarning = { id: number; corner: Corner; variant: EnemyVariant; radioCue: RadioCue; appearsAt: number | null };
export type EnemyMember = { id: number; offsetX: number; offsetY: number };
export type FallenEnemyMember = { member: EnemyMember; diedAt: number };
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
  /** Independent, aimable soldiers for coordinated crews and squad waves. */
  members?: EnemyMember[];
  fallen?: FallenEnemyMember[];
};
export type EnemyDeath = { id: number; variant: EnemyVariant; x: number; y: number; diedAt: number; fromLeft: boolean };
export type EnemyProjectile = { id: number; variant: 'rocketeer' | 'cobra' | 'mortar-team' | 'robot'; corner: Corner; launchedAt: number; impactsAt: number };
export type EnemyAttack = { id: number; variant: EnemyVariant; kind: 'shot' | 'launch' | 'impact' | 'laser'; at: number };
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
const AUTOMATIC: Partial<Record<EnemyVariant, { cadence: number; rounds: number }>> = {
  scout: { cadence: 260, rounds: 12 },
  heavy: { cadence: 190, rounds: 18 },
  'machinegun-team': { cadence: 330, rounds: 12 },
};

const SQUAD_OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [-46, -17], [-23, -17], [0, -17], [23, -17], [46, -17],
  [-46, 17], [-23, 17], [0, 17], [23, 17], [46, 17],
];

function variantForChance(chance: number): EnemyVariant {
  // Keep the established sample bands stable, while dedicating encounter
  // windows to crewed weapons and new enemy silhouettes.
  if (chance < 0.07) return 'rifle';
  if (chance < 0.16) return 'mortar-team';
  if (chance < 0.24) return 'scout';
  if (chance < 0.29) return 'machinegun-team';
  if (chance < 0.34) return 'heavy';
  if (chance < 0.40) return 'squad';
  if (chance < 0.46) return 'sniper';
  if (chance < 0.52) return 'laser';
  if (chance < 0.58) return 'rocketeer';
  if (chance < 0.60) return 'robot';
  if (chance < 0.66) return 'cobra';
  if (chance < 0.71) return 'robot';
  if (chance < 0.76) return 'tank';
  if (chance < 0.80) return 'robot';
  if (chance < 0.84) return 'laser';
  if (chance < 0.88) return 'sidecar';
  return 'jet';
}

function createMembers(id: number, variant: EnemyVariant): EnemyMember[] | undefined {
  const offsets = variant === 'squad' ? SQUAD_OFFSETS
    : variant === 'mortar-team' || variant === 'machinegun-team' ? [[-24, 3], [24, 3]] as const
      : null;
  return offsets?.map(([offsetX, offsetY], index) => ({ id: id * 100 + index + 1, offsetX, offsetY }));
}

function canAimAsVehicle(variant: EnemyVariant): boolean {
  return variant === 'tank' || variant === 'cobra' || variant === 'jet' || variant === 'sidecar' || variant === 'robot';
}

function isMovingEnemy(variant: EnemyVariant): boolean {
  return variant === 'tank' || variant === 'jet' || variant === 'sidecar';
}

function attackDelay(variant: EnemyVariant): number {
  if (variant === 'sidecar') return 2500;
  if (variant === 'jet') return 2400;
  if (variant === 'tank') return 3000;
  if (variant === 'mortar-team') return 4300;
  if (variant === 'machinegun-team') return 2700;
  if (variant === 'squad') return 2100;
  if (variant === 'laser') return 2500;
  if (variant === 'robot') return 3200;
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
  if (enemy.variant === 'squad') {
    return { x: width * (enemy.corner.endsWith('left') ? 0.28 : 0.72), y: Math.max(270, height * 0.5) };
  }
  if (!isMovingEnemy(enemy.variant)) return enemyCenter(enemy.corner, width, height);
  const progress = tankProgress(enemy, now);
  const fromLeft = enemy.corner.endsWith('left');
  return { x: fromLeft ? -120 + (width + 240) * progress : width + 120 - (width + 240) * progress, y: height * (enemy.variant === 'jet' ? 0.31 : enemy.variant === 'sidecar' ? 0.58 : 0.49) };
}

/** Animated tank cannon angle, in local degrees after its chassis is mirrored. */
export function tankTurretAngle(enemy: PeekingEnemy, width: number, height: number, progress: number): number {
  const p = Math.max(0, Math.min(1, progress));
  const x = enemy.corner.endsWith('left') ? -120 + (width + 240) * p : width + 120 - (width + 240) * p;
  const y = height * 0.49;
  const worldAngle = Math.atan2(height * 0.84 - y, width / 2 - x) * 180 / Math.PI;
  return enemy.corner.endsWith('left') ? 180 - worldAngle : worldAngle;
}

export function enemyMemberAimCenter(enemy: PeekingEnemy, member: EnemyMember, width: number, height: number, now: number): { x: number; y: number } {
  const center = enemyAimCenter(enemy, width, height, now);
  return { x: center.x + member.offsetX, y: center.y + member.offsetY };
}

/** Copy for the battle HUD. The caller decides where and when to display it. */
export function squadGrenadeSuggestion(locale: 'tr' | 'en'): string {
  return locale === 'tr' ? '10 KİŞİLİK TAKIM · EL BOMBASI ÖNERİLİR' : '10-PERSON SQUAD · GRENADE RECOMMENDED';
}

export function enemyArmor(variant: EnemyVariant): number {
  return variant === 'tank' ? 20 : variant === 'cobra' ? 12 : variant === 'jet' ? 10 : variant === 'sidecar' ? 8 : variant === 'robot' ? 6 : 1;
}

export function weaponDamage(variant: EnemyVariant, weapon: Pick<Weapon, 'id' | 'archetype'>): number {
  if (weapon.id === 'flashbang' || weapon.id === 'smoke-grenade') return 0;
  if (!canAimAsVehicle(variant)) return 1;
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
  if (state.enemy?.fallen?.some(({ diedAt }) => now >= diedAt + 1000)) {
    state = { ...state, enemy: { ...state.enemy, fallen: state.enemy.fallen.filter(({ diedAt }) => now < diedAt + 1000) } };
  }
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
        const hitsPerDamage = enemy.variant === 'machinegun-team' ? 6 : 10;
        const shouldDamage = (state.automaticTotalHits + 1) % hitsPerDamage === 0;
        const canDamage = now - state.lastDamageAt >= 5000;
        return { ...state, enemy: nextEnemy, attackSequence, automaticHits, automaticTotalHits: state.automaticTotalHits + 1,
          health: shouldDamage && canDamage ? Math.max(0, state.health - 1) : state.health,
          lastDamageAt: shouldDamage && canDamage ? now : state.lastDamageAt,
          lastAttack: { id: attackSequence, variant: enemy.variant, kind: 'shot', at: now } };
      }
      if (enemy.variant === 'rocketeer' || enemy.variant === 'cobra' || enemy.variant === 'mortar-team' || enemy.variant === 'robot') {
        return { ...state, enemy: nextEnemy, attackSequence,
          projectile: { id: attackSequence, variant: enemy.variant, corner: enemy.corner, launchedAt: now,
            impactsAt: now + (enemy.variant === 'cobra' ? 850 : enemy.variant === 'mortar-team' ? 1400 : enemy.variant === 'robot' ? 920 : 1050) },
          lastAttack: { id: attackSequence, variant: enemy.variant, kind: 'launch', at: now } };
      }
      const hit = now - state.lastDamageAt >= 5000;
      return { ...state, enemy: nextEnemy, attackSequence,
        health: hit ? Math.max(0, state.health - 1) : state.health,
        lastDamageAt: hit ? now : state.lastDamageAt,
        lastAttack: { id: attackSequence, variant: enemy.variant, kind: enemy.variant === 'laser' ? 'laser' : 'shot', at: now } };
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
    const members = createMembers(id, variant);
    const initialArmor = members?.length ?? (state.vehicleArmor[variant] ?? enemyArmor(variant));
    return {
      ...state, warning: null,
      enemy: { id, corner, variant, appearedAt: now, firesAt, nextShotAt: firesAt, shotsFired: 0,
        leavesAt: now + (variant === 'tank' ? 6900 : variant === 'jet' ? 5200 : variant === 'sidecar' ? 5700 : variant === 'cobra' ? 6900 : variant === 'rocketeer' ? 6300 : variant === 'mortar-team' ? 9800 : variant === 'machinegun-team' ? 7600 : variant === 'squad' ? 9000 : variant === 'laser' ? 6100 : variant === 'robot' ? 7300 : variant === 'heavy' || variant === 'scout' ? 6100 : 5600),
        fired: false, armor: initialArmor, maxArmor: members?.length ?? enemyArmor(variant), ...(members ? { members } : {}) },
      medkit: variant === 'cobra' && state.health < PLAYER_HEALTH && !state.medkit && medkitChance < 0.3
        ? { id, corner, droppedAt: now, expiresAt: now + 3200 }
        : state.medkit,
    };
  }
  if (now < state.nextAppearanceAt) return state;
  const previous = state.lastCorner ? CORNERS.indexOf(state.lastCorner) : -1;
  const safeChance = Math.max(0, Math.min(0.999999, chance));
  const selectedCorner = CORNERS[(previous + 1 + Math.floor(safeChance * (state.lastCorner ? 3 : 4))) % 4];
  let variant = variantForChance(safeChance);
  if (variant === state.lastVariant) {
    const replacement = variantForChance((safeChance + 0.113) % 1);
    variant = replacement === state.lastVariant ? (variant === 'rifle' ? 'scout' : 'rifle') : replacement;
  }
  const corner: Corner = variant === 'cobra' || variant === 'jet' || variant === 'laser' || variant === 'robot'
    ? (selectedCorner.endsWith('left') ? 'upper-left' : 'upper-right') : selectedCorner;
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
  const enemy = state.enemy;
  const center = enemyAimCenter(enemy, width, height, now);
  if (enemy.members?.length) {
    const damage = weaponDamage(enemy.variant, weapon);
    if (damage === 0) return state;
    const isBlast = weapon.archetype === 'grenade' || weapon.archetype === 'launcher';
    const xTolerance = (isBlast ? (enemy.variant === 'squad' ? 104 : 54) : enemy.variant === 'squad' ? 15 : 19) * radius;
    const yTolerance = (isBlast ? (enemy.variant === 'squad' ? 60 : 38) : 24) * radius;
    const hitMembers = enemy.members
      .map((member) => {
        const target = enemyMemberAimCenter(enemy, member, width, height, now);
        const dx = aim.x - target.x;
        const dy = aim.y - target.y;
        return { member, dx, dy, distanceSquared: dx * dx + dy * dy };
      })
      .filter(({ dx, dy }) => Math.abs(dx) <= xTolerance && Math.abs(dy) <= yTolerance);
    const hitIds = new Set((isBlast
      ? hitMembers.map(({ member }) => member)
      : hitMembers
        .sort((a, b) => a.distanceSquared - b.distanceSquared || a.member.id - b.member.id)
        .slice(0, 1)
        .map(({ member }) => member))
      .map((member) => member.id));
    if (!hitIds.size) return state;
    const members = enemy.members.filter((member) => !hitIds.has(member.id));
    const killed = hitIds.size;
    const fallen = [
      ...(enemy.fallen ?? []),
      ...enemy.members.filter((member) => hitIds.has(member.id)).map((member) => ({ member, diedAt: now })),
    ];
    if (members.length) {
      return {
        ...state,
        kills: state.kills + killed,
        enemy: { ...enemy, members, fallen, armor: members.length },
      };
    }
    const vehicleArmor = { ...state.vehicleArmor };
    delete vehicleArmor[enemy.variant];
    return {
      ...state,
      kills: state.kills + killed,
      enemy: null,
      nextAppearanceAt: now + 1800,
      vehicleArmor,
      death: { id: enemy.id, variant: enemy.variant, x: center.x, y: center.y, diedAt: now, fromLeft: enemy.corner.endsWith('left') },
    };
  }
  const xTolerance = enemy.variant === 'tank' || enemy.variant === 'jet' || enemy.variant === 'sidecar' ? 100 : enemy.variant === 'cobra' ? 82 : 43;
  const yTolerance = enemy.variant === 'tank' || enemy.variant === 'sidecar' ? 57 : enemy.variant === 'jet' ? 42 : enemy.variant === 'cobra' ? 45 : 61;
  if (Math.abs(aim.x - center.x) > xTolerance * radius || Math.abs(aim.y - center.y) > yTolerance * radius) return state;
  const damage = weaponDamage(enemy.variant, weapon);
  if (damage === 0) return state;
  const armor = Math.max(0, enemy.armor - damage);
  if (armor > 0) return { ...state, enemy: { ...enemy, armor },
    vehicleArmor: canAimAsVehicle(enemy.variant) && enemy.maxArmor > 1 ? { ...state.vehicleArmor, [enemy.variant]: armor } : state.vehicleArmor };
  const vehicleArmor = { ...state.vehicleArmor };
  delete vehicleArmor[enemy.variant];
  return { ...state, enemy: null, kills: state.kills + 1, nextAppearanceAt: now + 1800,
    vehicleArmor,
     death: { id: enemy.id, variant: enemy.variant, x: center.x, y: center.y, diedAt: now, fromLeft: enemy.corner.endsWith('left') } };
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

/**
 * Shift every scheduled timestamp by elapsed pause time. Call once when a
 * paused combat picker closes so setup, shells, burst fire and deaths truly
 * resume where the player left them.
 */
export function shiftEnemyCombatTime(state: EnemyCombat, deltaMs: number): EnemyCombat {
  if (!Number.isFinite(deltaMs) || deltaMs <= 0) return state;
  const shift = (time: number) => time + deltaMs;
  return {
    ...state,
    nextAppearanceAt: shift(state.nextAppearanceAt),
    lastDamageAt: shift(state.lastDamageAt),
    warning: state.warning ? {
      ...state.warning,
      appearsAt: state.warning.appearsAt === null ? null : shift(state.warning.appearsAt),
    } : null,
    enemy: state.enemy ? {
      ...state.enemy,
      appearedAt: shift(state.enemy.appearedAt),
      firesAt: shift(state.enemy.firesAt),
      leavesAt: shift(state.enemy.leavesAt),
      nextShotAt: shift(state.enemy.nextShotAt),
      fallen: state.enemy.fallen?.map((fallen) => ({ ...fallen, diedAt: shift(fallen.diedAt) })),
    } : null,
    projectile: state.projectile ? {
      ...state.projectile,
      launchedAt: shift(state.projectile.launchedAt),
      impactsAt: shift(state.projectile.impactsAt),
    } : null,
    medkit: state.medkit ? {
      ...state.medkit,
      droppedAt: shift(state.medkit.droppedAt),
      expiresAt: shift(state.medkit.expiresAt),
    } : null,
    death: state.death ? { ...state.death, diedAt: shift(state.death.diedAt) } : null,
    lastAttack: state.lastAttack ? { ...state.lastAttack, at: shift(state.lastAttack.at) } : null,
  };
}