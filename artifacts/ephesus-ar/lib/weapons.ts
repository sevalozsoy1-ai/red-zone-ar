export type WeaponCategory =
  | 'Tabancalar'
  | 'Hafif Makineliler'
  | 'Taarruz Tüfekleri'
  | 'Pompalı Tüfekler'
  | 'Keskin Nişancı Tüfekleri'
  | 'Makineli Tüfekler'
  | 'El Bombaları'
  | 'Roketatarlar'
  | 'Enerji Silahları'
  | 'Özel Ekipman';
export type WeaponArchetype =
  | 'pistol'
  | 'rifle'
  | 'shotgun'
  | 'sniper'
  | 'machinegun'
  | 'minigun'
  | 'grenade'
  | 'launcher'
  | 'energy'
  | 'slingshot'
  | 'melee';
export type WeaponAudioArchetype =
  | 'pistol'
  | 'smg'
  | 'rifle'
  | 'shotgun'
  | 'sniper'
  | 'machinegun'
  | 'launcher'
  | 'energy'
  | 'slingshot'
  | 'melee';

type WeaponDefinition = {
  id: string;
  name: string;
  category: WeaponCategory;
  archetype: WeaponArchetype;
  audioArchetype: WeaponAudioArchetype;
  capacity: number;
  interval: number;
  automatic: boolean;
  recoil: number;
  zoom: number;
  kind?: 'grenade';
};

