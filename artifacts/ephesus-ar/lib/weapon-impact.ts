import type { Weapon } from './weapons';
import type { ImpactKind } from './impact-tracker';

export function impactForWeapon(weapon: Weapon): ImpactKind {
  switch (weapon.id) {
    case 'frag-grenade': return 'frag';
    case 'flashbang': return 'flash';
    case 'smoke-grenade': return 'smoke';
    case 'knife': return 'slash';
    case 'slingshot': return 'pebble';
    case 'electric-arc':
    case 'laser-rifle': return 'plasma';
    default:
      switch (weapon.archetype) {
        case 'pistol': return 'bullet';
        case 'rifle': return 'ember';
        case 'machinegun':
        case 'minigun': return 'firestorm';
        case 'shotgun': return 'pellets';
        case 'sniper': return 'scorch';
        case 'launcher': return 'rocket';
        // Exhaustive for this catalog: unexpected additions should not
        // silently turn into a grenade-style explosion.
        default: throw new Error('Missing weapon impact treatment');
      }
  }
}

export function projectileFlightMs(weapon: Weapon): number {
  if (weapon.archetype === 'grenade') return 700;
  if (weapon.archetype === 'launcher') return 520;
  return 0;
}