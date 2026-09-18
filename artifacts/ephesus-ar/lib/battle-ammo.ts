/**
 * Match-scoped magazine accounting.
 *
 * A match starts with one loaded magazine and two reserve magazines. Equipping
 * an unseen weapon may consume one reserve to load it; it must not mint a new
 * reserve budget. A refill action supplies three magazines. When the current
 * magazine is empty, one of those magazines fills it and two remain in the
 * shared reserve. A partially loaded (or full) magazine is never overwritten;
 * all three are added to reserve instead.
 */
export type MagazineState = {
  capacity: number;
  ammo: number;
};

export type MatchMagazineInventory = {
  reserveMagazines: number;
  weapons: Record<string, MagazineState>;
  initialWeaponId: string;
};

export function createMatchMagazineInventory(
  initialWeaponId: string,
  capacity: number,
): MatchMagazineInventory {
  return {
    reserveMagazines: 2,
    initialWeaponId,
    weapons: {
      [initialWeaponId]: { capacity, ammo: capacity },
    },
  };
}

export function equipMagazine(
  inventory: MatchMagazineInventory,
  weaponId: string,
  capacity: number,
): { inventory: MatchMagazineInventory; ammo: number; consumedReserve: boolean } {
  const existing = inventory.weapons[weaponId];
  if (existing) return { inventory, ammo: existing.ammo, consumedReserve: false };

  const consumedReserve = inventory.reserveMagazines > 0;
  const nextInventory: MatchMagazineInventory = {
    ...inventory,
    reserveMagazines: Math.max(0, inventory.reserveMagazines - (consumedReserve ? 1 : 0)),
    weapons: {
      ...inventory.weapons,
      [weaponId]: { capacity, ammo: consumedReserve ? capacity : 0 },
    },
  };
  return {
    inventory: nextInventory,
    ammo: nextInventory.weapons[weaponId].ammo,
    consumedReserve,
  };
}

export function setMagazineAmmo(
  inventory: MatchMagazineInventory,
  weaponId: string,
  capacity: number,
  ammo: number,
): MatchMagazineInventory {
  return {
    ...inventory,
    weapons: {
      ...inventory.weapons,
      [weaponId]: {
        capacity,
        ammo: Math.max(0, Math.min(capacity, Math.floor(ammo))),
      },
    },
  };
}

export function reloadMagazine(
  inventory: MatchMagazineInventory,
  weaponId: string,
  capacity: number,
): { inventory: MatchMagazineInventory; ammo: number; consumedReserve: boolean } {
  const current = inventory.weapons[weaponId]?.ammo ?? 0;
  if (current >= capacity || inventory.reserveMagazines <= 0) {
    return {
      inventory: setMagazineAmmo(inventory, weaponId, capacity, current),
      ammo: Math.min(capacity, current),
      consumedReserve: false,
    };
  }
  const nextInventory = {
    ...setMagazineAmmo(inventory, weaponId, capacity, capacity),
    reserveMagazines: inventory.reserveMagazines - 1,
  };
  return { inventory: nextInventory, ammo: capacity, consumedReserve: true };
}

export function refillMagazines(
  inventory: MatchMagazineInventory,
  weaponId: string,
  capacity: number,
): { inventory: MatchMagazineInventory; ammo: number; filledExisting: boolean } {
  const current = inventory.weapons[weaponId]?.ammo ?? 0;
  const filledExisting = current === 0;
  const next = setMagazineAmmo(
    inventory,
    weaponId,
    capacity,
    filledExisting ? capacity : current,
  );
  return {
    inventory: {
      ...next,
      // An empty current magazine uses one refill magazine, leaving two;
      // otherwise the existing magazine is preserved and all three are spare.
      reserveMagazines: next.reserveMagazines + (filledExisting ? 2 : 3),
    },
    ammo: filledExisting ? capacity : current,
    filledExisting,
  };
}