// Curated game catalog. Values are illustrative simulation values.
export const WEAPONS = [
  { id: 'glock-17', name: 'Glock 17', category: 'Tabancalar', archetype: 'pistol', audioArchetype: 'pistol', capacity: 17, interval: 245, automatic: false, recoil: 11, zoom: 1 },
  { id: 'desert-eagle', name: 'Desert Eagle', category: 'Tabancalar', archetype: 'pistol', audioArchetype: 'shotgun', capacity: 7, interval: 420, automatic: false, recoil: 22, zoom: 1 },
  { id: 'mp5', name: 'Heckler & Koch MP5', category: 'Hafif Makineliler', archetype: 'rifle', audioArchetype: 'smg', capacity: 30, interval: 90, automatic: true, recoil: 6, zoom: 1 },
  { id: 'p90', name: 'FN P90', category: 'Hafif Makineliler', archetype: 'rifle', audioArchetype: 'smg', capacity: 50, interval: 78, automatic: true, recoil: 5, zoom: 1.25 },
  { id: 'm4a1', name: 'Colt M4A1', category: 'Taarruz Tüfekleri', archetype: 'rifle', audioArchetype: 'rifle', capacity: 30, interval: 95, automatic: true, recoil: 8, zoom: 1.25 },
  { id: 'ak-47', name: 'AK-47', category: 'Taarruz Tüfekleri', archetype: 'rifle', audioArchetype: 'rifle', capacity: 30, interval: 110, automatic: true, recoil: 11, zoom: 1 },
  { id: 'hk416', name: 'Heckler & Koch HK416', category: 'Taarruz Tüfekleri', archetype: 'rifle', audioArchetype: 'rifle', capacity: 30, interval: 88, automatic: true, recoil: 7, zoom: 1.5 },
  { id: 'g3', name: 'Heckler & Koch G3', category: 'Taarruz Tüfekleri', archetype: 'rifle', audioArchetype: 'rifle', capacity: 20, interval: 105, automatic: true, recoil: 13, zoom: 1 },
  { id: 'm16a4', name: 'Colt M16A4', category: 'Taarruz Tüfekleri', archetype: 'rifle', audioArchetype: 'rifle', capacity: 30, interval: 110, automatic: true, recoil: 8, zoom: 1.25 },
  { id: 'akm', name: 'AKM Kalaşnikof', category: 'Taarruz Tüfekleri', archetype: 'rifle', audioArchetype: 'rifle', capacity: 30, interval: 108, automatic: true, recoil: 12, zoom: 1 },
  { id: 'scar-l', name: 'FN SCAR-L', category: 'Taarruz Tüfekleri', archetype: 'rifle', audioArchetype: 'rifle', capacity: 30, interval: 96, automatic: true, recoil: 8, zoom: 1.25 },
  { id: 'g36c', name: 'Heckler & Koch G36C', category: 'Taarruz Tüfekleri', archetype: 'rifle', audioArchetype: 'rifle', capacity: 30, interval: 92, automatic: true, recoil: 8, zoom: 1.25 },
  { id: 'famas', name: 'FAMAS F1', category: 'Taarruz Tüfekleri', archetype: 'rifle', audioArchetype: 'rifle', capacity: 25, interval: 82, automatic: true, recoil: 9, zoom: 1 },
  { id: 'aug-a3', name: 'Steyr AUG A3', category: 'Taarruz Tüfekleri', archetype: 'rifle', audioArchetype: 'rifle', capacity: 30, interval: 90, automatic: true, recoil: 8, zoom: 1.5 },
  { id: 'uzi', name: 'Uzi', category: 'Hafif Makineliler', archetype: 'rifle', audioArchetype: 'smg', capacity: 32, interval: 86, automatic: true, recoil: 7, zoom: 1 },
  { id: 'remington-870', name: 'Remington 870', category: 'Pompalı Tüfekler', archetype: 'shotgun', audioArchetype: 'shotgun', capacity: 7, interval: 780, automatic: false, recoil: 20, zoom: 1 },
  { id: 'benelli-m4', name: 'Benelli M4', category: 'Pompalı Tüfekler', archetype: 'shotgun', audioArchetype: 'shotgun', capacity: 7, interval: 420, automatic: false, recoil: 18, zoom: 1 },
  { id: 'awp', name: 'Accuracy International AWP', category: 'Keskin Nişancı Tüfekleri', archetype: 'sniper', audioArchetype: 'sniper', capacity: 5, interval: 1200, automatic: false, recoil: 25, zoom: 4 },
  { id: 'barrett-m82', name: 'Barrett M82', category: 'Keskin Nişancı Tüfekleri', archetype: 'sniper', audioArchetype: 'sniper', capacity: 10, interval: 900, automatic: false, recoil: 28, zoom: 4 },
  { id: 'dragunov-svd', name: 'Dragunov SVD', category: 'Keskin Nişancı Tüfekleri', archetype: 'sniper', audioArchetype: 'sniper', capacity: 10, interval: 520, automatic: false, recoil: 20, zoom: 3 },
  { id: 'm249', name: 'FN M249 SAW', category: 'Makineli Tüfekler', archetype: 'machinegun', audioArchetype: 'machinegun', capacity: 100, interval: 85, automatic: true, recoil: 9, zoom: 1.25 },
  { id: 'mg42', name: 'MG 42', category: 'Makineli Tüfekler', archetype: 'machinegun', audioArchetype: 'machinegun', capacity: 50, interval: 58, automatic: true, recoil: 13, zoom: 1 },
  { id: 'mg3', name: 'Rheinmetall MG3', category: 'Makineli Tüfekler', archetype: 'machinegun', audioArchetype: 'machinegun', capacity: 50, interval: 60, automatic: true, recoil: 13, zoom: 1 },
  { id: 'pkm', name: 'PKM', category: 'Makineli Tüfekler', archetype: 'machinegun', audioArchetype: 'machinegun', capacity: 100, interval: 82, automatic: true, recoil: 12, zoom: 1 },
  { id: 'minigun-m134', name: 'M134 Minigun', category: 'Makineli Tüfekler', archetype: 'minigun', audioArchetype: 'machinegun', capacity: 200, interval: 50, automatic: true, recoil: 10, zoom: 1 },
  { id: 'frag-grenade', name: 'Parça Tesirli Bomba', category: 'El Bombaları', archetype: 'grenade', audioArchetype: 'shotgun', capacity: 3, interval: 1300, automatic: false, recoil: 4, zoom: 1, kind: 'grenade' },
  { id: 'flashbang', name: 'Flaş Bombası', category: 'El Bombaları', archetype: 'grenade', audioArchetype: 'pistol', capacity: 3, interval: 1300, automatic: false, recoil: 3, zoom: 1, kind: 'grenade' },
  { id: 'smoke-grenade', name: 'Duman Bombası', category: 'El Bombaları', archetype: 'grenade', audioArchetype: 'smg', capacity: 3, interval: 1600, automatic: false, recoil: 3, zoom: 1, kind: 'grenade' },
  { id: 'bazooka', name: 'Bazooka', category: 'Roketatarlar', archetype: 'launcher', audioArchetype: 'launcher', capacity: 1, interval: 1400, automatic: false, recoil: 28, zoom: 1.25 },
  { id: 'rpg-7', name: 'RPG-7', category: 'Roketatarlar', archetype: 'launcher', audioArchetype: 'launcher', capacity: 1, interval: 1500, automatic: false, recoil: 30, zoom: 1.5 },
  { id: 'at4', name: 'AT4', category: 'Roketatarlar', archetype: 'launcher', audioArchetype: 'launcher', capacity: 1, interval: 1650, automatic: false, recoil: 33, zoom: 1.25 },
  { id: 'laser-rifle', name: 'Prism Laser Rifle', category: 'Enerji Silahları', archetype: 'energy', audioArchetype: 'energy', capacity: 18, interval: 190, automatic: true, recoil: 4, zoom: 1.5 },
  { id: 'electric-arc', name: 'Electric Arc Caster', category: 'Enerji Silahları', archetype: 'energy', audioArchetype: 'energy', capacity: 8, interval: 720, automatic: false, recoil: 10, zoom: 1.25 },
  { id: 'slingshot', name: 'Steel Ball Slingshot', category: 'Özel Ekipman', archetype: 'slingshot', audioArchetype: 'slingshot', capacity: 1, interval: 760, automatic: false, recoil: 8, zoom: 1 },
  { id: 'knife', name: 'Field Knife', category: 'Özel Ekipman', archetype: 'melee', audioArchetype: 'melee', capacity: 5, interval: 520, automatic: false, recoil: 6, zoom: 1 },
] as const satisfies readonly WeaponDefinition[];

