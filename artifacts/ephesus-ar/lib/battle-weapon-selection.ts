import type { WeaponId } from './weapons';

type BattleWeaponSelectionOptions = {
  currentWeapon: WeaponId;
  nextWeapon: WeaponId;
  closePicker: () => void;
  stopActions: () => void;
  saveCurrentAmmo: () => void;
  selectWeapon: (id: WeaponId) => void;
};

export function applyBattleWeaponSelection({
  currentWeapon,
  nextWeapon,
  closePicker,
  stopActions,
  saveCurrentAmmo,
  selectWeapon,
}: BattleWeaponSelectionOptions): boolean {
  closePicker();
  if (nextWeapon === currentWeapon) return false;

  stopActions();
  saveCurrentAmmo();
  selectWeapon(nextWeapon);
  return true;
}