export type Weapon = (typeof WEAPONS)[number];
export type WeaponId = Weapon['id'];
export const WEAPON_CATEGORIES = [...new Set(WEAPONS.map((weapon) => weapon.category))] as WeaponCategory[];
export const FREE_WEAPON_CATEGORIES = ['Tabancalar', 'Hafif Makineliler'] as const;
export type WeaponAccess = 'free' | 'pro';
/** Simulated Pro weapon grants are exact 24-hour runtime entitlements. */
export const PRO_WEAPON_UNLOCK_DURATION_MS = 24 * 60 * 60 * 1_000;

/**
 * The starter arsenal is intentionally narrow: only pistols and SMGs are
 * free. Shotguns, rifles, snipers, heavy weapons, launchers, explosives,
 * energy weapons, the slingshot and the knife are individually pro-gated.
 */
export const isFreeWeapon = (weapon: WeaponId | Pick<Weapon, 'category'>): boolean => {
  const category = typeof weapon === 'string' ? getWeapon(weapon).category : weapon.category;
  return (FREE_WEAPON_CATEGORIES as readonly string[]).includes(category);
};

export const getWeaponAccess = (weapon: WeaponId | Pick<Weapon, 'category'>): WeaponAccess =>
  isFreeWeapon(weapon) ? 'free' : 'pro';

export const isProWeapon = (weapon: WeaponId | Pick<Weapon, 'category'>): boolean =>
  !isFreeWeapon(weapon);

const LEGACY_WEAPON_IDS: Record<string, WeaponId> = {
  pistol: 'glock-17', rifle: 'm4a1', sniper: 'awp',
  'beretta-92fs': 'glock-17', 'colt-1911': 'glock-17', 'sig-p226': 'glock-17',
  'cz-75': 'glock-17', 'walther-p99': 'glock-17', 'hk-usp': 'glock-17',
  mp7: 'mp5', uzi: 'mp5', vector: 'mp5', 'mac-10': 'mp5', 'ppsh-41': 'mp5',
  'ak-74': 'ak-47', m16a4: 'm4a1', 'scar-l': 'hk416', 'aug-a3': 'hk416',
  famas: 'm4a1', g36c: 'hk416', 'galil-ace': 'ak-47', 'mossberg-500': 'remington-870',
  'spas-12': 'benelli-m4', 'aa-12': 'benelli-m4', ksg: 'remington-870',
  'remington-700': 'awp', m24: 'awp', m40a5: 'awp', 'cheytac-m200': 'barrett-m82',
  m240b: 'm249', pkm: 'mg42', rpk: 'm249', m60: 'm249',
  bazooka: 'bazooka', 'rpg': 'rpg-7', 'rocket-launcher': 'bazooka',
  'prism-laser': 'laser-rifle', laser: 'laser-rifle', 'arc-caster': 'electric-arc',
  'electric-arc-gun': 'electric-arc', 'steel-sling': 'slingshot', 'field-knife': 'knife',
};

export const isWeaponId = (value: unknown): value is WeaponId =>
  typeof value === 'string' && WEAPONS.some((weapon) => weapon.id === value);
export const migrateWeaponId = (value: unknown): WeaponId | null => {
  if (isWeaponId(value)) return value;
  return typeof value === 'string' ? LEGACY_WEAPON_IDS[value] ?? null : null;
};
export const getWeapon = (id: WeaponId): Weapon => WEAPONS.find((weapon) => weapon.id === id) ?? WEAPONS[0];

export type WeaponAction = 'firearm' | 'grenade' | 'launch' | 'energy' | 'slingshot' | 'melee';

export const getWeaponAction = (weapon: Pick<Weapon, 'archetype'>): WeaponAction => {
  switch (weapon.archetype) {
    case 'grenade':
      return 'grenade';
    case 'launcher':
      return 'launch';
    case 'energy':
      return 'energy';
    case 'slingshot':
      return 'slingshot';
    case 'melee':
      return 'melee';
    default:
      return 'firearm';
  }
};

export const getWeaponAmmoLabel = (weapon: Pick<Weapon, 'archetype'>): string => {
  switch (getWeaponAction(weapon)) {
    case 'grenade':
      return 'ADET';
    case 'launch':
      return 'ROKET';
    case 'energy':
      return 'ENERJİ';
    case 'slingshot':
      return 'ÇELİK BİLYE';
    case 'melee':
      return 'VURUŞ';
    default:
      return 'MERMİ';
  }
};

export const getWeaponFireLabel = (weapon: Pick<Weapon, 'archetype'>): string => {
  switch (getWeaponAction(weapon)) {
    case 'grenade':
      return 'AT';
    case 'launch':
      return 'ROKET AT';
    case 'energy':
      return 'ENERJİ';
    case 'slingshot':
      return 'BİLYE AT';
    case 'melee':
      return 'BIÇAK';
    default:
      return 'ATEŞ';
  }
};

export const getWeaponReloadLabel = (weapon: Pick<Weapon, 'archetype'>): string => {
  switch (getWeaponAction(weapon)) {
    case 'launch':
      return 'Yeni roket yükle';
    case 'energy':
      return 'Enerji hücresini değiştir';
    case 'slingshot':
      return 'Çelik bilye yerleştir';
    case 'melee':
      return 'Bıçağı hazırla';
    default:
      return 'Şarjörü değiştir';
  }
};

export type WeaponSupplyCopy = {
  title: string;
  body: string;
  rewardLabel: string;
};

export const getWeaponSupplyCopy = (weapon: Pick<Weapon, 'archetype'>): WeaponSupplyCopy => {
  switch (getWeaponAction(weapon)) {
    case 'grenade':
      return {
        title: 'Mola ver, bombaları yenile',
        body: 'Bu yalnızca 5 saniyelik bir denemedir. Üçlü el bombası setini yenilemek için simülasyonu tamamla.',
        rewardLabel: 'BOMBALARI DOLDUR',
      };
    case 'launch':
      return {
        title: 'Mola ver, roketi yükle',
        body: 'Bu yalnızca 5 saniyelik bir denemedir. Bir yedek roket ve dolu roketatar için simülasyonu tamamla.',
        rewardLabel: 'ROKETİ YÜKLE',
      };
    case 'energy':
      return {
        title: 'Mola ver, enerji hücresini doldur',
        body: 'Bu yalnızca 5 saniyelik bir denemedir. Bir yedek enerji hücresi ve tam enerji seviyesi kazan.',
        rewardLabel: 'ENERJİYİ DOLDUR',
      };
    case 'slingshot':
      return {
        title: 'Mola ver, çelik bilye hazırla',
        body: 'Bu yalnızca 5 saniyelik bir denemedir. Çelik bilyeyi ve yedek bilye kaynağını yenile.',
        rewardLabel: 'BİLYE HAZIRLA',
      };
    case 'melee':
      return {
        title: 'Mola ver, bıçağı hazırla',
        body: 'Bu yalnızca 5 saniyelik bir denemedir. Bıçağı hazırla ve bir yedek vuruş hakkı kazan.',
        rewardLabel: 'BIÇAĞI HAZIRLA',
      };
    default:
      return {
        title: 'Mola ver, şarjörü yenile',
        body: 'Bu yalnızca 5 saniyelik bir denemedir. Gerçek reklam gösterilmez, ödeme veya reklam ağı bağlantısı yoktur.',
        rewardLabel: 'ŞARJÖRÜ DOLDUR',
      };
  }
};