/**
 * Red Zone AR localisation.
 *
 * This module deliberately keeps the catalogue local to the app.  It does not
 * use a network locale service (or location/IP lookup), so choosing a language
 * never sends device information anywhere.  Every supported locale has a
 * complete dictionary; `translate` does not silently substitute Turkish (or a
 * partially translated English string).
 */

export const SUPPORTED_LOCALES = [
  'tr',
  'en',
  'zh',
  'ja',
  'ar',
  'de',
  'fr',
  'es',
  'it',
  'pt',
  'ru',
  'uk',
  'hi',
  'ur',
  'bn',
  'pa',
  'id',
  'ko',
  'vi',
  'th',
  'nl',
  'pl',
  'sv',
  'fa',
] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export type LocaleInfo = {
  code: Locale;
  nativeName: string;
  englishName: string;
  rtl: boolean;
};

export const LOCALE_INFO: Record<Locale, LocaleInfo> = {
  tr: { code: 'tr', nativeName: 'Türkçe', englishName: 'Turkish', rtl: false },
  en: { code: 'en', nativeName: 'English', englishName: 'English', rtl: false },
  zh: { code: 'zh', nativeName: '简体中文', englishName: 'Chinese', rtl: false },
  ja: { code: 'ja', nativeName: '日本語', englishName: 'Japanese', rtl: false },
  ar: { code: 'ar', nativeName: 'العربية', englishName: 'Arabic', rtl: true },
  de: { code: 'de', nativeName: 'Deutsch', englishName: 'German', rtl: false },
  fr: { code: 'fr', nativeName: 'Français', englishName: 'French', rtl: false },
  es: { code: 'es', nativeName: 'Español', englishName: 'Spanish', rtl: false },
  it: { code: 'it', nativeName: 'Italiano', englishName: 'Italian', rtl: false },
  pt: { code: 'pt', nativeName: 'Português', englishName: 'Portuguese', rtl: false },
  ru: { code: 'ru', nativeName: 'Русский', englishName: 'Russian', rtl: false },
  uk: { code: 'uk', nativeName: 'Українська', englishName: 'Ukrainian', rtl: false },
  hi: { code: 'hi', nativeName: 'हिन्दी', englishName: 'Hindi', rtl: false },
  ur: { code: 'ur', nativeName: 'اردو', englishName: 'Urdu', rtl: true },
  bn: { code: 'bn', nativeName: 'বাংলা', englishName: 'Bengali', rtl: false },
  pa: { code: 'pa', nativeName: 'ਪੰਜਾਬੀ', englishName: 'Punjabi', rtl: false },
  id: { code: 'id', nativeName: 'Bahasa Indonesia', englishName: 'Indonesian', rtl: false },
  ko: { code: 'ko', nativeName: '한국어', englishName: 'Korean', rtl: false },
  vi: { code: 'vi', nativeName: 'Tiếng Việt', englishName: 'Vietnamese', rtl: false },
  th: { code: 'th', nativeName: 'ไทย', englishName: 'Thai', rtl: false },
  nl: { code: 'nl', nativeName: 'Nederlands', englishName: 'Dutch', rtl: false },
  pl: { code: 'pl', nativeName: 'Polski', englishName: 'Polish', rtl: false },
  sv: { code: 'sv', nativeName: 'Svenska', englishName: 'Swedish', rtl: false },
  fa: { code: 'fa', nativeName: 'فارسی', englishName: 'Persian', rtl: true },
};

const ENGLISH_COPY = {
  brand: 'RED ZONE AR',
  developer: 'Developer: Halil Özsoy',
  bootSubtitle: 'AN EPHESUS MEDYA GAME',
  bootCaption: 'INITIALIZING FIELD SYSTEMS',
  setupStep: 'FIELD SETUP / 01',
  permissions: 'DEVICE ACCESS',
  permissionsText: 'Allow camera access to play. Recording access is requested only when you choose to record.',
  cameraAccess: 'Camera access',
  recordingAccess: 'Recording access',
  audioInfo: 'Gameplay audio does not need a microphone permission.',
  recordingLater: 'Microphone and media access are requested only for recording.',
  grantAccess: 'GRANT CAMERA ACCESS',
  ready: 'READY',
  waiting: 'WAITING',
  continue: 'CONTINUE',
  setupOverline: 'RED ZONE AR / SETUP',
  mission: 'PROFILE SETUP',
  missionText: 'Choose your region to personalize your camera experience.',
  chooseRegion: 'CHOOSE YOUR REGION',
  region: 'YOUR REGION',
  home: 'HOME',
  openCamera: 'OPEN CAMERA',
  armory: 'ARMORY',
  store: 'STORE',
  settings: 'SETTINGS',
  camera: 'CAMERA',
  cameraReady: 'Camera ready',
  cameraHint: 'Open the camera to begin.',
  players: '2–10 PLAYERS',
  teamBattle: 'TEAM BATTLE',
  unlockedEquipment: 'UNLOCKED EQUIPMENT',
  adSimulation: 'AD SIMULATION',
  equipmentSettings: 'EQUIPMENT & SETTINGS',
  allWeaponsUnlocked: 'ALL WEAPONS UNLOCKED',
  equipmentSelection: 'Equipment selection',
  weaponsGrenades: 'Weapons · grenades',
  demoCreditStore: 'Demo credit store',
  onDeviceProcessing: 'Camera processing stays on this device.',
  system: 'SYSTEM',
  information: 'INFORMATION',
  about: 'About Red Zone AR',
  developerInfo: 'Developer information',
  privacy: 'Privacy policy',
  security: 'Data security',
  guide: 'Game guide',
  language: 'Language',
  sound: 'Background music',
  close: 'CLOSE',
  storeHeroTitle: 'POWER YOUR OPERATION',
  storeBody: 'Pro credits never expire. Keep your operation moving when you need an upgrade.',
  creditPacks: 'PRO CREDIT PACKS',
  noExpiry: 'No expiry · instant delivery',
  paymentUnavailable: 'Payments unavailable',
  paymentUnavailableBody: 'In-app purchases are not connected in this build. No money will be charged and no credits were added.',
  paymentUnavailableButton: 'UNDERSTOOD',
  storeNote: 'You can continue for free with the simulated ad option. Ad allowances reset daily.',
  errorTitle: 'Something went wrong',
  errorMessage: 'Please reload the app to continue.',
  tryAgain: 'TRY AGAIN',
  errorDetails: 'Error details',
  viewErrorDetails: 'View error details',
  closeErrorDetails: 'Close error details',
  detailAbout: 'Red Zone AR is a camera-based action and weapon simulation game developed by Ephesus Medya.',
  detailDeveloper: 'Developer: Halil Özsoy\n\nRed Zone AR is independently developed under Ephesus Medya.',
  detailPrivacy: 'Camera frames are processed on this device only during an active camera session; this app does not upload them. This build does not request microphone or location access and does not create recordings. Preferences and simulation progress are stored locally with AsyncStorage. Team battle sends the player name you choose, room, team, marker, gameplay state, and a temporary session credential to the configured API; camera frames, microphone audio, and location are not sent. This build has no live ads, payments, accounts, or third-party analytics. A public privacy-policy URL and support contact are not configured in this test build; this in-app summary is not a substitute for a published policy.',
  detailSecurity: 'Local preferences and simulation progress stay on the device. Multiplayer requests use a temporary session credential and send only the room/gameplay data needed by the configured API. Camera frames, microphone audio, and location are not sent by this app.',
  detailGuide: '1. Grant camera access. 2. Choose equipment from the catalogue; all equipment is available in this simulation. 3. Move the sight with the joystick and use the action button to fire. 4. Night and thermal views are visual filter simulations, not real sensing. 5. Ads in this build are simulations. 6. Camera processing stays on this device.',
  countryTR: 'Türkiye',
  countryDE: 'Germany',
  countryUA: 'Ukraine',
  countryUS: 'United States',
} as const;

export type CommerceTranslationKey =
  | 'simulationBadge'
  | 'noRealCharge'
  | 'simulatePurchase'
  | 'confirmSimulation'
  | 'cancelSimulation'
  | 'resetSimulation'
  | 'restoreSimulation'
  | 'gold'
  | 'goldPlan'
  | 'goldPrice'
  | 'goldDuration'
  | 'goldBenefits'
  | 'goldActive'
  | 'goldExpires'
  | 'adFree'
  | 'allProAccess'
  | 'creditsPurchaseConfirm'
  | 'creditsAdded'
  | 'goldCancelled'
  | 'simulationReset';
export type TranslationKey = keyof typeof ENGLISH_COPY | CommerceTranslationKey | 'soundTest';
export type TranslationDictionary = Record<TranslationKey, string>;

/**
 * All entries intentionally contain every key in ENGLISH_COPY.  Keeping this
 * as a strongly typed record makes adding a supported locale fail typecheck
 * until its copy is complete.
 */
export const TRANSLATIONS = {
  tr: {
    brand: 'RED ZONE AR', developer: 'Geliştirici: Halil Özsoy', bootSubtitle: 'EPHESUS MEDYA OYUNU', bootCaption: 'SAHA SİSTEMLERİ BAŞLATILIYOR', setupStep: 'SAHA KURULUMU / 01', permissions: 'CİHAZ ERİŞİMİ', permissionsText: 'Oynamak için kamera erişimine izin ver. Kayıt erişimi yalnızca kayıt yapmayı seçtiğinde istenir.', cameraAccess: 'Kamera erişimi', recordingAccess: 'Kayıt erişimi', audioInfo: 'Oyun sesi için mikrofon izni gerekmez.', recordingLater: 'Mikrofon ve medya erişimi yalnızca kayıt sırasında istenir.', grantAccess: 'KAMERA ERİŞİMİ VER', ready: 'HAZIR', waiting: 'BEKLENİYOR', continue: 'DEVAM ET', setupOverline: 'RED ZONE AR / KURULUM', mission: 'PROFİL KURULUMU', missionText: 'Kamera deneyimini kişiselleştirmek için bölgeni seç.', chooseRegion: 'BÖLGENİ SEÇ', region: 'BÖLGEN', home: 'ANA SAYFA', openCamera: 'KAMERAYI AÇ', armory: 'CEPHANELİK', store: 'MAĞAZA', settings: 'AYARLAR', camera: 'KAMERA', cameraReady: 'Kamera hazır', cameraHint: 'Başlamak için kamerayı aç.', players: '2–10 OYUNCU', teamBattle: 'TAKIM SAVAŞI', unlockedEquipment: 'AÇIK EKİPMAN', adSimulation: 'REKLAM SİMÜLASYONU', equipmentSettings: 'EKİPMAN VE AYARLAR', allWeaponsUnlocked: 'TÜM SİLAHLAR AÇIK', equipmentSelection: 'Ekipman seçimi', weaponsGrenades: 'Silahlar · el bombaları', demoCreditStore: 'Demo kredi mağazası', onDeviceProcessing: 'Kamera işleme bu cihazda kalır.', system: 'SİSTEM', information: 'BİLGİ', about: 'Red Zone AR hakkında', developerInfo: 'Geliştirici bilgileri', privacy: 'Gizlilik politikası', security: 'Veri güvenliği', guide: 'Oyun rehberi', language: 'Dil', sound: 'Arka plan müziği', close: 'KAPAT', storeHeroTitle: 'OPERASYONUNU GÜÇLENDİR', storeBody: 'Pro kredilerin süresi dolmaz. Yükseltmeye ihtiyaç duyduğunda operasyonuna devam et.', creditPacks: 'PRO KREDİ PAKETLERİ', noExpiry: 'Süresiz · anında teslim', paymentUnavailable: 'Ödeme kullanılamıyor', paymentUnavailableBody: 'Bu sürümde uygulama içi satın alma bağlantısı yoktur. Ücret alınmaz ve kredi eklenmez.', paymentUnavailableButton: 'ANLADIM', storeNote: 'Simüle reklam seçeneğiyle ücretsiz devam edebilirsin. Reklam hakları her gün sıfırlanır.', errorTitle: 'Bir sorun oluştu', errorMessage: 'Devam etmek için uygulamayı yeniden yükle.', tryAgain: 'TEKRAR DENE', errorDetails: 'Hata ayrıntıları', viewErrorDetails: 'Hata ayrıntılarını görüntüle', closeErrorDetails: 'Hata ayrıntılarını kapat', detailAbout: 'Red Zone AR, Ephesus Medya tarafından geliştirilen kamera tabanlı bir aksiyon ve silah simülasyonu oyunudur.', detailDeveloper: 'Geliştirici: Halil Özsoy\n\nRed Zone AR, Ephesus Medya çatısı altında bağımsız olarak geliştirilmiştir.', detailPrivacy: 'Kamera görüntüleri yalnızca aktif kamera oturumunda kullanılır. Sen seçmeden kayıt oluşturulmaz. Uygulama konum verisini kalıcı olarak saklamaz.', detailSecurity: 'Tercihler cihazında yerel olarak saklanır. Kamera görüntüleri sunucumuza gönderilmez. Kayıtların kontrolü sende kalır.', detailGuide: '1. Kamera erişimi ver. 2. Katalogdan ekipman seç; bu simülasyonda tüm ekipmanlar açıktır. 3. Nişangâhı joystick ile hareket ettir ve eylem düğmesiyle ateş et. 4. Gece ve termal görünümler gerçek algılama değil, görsel filtre simülasyonudur. 5. Bu sürümde reklamlar simülasyondur. 6. Kamera işleme cihazda kalır.', countryTR: 'Türkiye', countryDE: 'Almanya', countryUA: 'Ukrayna', countryUS: 'Amerika Birleşik Devletleri',
  },
  en: ENGLISH_COPY,
  zh: {
    brand: 'RED ZONE AR', developer: '开发者：Halil Özsoy', bootSubtitle: 'EPHESUS MEDYA 游戏', bootCaption: '正在初始化现场系统', setupStep: '现场设置 / 01', permissions: '设备权限', permissionsText: '允许使用相机即可开始游戏。只有在你选择录制时才会请求录制权限。', cameraAccess: '相机权限', recordingAccess: '录制权限', audioInfo: '游戏音频不需要麦克风权限。', recordingLater: '麦克风和媒体权限仅在录制时请求。', grantAccess: '允许相机权限', ready: '就绪', waiting: '等待中', continue: '继续', setupOverline: 'RED ZONE AR / 设置', mission: '个人设置', missionText: '选择所在地区来定制相机体验。', chooseRegion: '选择你的地区', region: '你的地区', home: '主页', openCamera: '打开相机', armory: '军械库', store: '商店', settings: '设置', camera: '相机', cameraReady: '相机已就绪', cameraHint: '打开相机开始游戏。', players: '2–10 名玩家', teamBattle: '团队战斗', unlockedEquipment: '已解锁装备', adSimulation: '广告模拟', equipmentSettings: '装备与设置', allWeaponsUnlocked: '全部武器已解锁', equipmentSelection: '装备选择', weaponsGrenades: '武器 · 手雷', demoCreditStore: '演示积分商店', onDeviceProcessing: '相机处理仅保留在本设备上。', system: '系统', information: '信息', about: '关于 Red Zone AR', developerInfo: '开发者信息', privacy: '隐私政策', security: '数据安全', guide: '游戏指南', language: '语言', sound: '背景音乐', close: '关闭', storeHeroTitle: '强化你的行动', storeBody: 'Pro 积分永不过期，需要升级时即可继续行动。', creditPacks: 'PRO 积分包', noExpiry: '永不过期 · 即时到账', paymentUnavailable: '支付不可用', paymentUnavailableBody: '此版本未连接应用内购买。不会扣款，也不会添加积分。', paymentUnavailableButton: '知道了', storeNote: '你可以通过模拟广告选项免费继续。广告额度每天重置。', errorTitle: '出了点问题', errorMessage: '请重新加载应用后继续。', tryAgain: '重试', errorDetails: '错误详情', viewErrorDetails: '查看错误详情', closeErrorDetails: '关闭错误详情', detailAbout: 'Red Zone AR 是由 Ephesus Medya 开发的相机动作与武器模拟游戏。', detailDeveloper: '开发者：Halil Özsoy\n\nRed Zone AR 由 Ephesus Medya 独立开发。', detailPrivacy: '相机画面仅在主动相机会话期间使用。未经选择不会创建录制。应用不会永久保存位置数据。', detailSecurity: '偏好设置保存在设备本地。相机画面不会发送到服务器。录制内容由你控制。', detailGuide: '1. 允许相机权限。2. 从目录选择装备；本模拟中的所有装备均可用。3. 用摇杆移动瞄准点并使用动作按钮射击。4. 夜视和热成像是视觉滤镜模拟，不是真实感知。5. 本版本的广告为模拟广告。6. 相机处理保留在设备上。', countryTR: '土耳其', countryDE: '德国', countryUA: '乌克兰', countryUS: '美国',
  },
  ja: {
    brand: 'RED ZONE AR', developer: '開発者：Halil Özsoy', bootSubtitle: 'EPHESUS MEDYA ゲーム', bootCaption: 'フィールドシステムを起動中', setupStep: 'フィールド設定 / 01', permissions: 'デバイスアクセス', permissionsText: 'プレイするにはカメラを許可してください。録画を選んだときだけ録画アクセスを求めます。', cameraAccess: 'カメラアクセス', recordingAccess: '録画アクセス', audioInfo: 'ゲーム音声にマイクの許可は必要ありません。', recordingLater: 'マイクとメディアの許可は録画時だけ求めます。', grantAccess: 'カメラを許可', ready: '準備完了', waiting: '待機中', continue: '続ける', setupOverline: 'RED ZONE AR / 設定', mission: 'プロフィール設定', missionText: 'カメラ体験をカスタマイズする地域を選択してください。', chooseRegion: '地域を選択', region: '地域', home: 'ホーム', openCamera: 'カメラを開く', armory: '武器庫', store: 'ショップ', settings: '設定', camera: 'カメラ', cameraReady: 'カメラ準備完了', cameraHint: 'カメラを開いて開始します。', players: '2～10 人', teamBattle: 'チーム戦', unlockedEquipment: '解放済み装備', adSimulation: '広告シミュレーション', equipmentSettings: '装備と設定', allWeaponsUnlocked: '全武器解放済み', equipmentSelection: '装備を選択', weaponsGrenades: '武器・グレネード', demoCreditStore: 'デモクレジットショップ', onDeviceProcessing: 'カメラ処理はこの端末内で行われます。', system: 'システム', information: '情報', about: 'Red Zone AR について', developerInfo: '開発者情報', privacy: 'プライバシーポリシー', security: 'データセキュリティ', guide: 'ゲームガイド', language: '言語', sound: 'BGM', close: '閉じる', storeHeroTitle: '作戦を強化', storeBody: 'Pro クレジットに期限はありません。アップグレードが必要なときも作戦を続けられます。', creditPacks: 'PRO クレジットパック', noExpiry: '無期限・即時付与', paymentUnavailable: '支払いは利用できません', paymentUnavailableBody: 'このビルドではアプリ内購入に接続していません。請求もクレジット追加もありません。', paymentUnavailableButton: '了解', storeNote: 'シミュレーション広告で無料プレイを続けられます。広告回数は毎日リセットされます。', errorTitle: '問題が発生しました', errorMessage: '続けるにはアプリを再読み込みしてください。', tryAgain: '再試行', errorDetails: 'エラー詳細', viewErrorDetails: 'エラー詳細を表示', closeErrorDetails: 'エラー詳細を閉じる', detailAbout: 'Red Zone AR は Ephesus Medya が開発したカメラベースのアクション・武器シミュレーションゲームです。', detailDeveloper: '開発者：Halil Özsoy\n\nRed Zone AR は Ephesus Medya の独立開発です。', detailPrivacy: 'カメラ映像はアクティブなカメラセッション中だけ使用します。選択なしに録画は作成されません。位置情報を永続保存しません。', detailSecurity: '設定は端末にローカル保存されます。カメラ映像はサーバーへ送信されません。録画はあなたが管理します。', detailGuide: '1. カメラを許可します。2. カタログから装備を選びます。このシミュレーションでは全装備を利用できます。3. ジョイスティックで照準を動かし、アクションボタンで発射します。4. ナイト・サーマル表示は視覚フィルターのシミュレーションです。5. このビルドの広告はシミュレーションです。6. カメラ処理は端末内で行われます。', countryTR: 'トルコ', countryDE: 'ドイツ', countryUA: 'ウクライナ', countryUS: 'アメリカ',
  },
  ar: {
    brand: 'RED ZONE AR', developer: 'المطور: Halil Özsoy', bootSubtitle: 'لعبة من EPHESUS MEDYA', bootCaption: 'جارٍ تشغيل أنظمة الميدان', setupStep: 'إعداد الميدان / 01', permissions: 'الوصول إلى الجهاز', permissionsText: 'اسمح بالكاميرا للعب. لا نطلب صلاحية التسجيل إلا عند اختيارك التسجيل.', cameraAccess: 'الوصول إلى الكاميرا', recordingAccess: 'الوصول إلى التسجيل', audioInfo: 'لا تحتاج أصوات اللعبة إلى إذن الميكروفون.', recordingLater: 'تُطلب صلاحية الميكروفون والوسائط عند التسجيل فقط.', grantAccess: 'السماح بالكاميرا', ready: 'جاهز', waiting: 'قيد الانتظار', continue: 'متابعة', setupOverline: 'RED ZONE AR / الإعداد', mission: 'إعداد الملف الشخصي', missionText: 'اختر منطقتك لتخصيص تجربة الكاميرا.', chooseRegion: 'اختر منطقتك', region: 'منطقتك', home: 'الرئيسية', openCamera: 'فتح الكاميرا', armory: 'الترسانة', store: 'المتجر', settings: 'الإعدادات', camera: 'الكاميرا', cameraReady: 'الكاميرا جاهزة', cameraHint: 'افتح الكاميرا للبدء.', players: '2–10 لاعبين', teamBattle: 'معركة فريق', unlockedEquipment: 'المعدات المتاحة', adSimulation: 'محاكاة إعلان', equipmentSettings: 'المعدات والإعدادات', allWeaponsUnlocked: 'كل الأسلحة متاحة', equipmentSelection: 'اختيار المعدات', weaponsGrenades: 'أسلحة · قنابل', demoCreditStore: 'متجر أرصدة تجريبي', onDeviceProcessing: 'تتم معالجة الكاميرا على هذا الجهاز.', system: 'النظام', information: 'المعلومات', about: 'حول Red Zone AR', developerInfo: 'معلومات المطور', privacy: 'سياسة الخصوصية', security: 'أمان البيانات', guide: 'دليل اللعبة', language: 'اللغة', sound: 'موسيقى الخلفية', close: 'إغلاق', storeHeroTitle: 'عزّز مهمتك', storeBody: 'أرصدة Pro لا تنتهي صلاحيتها. واصل مهمتك عند الحاجة إلى ترقية.', creditPacks: 'حزم أرصدة PRO', noExpiry: 'بلا انتهاء · تسليم فوري', paymentUnavailable: 'الدفع غير متاح', paymentUnavailableBody: 'عمليات الشراء داخل التطبيق غير متصلة في هذا الإصدار. لن يتم الخصم ولن تضاف أرصدة.', paymentUnavailableButton: 'فهمت', storeNote: 'يمكنك المتابعة مجاناً عبر خيار الإعلان التجريبي. تتجدد حصص الإعلانات يومياً.', errorTitle: 'حدث خطأ ما', errorMessage: 'أعد تحميل التطبيق للمتابعة.', tryAgain: 'حاول مجدداً', errorDetails: 'تفاصيل الخطأ', viewErrorDetails: 'عرض تفاصيل الخطأ', closeErrorDetails: 'إغلاق تفاصيل الخطأ', detailAbout: 'Red Zone AR لعبة حركة ومحاكاة أسلحة تعتمد على الكاميرا، طورتها Ephesus Medya.', detailDeveloper: 'المطور: Halil Özsoy\n\nطُورت Red Zone AR بشكل مستقل تحت مظلة Ephesus Medya.', detailPrivacy: 'تُستخدم إطارات الكاميرا أثناء جلسة الكاميرا النشطة فقط. لا يُنشأ تسجيل دون اختيارك. لا يحفظ التطبيق بيانات الموقع بشكل دائم.', detailSecurity: 'تُحفظ التفضيلات محلياً على جهازك. لا تُرسل إطارات الكاميرا إلى خادمنا. أنت تتحكم في تسجيلاتك.', detailGuide: '1. اسمح بالكاميرا. 2. اختر المعدات من الكتالوج؛ كل المعدات متاحة في هذه المحاكاة. 3. حرّك التصويب بعصا التحكم واستخدم زر الإجراء للإطلاق. 4. الرؤية الليلية والحرارية محاكاة لمرشحات بصرية وليست استشعاراً حقيقياً. 5. الإعلانات في هذا الإصدار محاكاة. 6. تبقى معالجة الكاميرا على الجهاز.', countryTR: 'تركيا', countryDE: 'ألمانيا', countryUA: 'أوكرانيا', countryUS: 'الولايات المتحدة',
  },
  de: {
    brand: 'RED ZONE AR', developer: 'Entwickler: Halil Özsoy', bootSubtitle: 'EIN SPIEL VON EPHESUS MEDYA', bootCaption: 'FELDSYSTEME WERDEN INITIALISIERT', setupStep: 'FELDEINRICHTUNG / 01', permissions: 'GERÄTEZUGRIFF', permissionsText: 'Erlaube die Kamera zum Spielen. Aufnahmezugriff wird nur angefragt, wenn du aufnehmen möchtest.', cameraAccess: 'Kamerazugriff', recordingAccess: 'Aufnahmezugriff', audioInfo: 'Spielton benötigt keine Mikrofonberechtigung.', recordingLater: 'Mikrofon- und Medienzugriff werden nur für Aufnahmen angefragt.', grantAccess: 'KAMERA ERLAUBEN', ready: 'BEREIT', waiting: 'WARTEN', continue: 'WEITER', setupOverline: 'RED ZONE AR / EINRICHTUNG', mission: 'PROFIL EINRICHTEN', missionText: 'Wähle deine Region für ein persönliches Kameraerlebnis.', chooseRegion: 'REGION WÄHLEN', region: 'DEINE REGION', home: 'STARTSEITE', openCamera: 'KAMERA ÖFFNEN', armory: 'WAFFENKAMMER', store: 'SHOP', settings: 'EINSTELLUNGEN', camera: 'KAMERA', cameraReady: 'Kamera bereit', cameraHint: 'Öffne die Kamera zum Starten.', players: '2–10 SPIELER', teamBattle: 'TEAMKAMPF', unlockedEquipment: 'FREIGESCHALTETE AUSRÜSTUNG', adSimulation: 'WERBESIMULATION', equipmentSettings: 'AUSRÜSTUNG & EINSTELLUNGEN', allWeaponsUnlocked: 'ALLE WAFFEN FREIGESCHALTET', equipmentSelection: 'Ausrüstung wählen', weaponsGrenades: 'Waffen · Granaten', demoCreditStore: 'Demo-Kreditshop', onDeviceProcessing: 'Die Kameraverarbeitung bleibt auf diesem Gerät.', system: 'SYSTEM', information: 'INFORMATIONEN', about: 'Über Red Zone AR', developerInfo: 'Entwicklerinformationen', privacy: 'Datenschutz', security: 'Datensicherheit', guide: 'Spielanleitung', language: 'Sprache', sound: 'Hintergrundmusik', close: 'SCHLIESSEN', storeHeroTitle: 'DEINE OPERATION STÄRKEN', storeBody: 'Pro-Kredite laufen nicht ab. Setze deine Operation bei Bedarf mit einem Upgrade fort.', creditPacks: 'PRO-KREDITPAKETE', noExpiry: 'Unbegrenzt · sofort verfügbar', paymentUnavailable: 'Zahlung nicht verfügbar', paymentUnavailableBody: 'In-App-Käufe sind in dieser Version nicht verbunden. Es wird nichts berechnet und keine Gutschrift vergeben.', paymentUnavailableButton: 'VERSTANDEN', storeNote: 'Mit der simulierten Werbung kannst du kostenlos weiterspielen. Werberechte werden täglich zurückgesetzt.', errorTitle: 'Etwas ist schiefgelaufen', errorMessage: 'Lade die App neu, um fortzufahren.', tryAgain: 'ERNEUT VERSUCHEN', errorDetails: 'Fehlerdetails', viewErrorDetails: 'Fehlerdetails anzeigen', closeErrorDetails: 'Fehlerdetails schließen', detailAbout: 'Red Zone AR ist ein kamerabasiertes Action- und Waffensimulationsspiel von Ephesus Medya.', detailDeveloper: 'Entwickler: Halil Özsoy\n\nRed Zone AR wird unabhängig unter Ephesus Medya entwickelt.', detailPrivacy: 'Kamerabilder werden nur während einer aktiven Kamerasitzung verwendet. Ohne deine Wahl wird keine Aufnahme erstellt. Standortdaten werden nicht dauerhaft gespeichert.', detailSecurity: 'Einstellungen werden lokal auf deinem Gerät gespeichert. Kamerabilder werden nicht an unseren Server gesendet. Du behältst die Kontrolle über Aufnahmen.', detailGuide: '1. Kamera erlauben. 2. Ausrüstung aus dem Katalog wählen; in dieser Simulation ist alles verfügbar. 3. Ziel mit dem Joystick bewegen und mit der Aktionstaste feuern. 4. Nacht- und Wärmeansicht sind Filtersimulationen, keine echte Sensorik. 5. Werbung ist in dieser Version simuliert. 6. Kameraverarbeitung bleibt auf dem Gerät.', countryTR: 'Türkei', countryDE: 'Deutschland', countryUA: 'Ukraine', countryUS: 'Vereinigte Staaten',
  },
  fr: {
    brand: 'RED ZONE AR', developer: 'Développeur : Halil Özsoy', bootSubtitle: 'UN JEU EPHESUS MEDYA', bootCaption: 'INITIALISATION DES SYSTÈMES DE TERRAIN', setupStep: 'CONFIGURATION / 01', permissions: 'ACCÈS À L’APPAREIL', permissionsText: 'Autorisez la caméra pour jouer. L’accès à l’enregistrement est demandé uniquement si vous choisissez d’enregistrer.', cameraAccess: 'Accès caméra', recordingAccess: 'Accès enregistrement', audioInfo: 'L’audio du jeu ne nécessite pas l’autorisation du micro.', recordingLater: 'Le micro et les médias sont demandés uniquement pour enregistrer.', grantAccess: 'AUTORISER LA CAMÉRA', ready: 'PRÊT', waiting: 'EN ATTENTE', continue: 'CONTINUER', setupOverline: 'RED ZONE AR / CONFIGURATION', mission: 'CONFIGURER LE PROFIL', missionText: 'Choisissez votre région pour personnaliser la caméra.', chooseRegion: 'CHOISIR VOTRE RÉGION', region: 'VOTRE RÉGION', home: 'ACCUEIL', openCamera: 'OUVRIR LA CAMÉRA', armory: 'ARSENAL', store: 'BOUTIQUE', settings: 'PARAMÈTRES', camera: 'CAMÉRA', cameraReady: 'Caméra prête', cameraHint: 'Ouvrez la caméra pour commencer.', players: '2–10 JOUEURS', teamBattle: 'BATAILLE EN ÉQUIPE', unlockedEquipment: 'ÉQUIPEMENT DÉBLOQUÉ', adSimulation: 'SIMULATION PUBLICITAIRE', equipmentSettings: 'ÉQUIPEMENT ET PARAMÈTRES', allWeaponsUnlocked: 'TOUTES LES ARMES DISPONIBLES', equipmentSelection: 'Choix de l’équipement', weaponsGrenades: 'Armes · grenades', demoCreditStore: 'Boutique de crédits démo', onDeviceProcessing: 'Le traitement caméra reste sur cet appareil.', system: 'SYSTÈME', information: 'INFORMATIONS', about: 'À propos de Red Zone AR', developerInfo: 'Informations développeur', privacy: 'Politique de confidentialité', security: 'Sécurité des données', guide: 'Guide du jeu', language: 'Langue', sound: 'Musique de fond', close: 'FERMER', storeHeroTitle: 'RENFORCEZ VOTRE OPÉRATION', storeBody: 'Les crédits Pro n’expirent jamais. Continuez votre opération quand vous avez besoin d’une amélioration.', creditPacks: 'PACKS DE CRÉDITS PRO', noExpiry: 'Sans expiration · livraison instantanée', paymentUnavailable: 'Paiement indisponible', paymentUnavailableBody: 'Les achats intégrés ne sont pas connectés dans cette version. Aucun débit ni crédit ne sera effectué.', paymentUnavailableButton: 'COMPRIS', storeNote: 'Continuez gratuitement avec l’option de publicité simulée. Les droits publicitaires sont réinitialisés chaque jour.', errorTitle: 'Une erreur est survenue', errorMessage: 'Rechargez l’application pour continuer.', tryAgain: 'RÉESSAYER', errorDetails: 'Détails de l’erreur', viewErrorDetails: 'Voir les détails', closeErrorDetails: 'Fermer les détails', detailAbout: 'Red Zone AR est un jeu d’action et de simulation d’armes basé sur la caméra, développé par Ephesus Medya.', detailDeveloper: 'Développeur : Halil Özsoy\n\nRed Zone AR est développé indépendamment par Ephesus Medya.', detailPrivacy: 'Les images caméra ne sont utilisées que pendant la session active. Aucun enregistrement n’est créé sans votre choix. L’application ne conserve pas les données de localisation.', detailSecurity: 'Les préférences sont stockées localement. Les images caméra ne sont pas envoyées à notre serveur. Vous contrôlez vos enregistrements.', detailGuide: '1. Autorisez la caméra. 2. Choisissez un équipement dans le catalogue ; tout est disponible dans cette simulation. 3. Déplacez le viseur avec le joystick et tirez avec le bouton d’action. 4. Les vues nocturne et thermique sont des filtres simulés. 5. Les publicités sont simulées dans cette version. 6. Le traitement reste sur l’appareil.', countryTR: 'Turquie', countryDE: 'Allemagne', countryUA: 'Ukraine', countryUS: 'États-Unis',
  },
  es: {
    brand: 'RED ZONE AR', developer: 'Desarrollador: Halil Özsoy', bootSubtitle: 'UN JUEGO DE EPHESUS MEDYA', bootCaption: 'INICIANDO SISTEMAS DE CAMPO', setupStep: 'CONFIGURACIÓN / 01', permissions: 'ACCESO AL DISPOSITIVO', permissionsText: 'Permite la cámara para jugar. El acceso de grabación solo se solicita cuando eliges grabar.', cameraAccess: 'Acceso a la cámara', recordingAccess: 'Acceso de grabación', audioInfo: 'El audio del juego no necesita permiso del micrófono.', recordingLater: 'El micrófono y los medios solo se solicitan para grabar.', grantAccess: 'PERMITIR CÁMARA', ready: 'LISTO', waiting: 'ESPERANDO', continue: 'CONTINUAR', setupOverline: 'RED ZONE AR / CONFIGURACIÓN', mission: 'CONFIGURAR PERFIL', missionText: 'Elige tu región para personalizar la experiencia de cámara.', chooseRegion: 'ELIGE TU REGIÓN', region: 'TU REGIÓN', home: 'INICIO', openCamera: 'ABRIR CÁMARA', armory: 'ARSENAL', store: 'TIENDA', settings: 'AJUSTES', camera: 'CÁMARA', cameraReady: 'Cámara lista', cameraHint: 'Abre la cámara para comenzar.', players: '2–10 JUGADORES', teamBattle: 'BATALLA DE EQUIPOS', unlockedEquipment: 'EQUIPO DESBLOQUEADO', adSimulation: 'SIMULACIÓN DE ANUNCIO', equipmentSettings: 'EQUIPO Y AJUSTES', allWeaponsUnlocked: 'TODAS LAS ARMAS DESBLOQUEADAS', equipmentSelection: 'Elegir equipo', weaponsGrenades: 'Armas · granadas', demoCreditStore: 'Tienda de créditos de demostración', onDeviceProcessing: 'El procesamiento de cámara permanece en este dispositivo.', system: 'SISTEMA', information: 'INFORMACIÓN', about: 'Acerca de Red Zone AR', developerInfo: 'Información del desarrollador', privacy: 'Política de privacidad', security: 'Seguridad de datos', guide: 'Guía del juego', language: 'Idioma', sound: 'Música de fondo', close: 'CERRAR', storeHeroTitle: 'POTENCIA TU OPERACIÓN', storeBody: 'Los créditos Pro no caducan. Continúa tu operación cuando necesites una mejora.', creditPacks: 'PAQUETES DE CRÉDITOS PRO', noExpiry: 'Sin caducidad · entrega inmediata', paymentUnavailable: 'Pagos no disponibles', paymentUnavailableBody: 'Las compras dentro de la app no están conectadas en esta versión. No se cobrará ni se añadirán créditos.', paymentUnavailableButton: 'ENTENDIDO', storeNote: 'Puedes continuar gratis con la opción de anuncio simulado. Los usos de anuncios se reinician a diario.', errorTitle: 'Algo salió mal', errorMessage: 'Recarga la aplicación para continuar.', tryAgain: 'REINTENTAR', errorDetails: 'Detalles del error', viewErrorDetails: 'Ver detalles del error', closeErrorDetails: 'Cerrar detalles del error', detailAbout: 'Red Zone AR es un juego de acción y simulación de armas basado en cámara, desarrollado por Ephesus Medya.', detailDeveloper: 'Desarrollador: Halil Özsoy\n\nRed Zone AR se desarrolla de forma independiente bajo Ephesus Medya.', detailPrivacy: 'Las imágenes de cámara solo se usan durante la sesión activa. No se crea una grabación sin tu elección. La app no guarda datos de ubicación permanentemente.', detailSecurity: 'Las preferencias se guardan localmente. Las imágenes no se envían a nuestro servidor. Tú controlas tus grabaciones.', detailGuide: '1. Permite la cámara. 2. Elige equipo del catálogo; todo está disponible en esta simulación. 3. Mueve la mira con el joystick y dispara con el botón de acción. 4. Las vistas nocturna y térmica son filtros simulados, no sensores reales. 5. Los anuncios de esta versión son simulados. 6. El procesamiento queda en el dispositivo.', countryTR: 'Turquía', countryDE: 'Alemania', countryUA: 'Ucrania', countryUS: 'Estados Unidos',
  },
  it: {
    brand: 'RED ZONE AR', developer: 'Sviluppatore: Halil Özsoy', bootSubtitle: 'UN GIOCO EPHESUS MEDYA', bootCaption: 'INIZIALIZZAZIONE DEI SISTEMI', setupStep: 'CONFIGURAZIONE / 01', permissions: 'ACCESSO AL DISPOSITIVO', permissionsText: 'Consenti la fotocamera per giocare. L’accesso alla registrazione viene richiesto solo quando scegli di registrare.', cameraAccess: 'Accesso alla fotocamera', recordingAccess: 'Accesso alla registrazione', audioInfo: 'L’audio del gioco non richiede il permesso del microfono.', recordingLater: 'Microfono e media vengono richiesti solo per la registrazione.', grantAccess: 'CONSENTI FOTOCAMERA', ready: 'PRONTO', waiting: 'IN ATTESA', continue: 'CONTINUA', setupOverline: 'RED ZONE AR / CONFIGURAZIONE', mission: 'CONFIGURA PROFILO', missionText: 'Scegli la tua regione per personalizzare l’esperienza fotocamera.', chooseRegion: 'SCEGLI LA REGIONE', region: 'LA TUA REGIONE', home: 'HOME', openCamera: 'APRI FOTOCAMERA', armory: 'ARSENALE', store: 'NEGOZIO', settings: 'IMPOSTAZIONI', camera: 'FOTOCAMERA', cameraReady: 'Fotocamera pronta', cameraHint: 'Apri la fotocamera per iniziare.', players: '2–10 GIOCATORI', teamBattle: 'BATTAGLIA A SQUADRE', unlockedEquipment: 'EQUIPAGGIAMENTO SBLOCCATO', adSimulation: 'SIMULAZIONE PUBBLICITÀ', equipmentSettings: 'EQUIPAGGIAMENTO E IMPOSTAZIONI', allWeaponsUnlocked: 'TUTTE LE ARMI SBLOCCATE', equipmentSelection: 'Scelta equipaggiamento', weaponsGrenades: 'Armi · granate', demoCreditStore: 'Negozio crediti demo', onDeviceProcessing: 'L’elaborazione della fotocamera resta su questo dispositivo.', system: 'SISTEMA', information: 'INFORMAZIONI', about: 'Informazioni su Red Zone AR', developerInfo: 'Informazioni sviluppatore', privacy: 'Informativa sulla privacy', security: 'Sicurezza dei dati', guide: 'Guida del gioco', language: 'Lingua', sound: 'Musica di sottofondo', close: 'CHIUDI', storeHeroTitle: 'POTENZIA LA TUA OPERAZIONE', storeBody: 'I crediti Pro non scadono. Continua l’operazione quando ti serve un miglioramento.', creditPacks: 'PACCHETTI CREDITI PRO', noExpiry: 'Senza scadenza · consegna immediata', paymentUnavailable: 'Pagamenti non disponibili', paymentUnavailableBody: 'Gli acquisti in-app non sono collegati in questa versione. Nessun addebito e nessun credito aggiunto.', paymentUnavailableButton: 'HO CAPITO', storeNote: 'Puoi continuare gratis con l’opzione pubblicitaria simulata. Le possibilità pubblicitarie si azzerano ogni giorno.', errorTitle: 'Qualcosa è andato storto', errorMessage: 'Ricarica l’app per continuare.', tryAgain: 'RIPROVA', errorDetails: 'Dettagli errore', viewErrorDetails: 'Mostra dettagli errore', closeErrorDetails: 'Chiudi dettagli errore', detailAbout: 'Red Zone AR è un gioco d’azione e simulazione di armi basato sulla fotocamera, sviluppato da Ephesus Medya.', detailDeveloper: 'Sviluppatore: Halil Özsoy\n\nRed Zone AR è sviluppato indipendentemente da Ephesus Medya.', detailPrivacy: 'Le immagini della fotocamera sono usate solo durante la sessione attiva. Non viene creata alcuna registrazione senza la tua scelta. L’app non conserva la posizione.', detailSecurity: 'Le preferenze sono salvate sul dispositivo. Le immagini non vengono inviate al server. Controlli tu le registrazioni.', detailGuide: '1. Consenti la fotocamera. 2. Scegli l’equipaggiamento dal catalogo; tutto è disponibile in questa simulazione. 3. Muovi il mirino con il joystick e spara con il pulsante azione. 4. Le viste notturna e termica sono filtri simulati. 5. Gli annunci sono simulati in questa versione. 6. L’elaborazione resta sul dispositivo.', countryTR: 'Turchia', countryDE: 'Germania', countryUA: 'Ucraina', countryUS: 'Stati Uniti',
  },
  pt: {
    brand: 'RED ZONE AR', developer: 'Desenvolvedor: Halil Özsoy', bootSubtitle: 'UM JOGO EPHESUS MEDYA', bootCaption: 'INICIANDO SISTEMAS DE CAMPO', setupStep: 'CONFIGURAÇÃO / 01', permissions: 'ACESSO AO DISPOSITIVO', permissionsText: 'Permita a câmera para jogar. O acesso à gravação só é solicitado quando você escolhe gravar.', cameraAccess: 'Acesso à câmera', recordingAccess: 'Acesso à gravação', audioInfo: 'O áudio do jogo não precisa de permissão do microfone.', recordingLater: 'Microfone e mídia só são solicitados para gravação.', grantAccess: 'PERMITIR CÂMERA', ready: 'PRONTO', waiting: 'AGUARDANDO', continue: 'CONTINUAR', setupOverline: 'RED ZONE AR / CONFIGURAÇÃO', mission: 'CONFIGURAÇÃO DO PERFIL', missionText: 'Escolha sua região para personalizar a experiência da câmera.', chooseRegion: 'ESCOLHA SUA REGIÃO', region: 'SUA REGIÃO', home: 'INÍCIO', openCamera: 'ABRIR CÂMERA', armory: 'ARSENAL', store: 'LOJA', settings: 'CONFIGURAÇÕES', camera: 'CÂMERA', cameraReady: 'Câmera pronta', cameraHint: 'Abra a câmera para começar.', players: '2–10 JOGADORES', teamBattle: 'BATALHA EM EQUIPE', unlockedEquipment: 'EQUIPAMENTO DESBLOQUEADO', adSimulation: 'SIMULAÇÃO DE ANÚNCIO', equipmentSettings: 'EQUIPAMENTO E CONFIGURAÇÕES', allWeaponsUnlocked: 'TODAS AS ARMAS DESBLOQUEADAS', equipmentSelection: 'Escolha de equipamento', weaponsGrenades: 'Armas · granadas', demoCreditStore: 'Loja de créditos de demonstração', onDeviceProcessing: 'O processamento da câmera permanece neste dispositivo.', system: 'SISTEMA', information: 'INFORMAÇÕES', about: 'Sobre o Red Zone AR', developerInfo: 'Informações do desenvolvedor', privacy: 'Política de privacidade', security: 'Segurança de dados', guide: 'Guia do jogo', language: 'Idioma', sound: 'Música de fundo', close: 'FECHAR', storeHeroTitle: 'FORTALEÇA SUA OPERAÇÃO', storeBody: 'Os créditos Pro não expiram. Continue a operação quando precisar de um upgrade.', creditPacks: 'PACOTES DE CRÉDITOS PRO', noExpiry: 'Sem expiração · entrega imediata', paymentUnavailable: 'Pagamentos indisponíveis', paymentUnavailableBody: 'As compras no app não estão conectadas nesta versão. Nada será cobrado nem adicionado.', paymentUnavailableButton: 'ENTENDI', storeNote: 'Continue gratuitamente com a opção de anúncio simulado. As cotas de anúncios são reiniciadas diariamente.', errorTitle: 'Algo deu errado', errorMessage: 'Recarregue o app para continuar.', tryAgain: 'TENTAR NOVAMENTE', errorDetails: 'Detalhes do erro', viewErrorDetails: 'Ver detalhes do erro', closeErrorDetails: 'Fechar detalhes do erro', detailAbout: 'Red Zone AR é um jogo de ação e simulação de armas baseado em câmera, desenvolvido pela Ephesus Medya.', detailDeveloper: 'Desenvolvedor: Halil Özsoy\n\nRed Zone AR é desenvolvido de forma independente pela Ephesus Medya.', detailPrivacy: 'As imagens da câmera são usadas apenas durante a sessão ativa. Nenhuma gravação é criada sem sua escolha. O app não armazena localização permanentemente.', detailSecurity: 'As preferências ficam armazenadas localmente. As imagens não são enviadas ao servidor. Você controla suas gravações.', detailGuide: '1. Permita a câmera. 2. Escolha o equipamento no catálogo; tudo está disponível nesta simulação. 3. Mova a mira com o joystick e atire com o botão de ação. 4. As visões noturna e térmica são filtros simulados. 5. Os anúncios desta versão são simulados. 6. O processamento fica no dispositivo.', countryTR: 'Turquia', countryDE: 'Alemanha', countryUA: 'Ucrânia', countryUS: 'Estados Unidos',
  },
  ru: {
    brand: 'RED ZONE AR', developer: 'Разработчик: Halil Özsoy', bootSubtitle: 'ИГРА EPHESUS MEDYA', bootCaption: 'ЗАПУСК ПОЛЕВЫХ СИСТЕМ', setupStep: 'НАСТРОЙКА ПОЛЯ / 01', permissions: 'ДОСТУП К УСТРОЙСТВУ', permissionsText: 'Разрешите камеру для игры. Доступ к записи запрашивается только при выборе записи.', cameraAccess: 'Доступ к камере', recordingAccess: 'Доступ к записи', audioInfo: 'Игровому звуку не нужен доступ к микрофону.', recordingLater: 'Доступ к микрофону и медиа запрашивается только для записи.', grantAccess: 'РАЗРЕШИТЬ КАМЕРУ', ready: 'ГОТОВО', waiting: 'ОЖИДАНИЕ', continue: 'ПРОДОЛЖИТЬ', setupOverline: 'RED ZONE AR / НАСТРОЙКА', mission: 'НАСТРОЙКА ПРОФИЛЯ', missionText: 'Выберите регион, чтобы настроить работу камеры.', chooseRegion: 'ВЫБЕРИТЕ РЕГИОН', region: 'ВАШ РЕГИОН', home: 'ГЛАВНАЯ', openCamera: 'ОТКРЫТЬ КАМЕРУ', armory: 'АРСЕНАЛ', store: 'МАГАЗИН', settings: 'НАСТРОЙКИ', camera: 'КАМЕРА', cameraReady: 'Камера готова', cameraHint: 'Откройте камеру, чтобы начать.', players: '2–10 ИГРОКОВ', teamBattle: 'КОМАНДНЫЙ БОЙ', unlockedEquipment: 'ОТКРЫТОЕ СНАРЯЖЕНИЕ', adSimulation: 'СИМУЛЯЦИЯ РЕКЛАМЫ', equipmentSettings: 'СНАРЯЖЕНИЕ И НАСТРОЙКИ', allWeaponsUnlocked: 'ВСЕ ОРУЖИЕ ОТКРЫТО', equipmentSelection: 'Выбор снаряжения', weaponsGrenades: 'Оружие · гранаты', demoCreditStore: 'Демонстрационный магазин кредитов', onDeviceProcessing: 'Обработка камеры остаётся на этом устройстве.', system: 'СИСТЕМА', information: 'ИНФОРМАЦИЯ', about: 'О Red Zone AR', developerInfo: 'Информация о разработчике', privacy: 'Политика конфиденциальности', security: 'Безопасность данных', guide: 'Руководство игры', language: 'Язык', sound: 'Фоновая музыка', close: 'ЗАКРЫТЬ', storeHeroTitle: 'УСИЛЬТЕ ОПЕРАЦИЮ', storeBody: 'Срок действия Pro-кредитов не истекает. Продолжайте операцию при необходимости улучшения.', creditPacks: 'ПАКЕТЫ PRO-КРЕДИТОВ', noExpiry: 'Без срока · мгновенная выдача', paymentUnavailable: 'Платежи недоступны', paymentUnavailableBody: 'Покупки в приложении не подключены в этой версии. Деньги не списываются и кредиты не добавляются.', paymentUnavailableButton: 'ПОНЯТНО', storeNote: 'Можно бесплатно продолжить с симуляцией рекламы. Рекламные попытки сбрасываются ежедневно.', errorTitle: 'Что-то пошло не так', errorMessage: 'Перезагрузите приложение, чтобы продолжить.', tryAgain: 'ПОВТОРИТЬ', errorDetails: 'Подробности ошибки', viewErrorDetails: 'Показать подробности', closeErrorDetails: 'Закрыть подробности', detailAbout: 'Red Zone AR — экшен и симулятор оружия с камерой от Ephesus Medya.', detailDeveloper: 'Разработчик: Halil Özsoy\n\nRed Zone AR независимо создаётся в Ephesus Medya.', detailPrivacy: 'Кадры камеры используются только во время активной сессии. Запись не создаётся без вашего выбора. Геоданные не хранятся постоянно.', detailSecurity: 'Настройки хранятся локально. Кадры камеры не отправляются на сервер. Записи контролируете вы.', detailGuide: '1. Разрешите камеру. 2. Выберите снаряжение в каталоге; в симуляции доступно всё. 3. Двигайте прицел джойстиком и стреляйте кнопкой действия. 4. Ночное и тепловое зрение — фильтры, а не реальные датчики. 5. Реклама в этой версии симулируется. 6. Обработка камеры остаётся на устройстве.', countryTR: 'Турция', countryDE: 'Германия', countryUA: 'Украина', countryUS: 'США',
  },
  uk: {
    brand: 'RED ZONE AR', developer: 'Розробник: Halil Özsoy', bootSubtitle: 'ГРА EPHESUS MEDYA', bootCaption: 'ЗАПУСК ПОЛЬОВИХ СИСТЕМ', setupStep: 'НАЛАШТУВАННЯ ПОЛЯ / 01', permissions: 'ДОСТУП ДО ПРИСТРОЮ', permissionsText: 'Дозвольте камеру для гри. Доступ до запису запитується лише після вашого вибору.', cameraAccess: 'Доступ до камери', recordingAccess: 'Доступ до запису', audioInfo: 'Ігровий звук не потребує дозволу мікрофона.', recordingLater: 'Доступ до мікрофона й медіа запитується лише для запису.', grantAccess: 'ДОЗВОЛИТИ КАМЕРУ', ready: 'ГОТОВО', waiting: 'ОЧІКУВАННЯ', continue: 'ПРОДОВЖИТИ', setupOverline: 'RED ZONE AR / НАЛАШТУВАННЯ', mission: 'НАЛАШТУВАННЯ ПРОФІЛЮ', missionText: 'Оберіть регіон, щоб налаштувати роботу камери.', chooseRegion: 'ОБЕРІТЬ РЕГІОН', region: 'ТВІЙ РЕГІОН', home: 'ГОЛОВНА', openCamera: 'ВІДКРИТИ КАМЕРУ', armory: 'АРСЕНАЛ', store: 'МАГАЗИН', settings: 'НАЛАШТУВАННЯ', camera: 'КАМЕРА', cameraReady: 'Камера готова', cameraHint: 'Відкрийте камеру, щоб почати.', players: '2–10 ГРАВЦІВ', teamBattle: 'КОМАНДНИЙ БІЙ', unlockedEquipment: 'ВІДКРИТЕ СПОРЯДЖЕННЯ', adSimulation: 'СИМУЛЯЦІЯ РЕКЛАМИ', equipmentSettings: 'СПОРЯДЖЕННЯ І НАЛАШТУВАННЯ', allWeaponsUnlocked: 'УСЯ ЗБРОЯ ВІДКРИТА', equipmentSelection: 'Вибір спорядження', weaponsGrenades: 'Зброя · гранати', demoCreditStore: 'Демонстраційний магазин кредитів', onDeviceProcessing: 'Обробка камери залишається на цьому пристрої.', system: 'СИСТЕМА', information: 'ІНФОРМАЦІЯ', about: 'Про Red Zone AR', developerInfo: 'Інформація про розробника', privacy: 'Політика конфіденційності', security: 'Безпека даних', guide: 'Посібник гри', language: 'Мова', sound: 'Фонова музика', close: 'ЗАКРИТИ', storeHeroTitle: 'ПОСИЛЬ СВОЮ ОПЕРАЦІЮ', storeBody: 'Термін дії Pro-кредитів не спливає. Продовжуйте операцію, коли потрібне покращення.', creditPacks: 'ПАКЕТИ PRO-КРЕДИТІВ', noExpiry: 'Без терміну · миттєва видача', paymentUnavailable: 'Оплата недоступна', paymentUnavailableBody: 'Вбудовані покупки не підключені в цій версії. Кошти не списуються й кредити не додаються.', paymentUnavailableButton: 'ЗРОЗУМІЛО', storeNote: 'Можна безкоштовно продовжити із симуляцією реклами. Рекламні спроби скидаються щодня.', errorTitle: 'Щось пішло не так', errorMessage: 'Перезавантажте застосунок, щоб продовжити.', tryAgain: 'ПОВТОРИТИ', errorDetails: 'Деталі помилки', viewErrorDetails: 'Показати деталі', closeErrorDetails: 'Закрити деталі', detailAbout: 'Red Zone AR — екшн і симулятор зброї з камерою від Ephesus Medya.', detailDeveloper: 'Розробник: Halil Özsoy\n\nRed Zone AR незалежно розробляється в Ephesus Medya.', detailPrivacy: 'Кадри камери використовуються лише під час активної сесії. Запис не створюється без вашого вибору. Дані про місцезнаходження не зберігаються постійно.', detailSecurity: 'Налаштування зберігаються локально. Кадри камери не надсилаються на сервер. Записи контролюєте ви.', detailGuide: '1. Дозвольте камеру. 2. Оберіть спорядження в каталозі; у симуляції доступне все. 3. Рухайте прицілом джойстиком і стріляйте кнопкою дії. 4. Нічний і тепловий режими — фільтри, а не справжні датчики. 5. Реклама в цій версії симулюється. 6. Обробка камери залишається на пристрої.', countryTR: 'Туреччина', countryDE: 'Німеччина', countryUA: 'Україна', countryUS: 'США',
  },
  hi: {
    brand: 'RED ZONE AR', developer: 'डेवलपर: Halil Özsoy', bootSubtitle: 'EPHESUS MEDYA का गेम', bootCaption: 'फील्ड सिस्टम शुरू हो रहे हैं', setupStep: 'फील्ड सेटअप / 01', permissions: 'डिवाइस एक्सेस', permissionsText: 'खेलने के लिए कैमरा अनुमति दें। रिकॉर्डिंग एक्सेस केवल रिकॉर्ड चुनने पर माँगा जाएगा।', cameraAccess: 'कैमरा एक्सेस', recordingAccess: 'रिकॉर्डिंग एक्सेस', audioInfo: 'गेम ऑडियो के लिए माइक्रोफ़ोन अनुमति की ज़रूरत नहीं है।', recordingLater: 'माइक्रोफ़ोन और मीडिया एक्सेस केवल रिकॉर्डिंग के लिए माँगा जाएगा।', grantAccess: 'कैमरा अनुमति दें', ready: 'तैयार', waiting: 'प्रतीक्षा', continue: 'जारी रखें', setupOverline: 'RED ZONE AR / सेटअप', mission: 'प्रोफ़ाइल सेटअप', missionText: 'कैमरा अनुभव को अपने अनुसार बनाने के लिए क्षेत्र चुनें।', chooseRegion: 'अपना क्षेत्र चुनें', region: 'आपका क्षेत्र', home: 'होम', openCamera: 'कैमरा खोलें', armory: 'शस्त्रागार', store: 'स्टोर', settings: 'सेटिंग', camera: 'कैमरा', cameraReady: 'कैमरा तैयार', cameraHint: 'शुरू करने के लिए कैमरा खोलें।', players: '2–10 खिलाड़ी', teamBattle: 'टीम लड़ाई', unlockedEquipment: 'अनलॉक उपकरण', adSimulation: 'विज्ञापन सिमुलेशन', equipmentSettings: 'उपकरण और सेटिंग', allWeaponsUnlocked: 'सभी हथियार अनलॉक', equipmentSelection: 'उपकरण चुनें', weaponsGrenades: 'हथियार · ग्रेनेड', demoCreditStore: 'डेमो क्रेडिट स्टोर', onDeviceProcessing: 'कैमरा प्रोसेसिंग इसी डिवाइस पर रहती है।', system: 'सिस्टम', information: 'जानकारी', about: 'Red Zone AR के बारे में', developerInfo: 'डेवलपर जानकारी', privacy: 'गोपनीयता नीति', security: 'डेटा सुरक्षा', guide: 'गेम गाइड', language: 'भाषा', sound: 'बैकग्राउंड संगीत', close: 'बंद करें', storeHeroTitle: 'अपना ऑपरेशन मजबूत करें', storeBody: 'Pro क्रेडिट कभी समाप्त नहीं होते। अपग्रेड की ज़रूरत पर ऑपरेशन जारी रखें।', creditPacks: 'PRO क्रेडिट पैक', noExpiry: 'कोई समाप्ति नहीं · तुरंत डिलीवरी', paymentUnavailable: 'भुगतान उपलब्ध नहीं', paymentUnavailableBody: 'इस बिल्ड में इन-ऐप खरीदारी जुड़ी नहीं है। कोई शुल्क नहीं लिया जाएगा और क्रेडिट नहीं जोड़े जाएंगे।', paymentUnavailableButton: 'समझ गया', storeNote: 'सिम्युलेटेड विज्ञापन विकल्प से मुफ़्त में जारी रखें। विज्ञापन अवसर रोज़ रीसेट होते हैं।', errorTitle: 'कुछ गलत हो गया', errorMessage: 'जारी रखने के लिए ऐप फिर लोड करें।', tryAgain: 'फिर कोशिश करें', errorDetails: 'त्रुटि विवरण', viewErrorDetails: 'त्रुटि विवरण देखें', closeErrorDetails: 'त्रुटि विवरण बंद करें', detailAbout: 'Red Zone AR Ephesus Medya द्वारा बनाया गया कैमरा-आधारित एक्शन और हथियार सिमुलेशन गेम है।', detailDeveloper: 'डेवलपर: Halil Özsoy\n\nRed Zone AR को Ephesus Medya के तहत स्वतंत्र रूप से बनाया गया है।', detailPrivacy: 'कैमरा फ़्रेम केवल सक्रिय कैमरा सत्र में उपयोग होते हैं। आपकी पसंद के बिना रिकॉर्डिंग नहीं बनती। ऐप लोकेशन डेटा स्थायी रूप से नहीं रखता।', detailSecurity: 'पसंद डिवाइस पर स्थानीय रूप से रखी जाती हैं। कैमरा फ़्रेम सर्वर पर नहीं भेजे जाते। रिकॉर्डिंग आपके नियंत्रण में हैं।', detailGuide: '1. कैमरा अनुमति दें। 2. कैटलॉग से उपकरण चुनें; इस सिमुलेशन में सब उपलब्ध है। 3. जॉयस्टिक से निशाना घुमाएँ और एक्शन बटन से फ़ायर करें। 4. नाइट और थर्मल दृश्य फ़िल्टर सिमुलेशन हैं, असली सेंसर नहीं। 5. इस बिल्ड के विज्ञापन सिमुलेशन हैं। 6. कैमरा प्रोसेसिंग डिवाइस पर रहती है।', countryTR: 'तुर्की', countryDE: 'जर्मनी', countryUA: 'यूक्रेन', countryUS: 'संयुक्त राज्य',
  },
  ur: {
    brand: 'RED ZONE AR', developer: 'ڈیولپر: Halil Özsoy', bootSubtitle: 'EPHESUS MEDYA کا کھیل', bootCaption: 'فیلڈ سسٹم شروع ہو رہے ہیں', setupStep: 'فیلڈ سیٹ اپ / 01', permissions: 'ڈیوائس تک رسائی', permissionsText: 'کھیلنے کے لیے کیمرے کی اجازت دیں۔ ریکارڈنگ کی اجازت صرف ریکارڈ منتخب کرنے پر مانگی جائے گی۔', cameraAccess: 'کیمرے تک رسائی', recordingAccess: 'ریکارڈنگ تک رسائی', audioInfo: 'گیم آڈیو کے لیے مائیکروفون کی اجازت درکار نہیں۔', recordingLater: 'مائیکروفون اور میڈیا کی اجازت صرف ریکارڈنگ کے لیے مانگی جائے گی۔', grantAccess: 'کیمرے کی اجازت دیں', ready: 'تیار', waiting: 'انتظار', continue: 'جاری رکھیں', setupOverline: 'RED ZONE AR / سیٹ اپ', mission: 'پروفائل سیٹ اپ', missionText: 'کیمرے کے تجربے کو ذاتی بنانے کے لیے اپنا خطہ منتخب کریں۔', chooseRegion: 'اپنا خطہ منتخب کریں', region: 'آپ کا خطہ', home: 'ہوم', openCamera: 'کیمرہ کھولیں', armory: 'اسلحہ خانہ', store: 'اسٹور', settings: 'ترتیبات', camera: 'کیمرہ', cameraReady: 'کیمرہ تیار ہے', cameraHint: 'شروع کرنے کے لیے کیمرہ کھولیں۔', players: '2–10 کھلاڑی', teamBattle: 'ٹیم جنگ', unlockedEquipment: 'کھلا سامان', adSimulation: 'اشتہار کی نقل', equipmentSettings: 'سامان اور ترتیبات', allWeaponsUnlocked: 'تمام ہتھیار کھلے ہیں', equipmentSelection: 'سامان کا انتخاب', weaponsGrenades: 'ہتھیار · گرینیڈ', demoCreditStore: 'ڈیمو کریڈٹ اسٹور', onDeviceProcessing: 'کیمرے کی پروسیسنگ اسی ڈیوائس پر رہتی ہے۔', system: 'سسٹم', information: 'معلومات', about: 'Red Zone AR کے بارے میں', developerInfo: 'ڈیولپر کی معلومات', privacy: 'رازداری کی پالیسی', security: 'ڈیٹا سیکیورٹی', guide: 'گیم گائیڈ', language: 'زبان', sound: 'پس منظر کی موسیقی', close: 'بند کریں', storeHeroTitle: 'اپنی کارروائی کو طاقت دیں', storeBody: 'Pro کریڈٹس کبھی ختم نہیں ہوتے۔ اپ گریڈ درکار ہو تو کارروائی جاری رکھیں۔', creditPacks: 'PRO کریڈٹ پیک', noExpiry: 'میعاد نہیں · فوری ترسیل', paymentUnavailable: 'ادائیگی دستیاب نہیں', paymentUnavailableBody: 'اس بلڈ میں ایپ کے اندر خریداری منسلک نہیں۔ کوئی رقم نہیں لی جائے گی اور کریڈٹ نہیں ملیں گے۔', paymentUnavailableButton: 'سمجھ گیا', storeNote: 'نقلی اشتہار کے اختیار سے مفت جاری رکھیں۔ اشتہاری مواقع روزانہ ری سیٹ ہوتے ہیں۔', errorTitle: 'کچھ غلط ہو گیا', errorMessage: 'جاری رکھنے کے لیے ایپ دوبارہ لوڈ کریں۔', tryAgain: 'دوبارہ کوشش', errorDetails: 'خرابی کی تفصیل', viewErrorDetails: 'خرابی کی تفصیل دیکھیں', closeErrorDetails: 'خرابی کی تفصیل بند کریں', detailAbout: 'Red Zone AR کیمرہ پر مبنی ایکشن اور ہتھیاروں کا سمیولیشن گیم ہے جسے Ephesus Medya نے بنایا ہے۔', detailDeveloper: 'ڈیولپر: Halil Özsoy\n\nRed Zone AR کو Ephesus Medya کے تحت آزادانہ طور پر تیار کیا گیا ہے۔', detailPrivacy: 'کیمرہ فریم صرف فعال کیمرہ سیشن میں استعمال ہوتے ہیں۔ آپ کے انتخاب کے بغیر ریکارڈنگ نہیں بنتی۔ ایپ مقام کا ڈیٹا مستقل محفوظ نہیں کرتی۔', detailSecurity: 'ترجیحات ڈیوائس پر مقامی طور پر محفوظ ہیں۔ کیمرہ فریم سرور کو نہیں بھیجے جاتے۔ ریکارڈنگ آپ کے اختیار میں ہیں۔', detailGuide: '1. کیمرے کی اجازت دیں۔ 2. کیٹلاگ سے سامان منتخب کریں؛ اس سمیولیشن میں سب دستیاب ہے۔ 3. جوائے اسٹک سے نشانہ حرکت دیں اور ایکشن بٹن سے فائر کریں۔ 4. نائٹ اور تھرمل نظارے بصری فلٹر سمیولیشن ہیں، حقیقی سینسر نہیں۔ 5. اس بلڈ کے اشتہارات سمیولیشن ہیں۔ 6. کیمرہ پروسیسنگ ڈیوائس پر رہتی ہے۔', countryTR: 'ترکی', countryDE: 'جرمنی', countryUA: 'یوکرین', countryUS: 'ریاستہائے متحدہ',
  },
  bn: {
    brand: 'RED ZONE AR', developer: 'ডেভেলপার: Halil Özsoy', bootSubtitle: 'EPHESUS MEDYA-এর গেম', bootCaption: 'ফিল্ড সিস্টেম চালু হচ্ছে', setupStep: 'ফিল্ড সেটআপ / ০১', permissions: 'ডিভাইস অ্যাক্সেস', permissionsText: 'খেলার জন্য ক্যামেরা অনুমতি দিন। রেকর্ড বেছে নিলেই কেবল রেকর্ডিং অ্যাক্সেস চাওয়া হবে।', cameraAccess: 'ক্যামেরা অ্যাক্সেস', recordingAccess: 'রেকর্ডিং অ্যাক্সেস', audioInfo: 'গেমের অডিওর জন্য মাইক্রোফোন অনুমতি লাগে না।', recordingLater: 'মাইক্রোফোন ও মিডিয়া অ্যাক্সেস শুধু রেকর্ডিংয়ের জন্য চাওয়া হবে।', grantAccess: 'ক্যামেরা অনুমতি দিন', ready: 'প্রস্তুত', waiting: 'অপেক্ষমাণ', continue: 'চালিয়ে যান', setupOverline: 'RED ZONE AR / সেটআপ', mission: 'প্রোফাইল সেটআপ', missionText: 'ক্যামেরা অভিজ্ঞতা ব্যক্তিগত করতে আপনার অঞ্চল বেছে নিন।', chooseRegion: 'আপনার অঞ্চল বেছে নিন', region: 'আপনার অঞ্চল', home: 'হোম', openCamera: 'ক্যামেরা খুলুন', armory: 'অস্ত্রাগার', store: 'স্টোর', settings: 'সেটিংস', camera: 'ক্যামেরা', cameraReady: 'ক্যামেরা প্রস্তুত', cameraHint: 'শুরু করতে ক্যামেরা খুলুন।', players: '২–১০ জন খেলোয়াড়', teamBattle: 'দলীয় যুদ্ধ', unlockedEquipment: 'আনলক করা সরঞ্জাম', adSimulation: 'বিজ্ঞাপন সিমুলেশন', equipmentSettings: 'সরঞ্জাম ও সেটিংস', allWeaponsUnlocked: 'সব অস্ত্র আনলক', equipmentSelection: 'সরঞ্জাম নির্বাচন', weaponsGrenades: 'অস্ত্র · গ্রেনেড', demoCreditStore: 'ডেমো ক্রেডিট স্টোর', onDeviceProcessing: 'ক্যামেরা প্রক্রিয়াকরণ এই ডিভাইসেই থাকে।', system: 'সিস্টেম', information: 'তথ্য', about: 'Red Zone AR সম্পর্কে', developerInfo: 'ডেভেলপার তথ্য', privacy: 'গোপনীয়তা নীতি', security: 'ডেটা নিরাপত্তা', guide: 'গেম গাইড', language: 'ভাষা', sound: 'ব্যাকগ্রাউন্ড মিউজিক', close: 'বন্ধ করুন', storeHeroTitle: 'আপনার অভিযান শক্তিশালী করুন', storeBody: 'Pro ক্রেডিটের মেয়াদ শেষ হয় না। আপগ্রেড দরকার হলে অভিযান চালিয়ে যান।', creditPacks: 'PRO ক্রেডিট প্যাক', noExpiry: 'মেয়াদ নেই · তাৎক্ষণিক সরবরাহ', paymentUnavailable: 'পেমেন্ট উপলব্ধ নয়', paymentUnavailableBody: 'এই বিল্ডে ইন-অ্যাপ কেনাকাটা সংযুক্ত নয়। কোনো টাকা কাটা হবে না, ক্রেডিটও যোগ হবে না।', paymentUnavailableButton: 'বুঝেছি', storeNote: 'সিমুলেটেড বিজ্ঞাপন দিয়ে বিনামূল্যে চালিয়ে যান। বিজ্ঞাপনের সুযোগ প্রতিদিন রিসেট হয়।', errorTitle: 'কিছু ভুল হয়েছে', errorMessage: 'চালিয়ে যেতে অ্যাপটি আবার লোড করুন।', tryAgain: 'আবার চেষ্টা করুন', errorDetails: 'ত্রুটির বিবরণ', viewErrorDetails: 'ত্রুটির বিবরণ দেখুন', closeErrorDetails: 'ত্রুটির বিবরণ বন্ধ করুন', detailAbout: 'Red Zone AR হলো Ephesus Medya-এর তৈরি ক্যামেরা-ভিত্তিক অ্যাকশন ও অস্ত্র সিমুলেশন গেম।', detailDeveloper: 'ডেভেলপার: Halil Özsoy\n\nRed Zone AR Ephesus Medya-এর অধীনে স্বাধীনভাবে তৈরি।', detailPrivacy: 'ক্যামেরা ফ্রেম শুধু সক্রিয় ক্যামেরা সেশনে ব্যবহৃত হয়। আপনার পছন্দ ছাড়া রেকর্ডিং তৈরি হয় না। অ্যাপ স্থায়ীভাবে অবস্থানের ডেটা রাখে না।', detailSecurity: 'পছন্দগুলি ডিভাইসে স্থানীয়ভাবে রাখা হয়। ক্যামেরা ফ্রেম সার্ভারে পাঠানো হয় না। রেকর্ডিং আপনার নিয়ন্ত্রণে।', detailGuide: '১. ক্যামেরা অনুমতি দিন। ২. ক্যাটালগ থেকে সরঞ্জাম বাছুন; এই সিমুলেশনে সবই পাওয়া যায়। ৩. জয়স্টিক দিয়ে নিশানা সরিয়ে অ্যাকশন বোতামে গুলি করুন। ৪. নাইট ও থার্মাল দৃশ্য ভিজ্যুয়াল ফিল্টার সিমুলেশন, আসল সেন্সর নয়। ৫. এই বিল্ডের বিজ্ঞাপন সিমুলেশন। ৬. ক্যামেরা প্রক্রিয়াকরণ ডিভাইসেই থাকে।', countryTR: 'তুরস্ক', countryDE: 'জার্মানি', countryUA: 'ইউক্রেন', countryUS: 'মার্কিন যুক্তরাষ্ট্র',
  },
  pa: {
    brand: 'RED ZONE AR', developer: 'ਡਿਵੈਲਪਰ: Halil Özsoy', bootSubtitle: 'EPHESUS MEDYA ਦੀ ਗੇਮ', bootCaption: 'ਫੀਲਡ ਸਿਸਟਮ ਸ਼ੁਰੂ ਹੋ ਰਹੇ ਹਨ', setupStep: 'ਫੀਲਡ ਸੈਟਅੱਪ / 01', permissions: 'ਡਿਵਾਈਸ ਪਹੁੰਚ', permissionsText: 'ਖੇਡਣ ਲਈ ਕੈਮਰੇ ਦੀ ਇਜਾਜ਼ਤ ਦਿਓ। ਰਿਕਾਰਡਿੰਗ ਦੀ ਪਹੁੰਚ ਸਿਰਫ਼ ਰਿਕਾਰਡ ਚੁਣਨ ਉੱਤੇ ਮੰਗੀ ਜਾਵੇਗੀ।', cameraAccess: 'ਕੈਮਰਾ ਪਹੁੰਚ', recordingAccess: 'ਰਿਕਾਰਡਿੰਗ ਪਹੁੰਚ', audioInfo: 'ਗੇਮ ਆਡੀਓ ਲਈ ਮਾਈਕ੍ਰੋਫੋਨ ਦੀ ਇਜਾਜ਼ਤ ਨਹੀਂ ਚਾਹੀਦੀ।', recordingLater: 'ਮਾਈਕ੍ਰੋਫੋਨ ਅਤੇ ਮੀਡੀਆ ਪਹੁੰਚ ਸਿਰਫ਼ ਰਿਕਾਰਡਿੰਗ ਲਈ ਮੰਗੀ ਜਾਵੇਗੀ।', grantAccess: 'ਕੈਮਰੇ ਦੀ ਇਜਾਜ਼ਤ ਦਿਓ', ready: 'ਤਿਆਰ', waiting: 'ਉਡੀਕ', continue: 'ਜਾਰੀ ਰੱਖੋ', setupOverline: 'RED ZONE AR / ਸੈਟਅੱਪ', mission: 'ਪ੍ਰੋਫਾਈਲ ਸੈਟਅੱਪ', missionText: 'ਕੈਮਰਾ ਅਨੁਭਵ ਨੂੰ ਆਪਣੇ ਮੁਤਾਬਕ ਬਣਾਉਣ ਲਈ ਖੇਤਰ ਚੁਣੋ।', chooseRegion: 'ਆਪਣਾ ਖੇਤਰ ਚੁਣੋ', region: 'ਤੁਹਾਡਾ ਖੇਤਰ', home: 'ਹੋਮ', openCamera: 'ਕੈਮਰਾ ਖੋਲ੍ਹੋ', armory: 'ਹਥਿਆਰਖਾਨਾ', store: 'ਸਟੋਰ', settings: 'ਸੈਟਿੰਗਾਂ', camera: 'ਕੈਮਰਾ', cameraReady: 'ਕੈਮਰਾ ਤਿਆਰ', cameraHint: 'ਸ਼ੁਰੂ ਕਰਨ ਲਈ ਕੈਮਰਾ ਖੋਲ੍ਹੋ।', players: '2–10 ਖਿਡਾਰੀ', teamBattle: 'ਟੀਮ ਜੰਗ', unlockedEquipment: 'ਅਨਲੌਕ ਸਾਮਾਨ', adSimulation: 'ਇਸ਼ਤਿਹਾਰ ਸਿਮੂਲੇਸ਼ਨ', equipmentSettings: 'ਸਾਮਾਨ ਅਤੇ ਸੈਟਿੰਗਾਂ', allWeaponsUnlocked: 'ਸਾਰੇ ਹਥਿਆਰ ਅਨਲੌਕ', equipmentSelection: 'ਸਾਮਾਨ ਦੀ ਚੋਣ', weaponsGrenades: 'ਹਥਿਆਰ · ਗ੍ਰਨੇਡ', demoCreditStore: 'ਡੈਮੋ ਕ੍ਰੈਡਿਟ ਸਟੋਰ', onDeviceProcessing: 'ਕੈਮਰਾ ਪ੍ਰੋਸੈਸਿੰਗ ਇਸੇ ਡਿਵਾਈਸ ਉੱਤੇ ਰਹਿੰਦੀ ਹੈ।', system: 'ਸਿਸਟਮ', information: 'ਜਾਣਕਾਰੀ', about: 'Red Zone AR ਬਾਰੇ', developerInfo: 'ਡਿਵੈਲਪਰ ਜਾਣਕਾਰੀ', privacy: 'ਪਰਦੇਦਾਰੀ ਨੀਤੀ', security: 'ਡਾਟਾ ਸੁਰੱਖਿਆ', guide: 'ਗੇਮ ਗਾਈਡ', language: 'ਭਾਸ਼ਾ', sound: 'ਬੈਕਗ੍ਰਾਊਂਡ ਸੰਗੀਤ', close: 'ਬੰਦ ਕਰੋ', storeHeroTitle: 'ਆਪਣੀ ਕਾਰਵਾਈ ਨੂੰ ਮਜ਼ਬੂਤ ਕਰੋ', storeBody: 'Pro ਕ੍ਰੈਡਿਟ ਦੀ ਮਿਆਦ ਖ਼ਤਮ ਨਹੀਂ ਹੁੰਦੀ। ਅੱਪਗ੍ਰੇਡ ਦੀ ਲੋੜ ਹੋਵੇ ਤਾਂ ਕਾਰਵਾਈ ਜਾਰੀ ਰੱਖੋ।', creditPacks: 'PRO ਕ੍ਰੈਡਿਟ ਪੈਕ', noExpiry: 'ਮਿਆਦ ਨਹੀਂ · ਤੁਰੰਤ ਡਿਲਿਵਰੀ', paymentUnavailable: 'ਭੁਗਤਾਨ ਉਪਲਬਧ ਨਹੀਂ', paymentUnavailableBody: 'ਇਸ ਬਿਲਡ ਵਿੱਚ ਐਪ ਅੰਦਰ ਖਰੀਦ ਜੁੜੀ ਨਹੀਂ। ਕੋਈ ਪੈਸਾ ਨਹੀਂ ਕਟੇਗਾ ਅਤੇ ਕ੍ਰੈਡਿਟ ਨਹੀਂ ਜੋੜੇ ਜਾਣਗੇ।', paymentUnavailableButton: 'ਸਮਝ ਆਇਆ', storeNote: 'ਸਿਮੂਲੇਟਡ ਇਸ਼ਤਿਹਾਰ ਨਾਲ ਮੁਫ਼ਤ ਜਾਰੀ ਰੱਖੋ। ਇਸ਼ਤਿਹਾਰ ਮੌਕੇ ਹਰ ਰੋਜ਼ ਰੀਸੈੱਟ ਹੁੰਦੇ ਹਨ।', errorTitle: 'ਕੁਝ ਗਲਤ ਹੋ ਗਿਆ', errorMessage: 'ਜਾਰੀ ਰੱਖਣ ਲਈ ਐਪ ਮੁੜ ਲੋਡ ਕਰੋ।', tryAgain: 'ਮੁੜ ਕੋਸ਼ਿਸ਼', errorDetails: 'ਗਲਤੀ ਵੇਰਵੇ', viewErrorDetails: 'ਗਲਤੀ ਵੇਰਵੇ ਵੇਖੋ', closeErrorDetails: 'ਗਲਤੀ ਵੇਰਵੇ ਬੰਦ ਕਰੋ', detailAbout: 'Red Zone AR Ephesus Medya ਵੱਲੋਂ ਬਣਾਈ ਕੈਮਰਾ-ਅਧਾਰਿਤ ਐਕਸ਼ਨ ਅਤੇ ਹਥਿਆਰ ਸਿਮੂਲੇਸ਼ਨ ਗੇਮ ਹੈ।', detailDeveloper: 'ਡਿਵੈਲਪਰ: Halil Özsoy\n\nRed Zone AR Ephesus Medya ਹੇਠ ਸੁਤੰਤਰ ਤੌਰ ਉੱਤੇ ਬਣਾਈ ਗਈ ਹੈ।', detailPrivacy: 'ਕੈਮਰਾ ਫਰੇਮ ਸਿਰਫ਼ ਸਰਗਰਮ ਕੈਮਰਾ ਸੈਸ਼ਨ ਦੌਰਾਨ ਵਰਤੇ ਜਾਂਦੇ ਹਨ। ਤੁਹਾਡੀ ਚੋਣ ਤੋਂ ਬਿਨਾਂ ਰਿਕਾਰਡਿੰਗ ਨਹੀਂ ਬਣਦੀ। ਐਪ ਸਥਾਨ ਡਾਟਾ ਸਥਾਈ ਤੌਰ ਉੱਤੇ ਨਹੀਂ ਰੱਖਦੀ।', detailSecurity: 'ਤਰਜੀਹਾਂ ਡਿਵਾਈਸ ਉੱਤੇ ਸਥਾਨਕ ਤੌਰ ਉੱਤੇ ਸੁਰੱਖਿਅਤ ਹੁੰਦੀਆਂ ਹਨ। ਕੈਮਰਾ ਫਰੇਮ ਸਰਵਰ ਨੂੰ ਨਹੀਂ ਭੇਜੇ ਜਾਂਦੇ। ਰਿਕਾਰਡਿੰਗ ਤੁਹਾਡੇ ਕਾਬੂ ਵਿੱਚ ਹਨ।', detailGuide: '1. ਕੈਮਰੇ ਦੀ ਇਜਾਜ਼ਤ ਦਿਓ। 2. ਕੈਟਾਲਾਗ ਤੋਂ ਸਾਮਾਨ ਚੁਣੋ; ਇਸ ਸਿਮੂਲੇਸ਼ਨ ਵਿੱਚ ਸਭ ਉਪਲਬਧ ਹੈ। 3. ਜੌਇਸਟਿਕ ਨਾਲ ਨਿਸ਼ਾਨਾ ਹਿਲਾਓ ਅਤੇ ਐਕਸ਼ਨ ਬਟਨ ਨਾਲ ਫਾਇਰ ਕਰੋ। 4. ਨਾਈਟ ਅਤੇ ਥਰਮਲ ਦ੍ਰਿਸ਼ ਵਿਜ਼ੂਅਲ ਫਿਲਟਰ ਸਿਮੂਲੇਸ਼ਨ ਹਨ। 5. ਇਸ ਬਿਲਡ ਦੇ ਇਸ਼ਤਿਹਾਰ ਸਿਮੂਲੇਸ਼ਨ ਹਨ। 6. ਕੈਮਰਾ ਪ੍ਰੋਸੈਸਿੰਗ ਡਿਵਾਈਸ ਉੱਤੇ ਰਹਿੰਦੀ ਹੈ।', countryTR: 'ਤੁਰਕੀ', countryDE: 'ਜਰਮਨੀ', countryUA: 'ਯੂਕਰੇਨ', countryUS: 'ਸੰਯੁਕਤ ਰਾਜ',
  },
  id: {
    brand: 'RED ZONE AR', developer: 'Pengembang: Halil Özsoy', bootSubtitle: 'GAME DARI EPHESUS MEDYA', bootCaption: 'MENYIAPKAN SISTEM LAPANGAN', setupStep: 'PENYIAPAN LAPANGAN / 01', permissions: 'AKSES PERANGKAT', permissionsText: 'Izinkan kamera untuk bermain. Akses rekaman hanya diminta saat Anda memilih merekam.', cameraAccess: 'Akses kamera', recordingAccess: 'Akses rekaman', audioInfo: 'Audio permainan tidak memerlukan izin mikrofon.', recordingLater: 'Mikrofon dan media hanya diminta untuk perekaman.', grantAccess: 'IZINKAN KAMERA', ready: 'SIAP', waiting: 'MENUNGGU', continue: 'LANJUTKAN', setupOverline: 'RED ZONE AR / PENYIAPAN', mission: 'PENYIAPAN PROFIL', missionText: 'Pilih wilayah untuk menyesuaikan pengalaman kamera.', chooseRegion: 'PILIH WILAYAH', region: 'WILAYAH ANDA', home: 'BERANDA', openCamera: 'BUKA KAMERA', armory: 'GUDANG SENJATA', store: 'TOKO', settings: 'PENGATURAN', camera: 'KAMERA', cameraReady: 'Kamera siap', cameraHint: 'Buka kamera untuk memulai.', players: '2–10 PEMAIN', teamBattle: 'PERTEMPURAN TIM', unlockedEquipment: 'PERLENGKAPAN TERBUKA', adSimulation: 'SIMULASI IKLAN', equipmentSettings: 'PERLENGKAPAN & PENGATURAN', allWeaponsUnlocked: 'SEMUA SENJATA TERBUKA', equipmentSelection: 'Pilih perlengkapan', weaponsGrenades: 'Senjata · granat', demoCreditStore: 'Toko kredit demo', onDeviceProcessing: 'Pemrosesan kamera tetap di perangkat ini.', system: 'SISTEM', information: 'INFORMASI', about: 'Tentang Red Zone AR', developerInfo: 'Informasi pengembang', privacy: 'Kebijakan privasi', security: 'Keamanan data', guide: 'Panduan permainan', language: 'Bahasa', sound: 'Musik latar', close: 'TUTUP', storeHeroTitle: 'PERKUAT OPERASI ANDA', storeBody: 'Kredit Pro tidak kedaluwarsa. Lanjutkan operasi saat membutuhkan peningkatan.', creditPacks: 'PAKET KREDIT PRO', noExpiry: 'Tanpa kedaluwarsa · langsung tersedia', paymentUnavailable: 'Pembayaran tidak tersedia', paymentUnavailableBody: 'Pembelian dalam aplikasi belum terhubung di versi ini. Tidak ada biaya dan kredit tidak ditambahkan.', paymentUnavailableButton: 'MENGERTI', storeNote: 'Anda dapat lanjut gratis dengan opsi iklan simulasi. Jatah iklan direset setiap hari.', errorTitle: 'Terjadi kesalahan', errorMessage: 'Muat ulang aplikasi untuk melanjutkan.', tryAgain: 'COBA LAGI', errorDetails: 'Detail kesalahan', viewErrorDetails: 'Lihat detail kesalahan', closeErrorDetails: 'Tutup detail kesalahan', detailAbout: 'Red Zone AR adalah permainan aksi dan simulasi senjata berbasis kamera dari Ephesus Medya.', detailDeveloper: 'Pengembang: Halil Özsoy\n\nRed Zone AR dikembangkan secara independen oleh Ephesus Medya.', detailPrivacy: 'Frame kamera hanya digunakan selama sesi kamera aktif. Rekaman tidak dibuat tanpa pilihan Anda. Aplikasi tidak menyimpan lokasi secara permanen.', detailSecurity: 'Preferensi disimpan secara lokal. Frame kamera tidak dikirim ke server. Rekaman tetap dalam kendali Anda.', detailGuide: '1. Izinkan kamera. 2. Pilih perlengkapan dari katalog; semua tersedia dalam simulasi ini. 3. Gerakkan bidikan dengan joystick dan tembak dengan tombol aksi. 4. Tampilan malam dan termal adalah simulasi filter visual. 5. Iklan di versi ini adalah simulasi. 6. Pemrosesan kamera tetap di perangkat.', countryTR: 'Turki', countryDE: 'Jerman', countryUA: 'Ukraina', countryUS: 'Amerika Serikat',
  },
  ko: {
    brand: 'RED ZONE AR', developer: '개발자: Halil Özsoy', bootSubtitle: 'EPHESUS MEDYA 게임', bootCaption: '필드 시스템 초기화 중', setupStep: '필드 설정 / 01', permissions: '기기 접근', permissionsText: '플레이하려면 카메라를 허용하세요. 녹화를 선택할 때만 녹화 권한을 요청합니다.', cameraAccess: '카메라 접근', recordingAccess: '녹화 접근', audioInfo: '게임 오디오에는 마이크 권한이 필요하지 않습니다.', recordingLater: '마이크와 미디어 접근은 녹화할 때만 요청합니다.', grantAccess: '카메라 허용', ready: '준비됨', waiting: '대기 중', continue: '계속', setupOverline: 'RED ZONE AR / 설정', mission: '프로필 설정', missionText: '카메라 경험을 맞춤 설정할 지역을 선택하세요.', chooseRegion: '지역 선택', region: '내 지역', home: '홈', openCamera: '카메라 열기', armory: '무기고', store: '상점', settings: '설정', camera: '카메라', cameraReady: '카메라 준비 완료', cameraHint: '카메라를 열어 시작하세요.', players: '2–10명', teamBattle: '팀 전투', unlockedEquipment: '잠금 해제 장비', adSimulation: '광고 시뮬레이션', equipmentSettings: '장비 및 설정', allWeaponsUnlocked: '모든 무기 잠금 해제', equipmentSelection: '장비 선택', weaponsGrenades: '무기 · 수류탄', demoCreditStore: '데모 크레딧 상점', onDeviceProcessing: '카메라 처리는 이 기기에만 남습니다.', system: '시스템', information: '정보', about: 'Red Zone AR 정보', developerInfo: '개발자 정보', privacy: '개인정보 보호정책', security: '데이터 보안', guide: '게임 가이드', language: '언어', sound: '배경 음악', close: '닫기', storeHeroTitle: '작전을 강화하세요', storeBody: 'Pro 크레딧은 만료되지 않습니다. 업그레이드가 필요할 때 작전을 계속하세요.', creditPacks: 'PRO 크레딧 팩', noExpiry: '기간 제한 없음 · 즉시 지급', paymentUnavailable: '결제할 수 없음', paymentUnavailableBody: '이 빌드에는 인앱 결제가 연결되어 있지 않습니다. 요금이 청구되지 않으며 크레딧도 추가되지 않습니다.', paymentUnavailableButton: '확인', storeNote: '시뮬레이션 광고 옵션으로 무료 플레이를 계속할 수 있습니다. 광고 횟수는 매일 초기화됩니다.', errorTitle: '문제가 발생했습니다', errorMessage: '계속하려면 앱을 다시 불러오세요.', tryAgain: '다시 시도', errorDetails: '오류 세부정보', viewErrorDetails: '오류 세부정보 보기', closeErrorDetails: '오류 세부정보 닫기', detailAbout: 'Red Zone AR은 Ephesus Medya가 개발한 카메라 기반 액션 및 무기 시뮬레이션 게임입니다.', detailDeveloper: '개발자: Halil Özsoy\n\nRed Zone AR은 Ephesus Medya에서 독립적으로 개발됩니다.', detailPrivacy: '카메라 프레임은 활성 카메라 세션에서만 사용됩니다. 선택하지 않으면 녹화가 생성되지 않습니다. 위치 데이터는 영구 저장하지 않습니다.', detailSecurity: '설정은 기기에 로컬 저장됩니다. 카메라 프레임은 서버로 전송되지 않습니다. 녹화는 사용자가 관리합니다.', detailGuide: '1. 카메라를 허용하세요. 2. 카탈로그에서 장비를 선택하세요. 이 시뮬레이션에서는 모두 사용할 수 있습니다. 3. 조이스틱으로 조준점을 움직이고 액션 버튼으로 발사하세요. 4. 야간 및 열화상은 시각 필터 시뮬레이션입니다. 5. 이 빌드의 광고는 시뮬레이션입니다. 6. 카메라 처리는 기기에 남습니다.', countryTR: '튀르키예', countryDE: '독일', countryUA: '우크라이나', countryUS: '미국',
  },
  vi: {
    brand: 'RED ZONE AR', developer: 'Nhà phát triển: Halil Özsoy', bootSubtitle: 'TRÒ CHƠI CỦA EPHESUS MEDYA', bootCaption: 'ĐANG KHỞI TẠO HỆ THỐNG', setupStep: 'THIẾT LẬP / 01', permissions: 'QUYỀN TRUY CẬP THIẾT BỊ', permissionsText: 'Cho phép máy ảnh để chơi. Quyền ghi hình chỉ được hỏi khi bạn chọn ghi.', cameraAccess: 'Quyền máy ảnh', recordingAccess: 'Quyền ghi hình', audioInfo: 'Âm thanh trò chơi không cần quyền micrô.', recordingLater: 'Micrô và phương tiện chỉ được yêu cầu khi ghi hình.', grantAccess: 'CHO PHÉP MÁY ẢNH', ready: 'SẴN SÀNG', waiting: 'ĐANG CHỜ', continue: 'TIẾP TỤC', setupOverline: 'RED ZONE AR / THIẾT LẬP', mission: 'THIẾT LẬP HỒ SƠ', missionText: 'Chọn khu vực để cá nhân hóa trải nghiệm máy ảnh.', chooseRegion: 'CHỌN KHU VỰC', region: 'KHU VỰC CỦA BẠN', home: 'TRANG CHỦ', openCamera: 'MỞ MÁY ẢNH', armory: 'KHO VŨ KHÍ', store: 'CỬA HÀNG', settings: 'CÀI ĐẶT', camera: 'MÁY ẢNH', cameraReady: 'Máy ảnh sẵn sàng', cameraHint: 'Mở máy ảnh để bắt đầu.', players: '2–10 NGƯỜI CHƠI', teamBattle: 'ĐẤU ĐỘI', unlockedEquipment: 'TRANG BỊ ĐÃ MỞ', adSimulation: 'MÔ PHỎNG QUẢNG CÁO', equipmentSettings: 'TRANG BỊ & CÀI ĐẶT', allWeaponsUnlocked: 'ĐÃ MỞ TẤT CẢ VŨ KHÍ', equipmentSelection: 'Chọn trang bị', weaponsGrenades: 'Vũ khí · lựu đạn', demoCreditStore: 'Cửa hàng tín dụng demo', onDeviceProcessing: 'Xử lý máy ảnh chỉ diễn ra trên thiết bị này.', system: 'HỆ THỐNG', information: 'THÔNG TIN', about: 'Về Red Zone AR', developerInfo: 'Thông tin nhà phát triển', privacy: 'Chính sách riêng tư', security: 'Bảo mật dữ liệu', guide: 'Hướng dẫn trò chơi', language: 'Ngôn ngữ', sound: 'Nhạc nền', close: 'ĐÓNG', storeHeroTitle: 'TĂNG CƯỜNG NHIỆM VỤ', storeBody: 'Tín dụng Pro không hết hạn. Tiếp tục nhiệm vụ khi cần nâng cấp.', creditPacks: 'GÓI TÍN DỤNG PRO', noExpiry: 'Không hết hạn · giao ngay', paymentUnavailable: 'Thanh toán không khả dụng', paymentUnavailableBody: 'Mua hàng trong ứng dụng chưa được kết nối trong bản dựng này. Không bị tính phí và không cộng tín dụng.', paymentUnavailableButton: 'ĐÃ HIỂU', storeNote: 'Bạn có thể tiếp tục miễn phí với quảng cáo mô phỏng. Lượt quảng cáo được đặt lại mỗi ngày.', errorTitle: 'Đã xảy ra lỗi', errorMessage: 'Tải lại ứng dụng để tiếp tục.', tryAgain: 'THỬ LẠI', errorDetails: 'Chi tiết lỗi', viewErrorDetails: 'Xem chi tiết lỗi', closeErrorDetails: 'Đóng chi tiết lỗi', detailAbout: 'Red Zone AR là trò chơi hành động và mô phỏng vũ khí bằng máy ảnh do Ephesus Medya phát triển.', detailDeveloper: 'Nhà phát triển: Halil Özsoy\n\nRed Zone AR được phát triển độc lập bởi Ephesus Medya.', detailPrivacy: 'Khung hình máy ảnh chỉ được dùng trong phiên máy ảnh đang hoạt động. Không ghi hình nếu bạn không chọn. Ứng dụng không lưu vị trí lâu dài.', detailSecurity: 'Tùy chọn được lưu cục bộ. Khung hình không gửi đến máy chủ. Bạn kiểm soát bản ghi.', detailGuide: '1. Cho phép máy ảnh. 2. Chọn trang bị trong danh mục; mọi thứ đều có trong mô phỏng. 3. Di chuyển tâm ngắm bằng cần điều khiển và bắn bằng nút hành động. 4. Chế độ đêm và nhiệt là bộ lọc mô phỏng. 5. Quảng cáo trong bản này là mô phỏng. 6. Xử lý nằm trên thiết bị.', countryTR: 'Thổ Nhĩ Kỳ', countryDE: 'Đức', countryUA: 'Ukraina', countryUS: 'Hoa Kỳ',
  },
  th: {
    brand: 'RED ZONE AR', developer: 'ผู้พัฒนา: Halil Özsoy', bootSubtitle: 'เกมจาก EPHESUS MEDYA', bootCaption: 'กำลังเริ่มระบบภาคสนาม', setupStep: 'ตั้งค่าภาคสนาม / 01', permissions: 'การเข้าถึงอุปกรณ์', permissionsText: 'อนุญาตกล้องเพื่อเล่นเกม ระบบจะขอสิทธิ์บันทึกเมื่อคุณเลือกบันทึกเท่านั้น', cameraAccess: 'การเข้าถึงกล้อง', recordingAccess: 'การเข้าถึงการบันทึก', audioInfo: 'เสียงเกมไม่ต้องใช้สิทธิ์ไมโครโฟน', recordingLater: 'ระบบจะขอสิทธิ์ไมโครโฟนและสื่อเมื่อบันทึกเท่านั้น', grantAccess: 'อนุญาตกล้อง', ready: 'พร้อม', waiting: 'รอ', continue: 'ดำเนินการต่อ', setupOverline: 'RED ZONE AR / ตั้งค่า', mission: 'ตั้งค่าโปรไฟล์', missionText: 'เลือกภูมิภาคเพื่อปรับประสบการณ์กล้องของคุณ', chooseRegion: 'เลือกภูมิภาค', region: 'ภูมิภาคของคุณ', home: 'หน้าหลัก', openCamera: 'เปิดกล้อง', armory: 'คลังอาวุธ', store: 'ร้านค้า', settings: 'การตั้งค่า', camera: 'กล้อง', cameraReady: 'กล้องพร้อม', cameraHint: 'เปิดกล้องเพื่อเริ่ม', players: 'ผู้เล่น 2–10 คน', teamBattle: 'การต่อสู้แบบทีม', unlockedEquipment: 'อุปกรณ์ที่ปลดล็อก', adSimulation: 'จำลองโฆษณา', equipmentSettings: 'อุปกรณ์และการตั้งค่า', allWeaponsUnlocked: 'ปลดล็อกอาวุธทั้งหมด', equipmentSelection: 'เลือกอุปกรณ์', weaponsGrenades: 'อาวุธ · ระเบิด', demoCreditStore: 'ร้านเครดิตสาธิต', onDeviceProcessing: 'การประมวลผลกล้องอยู่ในอุปกรณ์นี้', system: 'ระบบ', information: 'ข้อมูล', about: 'เกี่ยวกับ Red Zone AR', developerInfo: 'ข้อมูลผู้พัฒนา', privacy: 'นโยบายความเป็นส่วนตัว', security: 'ความปลอดภัยของข้อมูล', guide: 'คู่มือเกม', language: 'ภาษา', sound: 'เพลงพื้นหลัง', close: 'ปิด', storeHeroTitle: 'เพิ่มพลังให้ภารกิจ', storeBody: 'เครดิต Pro ไม่มีวันหมดอายุ เดินหน้าภารกิจเมื่อต้องการอัปเกรด', creditPacks: 'แพ็กเครดิต PRO', noExpiry: 'ไม่มีหมดอายุ · ส่งทันที', paymentUnavailable: 'ไม่สามารถชำระเงินได้', paymentUnavailableBody: 'บิลด์นี้ยังไม่เชื่อมต่อการซื้อในแอป จะไม่มีการเรียกเก็บเงินหรือเพิ่มเครดิต', paymentUnavailableButton: 'เข้าใจแล้ว', storeNote: 'เล่นต่อฟรีด้วยตัวเลือกโฆษณาจำลอง สิทธิ์โฆษณาจะรีเซ็ตทุกวัน', errorTitle: 'เกิดข้อผิดพลาด', errorMessage: 'โหลดแอปใหม่เพื่อดำเนินการต่อ', tryAgain: 'ลองอีกครั้ง', errorDetails: 'รายละเอียดข้อผิดพลาด', viewErrorDetails: 'ดูรายละเอียดข้อผิดพลาด', closeErrorDetails: 'ปิดรายละเอียดข้อผิดพลาด', detailAbout: 'Red Zone AR คือเกมแอ็กชันและจำลองอาวุธด้วยกล้อง พัฒนาโดย Ephesus Medya', detailDeveloper: 'ผู้พัฒนา: Halil Özsoy\n\nRed Zone AR พัฒนาอย่างอิสระภายใต้ Ephesus Medya', detailPrivacy: 'ใช้ภาพจากกล้องเฉพาะระหว่างเซสชันกล้องที่ทำงานอยู่ จะไม่บันทึกโดยไม่เลือก และไม่เก็บข้อมูลตำแหน่งถาวร', detailSecurity: 'การตั้งค่าจัดเก็บในอุปกรณ์ ภาพจากกล้องไม่ส่งไปเซิร์ฟเวอร์ คุณควบคุมการบันทึก', detailGuide: '1. อนุญาตกล้อง 2. เลือกอุปกรณ์จากแคตตาล็อก ทุกอย่างใช้ได้ในโหมดจำลอง 3. เล็งด้วยจอยสติ๊กและยิงด้วยปุ่มแอ็กชัน 4. มุมมองกลางคืนและความร้อนเป็นฟิลเตอร์จำลอง 5. โฆษณาในบิลด์นี้เป็นการจำลอง 6. ประมวลผลกล้องบนอุปกรณ์', countryTR: 'ตุรกี', countryDE: 'เยอรมนี', countryUA: 'ยูเครน', countryUS: 'สหรัฐอเมริกา',
  },
  nl: {
    brand: 'RED ZONE AR', developer: 'Ontwikkelaar: Halil Özsoy', bootSubtitle: 'EEN EPHESUS MEDYA-SPEL', bootCaption: 'VELDSYSTEMEN WORDEN GESTART', setupStep: 'VELDINSTELLING / 01', permissions: 'TOEGANG TOT APPARAAT', permissionsText: 'Sta de camera toe om te spelen. Opnametoegang wordt alleen gevraagd wanneer je wilt opnemen.', cameraAccess: 'Cameratoegang', recordingAccess: 'Opnametoegang', audioInfo: 'Spelaudio heeft geen microfoontoestemming nodig.', recordingLater: 'Microfoon- en mediatoegang worden alleen voor opname gevraagd.', grantAccess: 'CAMERA TOESTAAN', ready: 'GEREED', waiting: 'WACHTEN', continue: 'DOORGAAN', setupOverline: 'RED ZONE AR / INSTELLING', mission: 'PROFIEL INSTELLEN', missionText: 'Kies je regio voor een persoonlijke camera-ervaring.', chooseRegion: 'KIES JE REGIO', region: 'JOUW REGIO', home: 'HOME', openCamera: 'CAMERA OPENEN', armory: 'WAPENKAMER', store: 'WINKEL', settings: 'INSTELLINGEN', camera: 'CAMERA', cameraReady: 'Camera gereed', cameraHint: 'Open de camera om te beginnen.', players: '2–10 SPELERS', teamBattle: 'TEAMGEVECHT', unlockedEquipment: 'VRIJGESPEELDE UITRUSTING', adSimulation: 'ADVERTENTIESIMULATIE', equipmentSettings: 'UITRUSTING & INSTELLINGEN', allWeaponsUnlocked: 'ALLE WAPENS VRIJGESPEELD', equipmentSelection: 'Uitrusting kiezen', weaponsGrenades: 'Wapens · granaten', demoCreditStore: 'Demo-kredietwinkel', onDeviceProcessing: 'Cameraverwerking blijft op dit apparaat.', system: 'SYSTEEM', information: 'INFORMATIE', about: 'Over Red Zone AR', developerInfo: 'Ontwikkelaarsinformatie', privacy: 'Privacybeleid', security: 'Gegevensbeveiliging', guide: 'Spelgids', language: 'Taal', sound: 'Achtergrondmuziek', close: 'SLUITEN', storeHeroTitle: 'VERSTERK JE OPERATIE', storeBody: 'Pro-tegoeden verlopen nooit. Ga door wanneer je een upgrade nodig hebt.', creditPacks: 'PRO-TEGOEDPAKKETTEN', noExpiry: 'Geen vervaldatum · direct geleverd', paymentUnavailable: 'Betaling niet beschikbaar', paymentUnavailableBody: 'In-app aankopen zijn in deze versie niet verbonden. Er wordt niets afgeschreven en niets toegevoegd.', paymentUnavailableButton: 'BEGREPEN', storeNote: 'Ga gratis door met de gesimuleerde advertentieoptie. Advertentietegoed wordt dagelijks vernieuwd.', errorTitle: 'Er ging iets mis', errorMessage: 'Laad de app opnieuw om door te gaan.', tryAgain: 'OPNIEUW PROBEREN', errorDetails: 'Foutdetails', viewErrorDetails: 'Foutdetails bekijken', closeErrorDetails: 'Foutdetails sluiten', detailAbout: 'Red Zone AR is een camera-gebaseerde actie- en wapensimulatie van Ephesus Medya.', detailDeveloper: 'Ontwikkelaar: Halil Özsoy\n\nRed Zone AR wordt onafhankelijk ontwikkeld door Ephesus Medya.', detailPrivacy: 'Camerabeelden worden alleen tijdens een actieve sessie gebruikt. Zonder jouw keuze wordt niets opgenomen. Locatie wordt niet blijvend opgeslagen.', detailSecurity: 'Voorkeuren worden lokaal opgeslagen. Camerabeelden gaan niet naar onze server. Jij beheert opnames.', detailGuide: '1. Sta de camera toe. 2. Kies uitrusting uit de catalogus; alles is beschikbaar in deze simulatie. 3. Beweeg het vizier met de joystick en vuur met de actieknop. 4. Nacht- en warmtebeeld zijn filtersimulaties. 5. Advertenties zijn in deze versie gesimuleerd. 6. Verwerking blijft op het apparaat.', countryTR: 'Turkije', countryDE: 'Duitsland', countryUA: 'Oekraïne', countryUS: 'Verenigde Staten',
  },
  pl: {
    brand: 'RED ZONE AR', developer: 'Twórca: Halil Özsoy', bootSubtitle: 'GRA EPHESUS MEDYA', bootCaption: 'URUCHAMIANIE SYSTEMÓW POLOWYCH', setupStep: 'KONFIGURACJA / 01', permissions: 'DOSTĘP DO URZĄDZENIA', permissionsText: 'Zezwól na aparat, aby grać. Dostęp do nagrywania jest proszony tylko po wybraniu nagrywania.', cameraAccess: 'Dostęp do aparatu', recordingAccess: 'Dostęp do nagrywania', audioInfo: 'Dźwięk gry nie wymaga dostępu do mikrofonu.', recordingLater: 'Mikrofon i multimedia są wymagane tylko do nagrywania.', grantAccess: 'ZEZWÓL NA APARAT', ready: 'GOTOWE', waiting: 'OCZEKIWANIE', continue: 'KONTYNUUJ', setupOverline: 'RED ZONE AR / KONFIGURACJA', mission: 'KONFIGURACJA PROFILU', missionText: 'Wybierz region, aby dostosować działanie aparatu.', chooseRegion: 'WYBIERZ REGION', region: 'TWÓJ REGION', home: 'GŁÓWNA', openCamera: 'OTWÓRZ APARAT', armory: 'ARSENAŁ', store: 'SKLEP', settings: 'USTAWIENIA', camera: 'APARAT', cameraReady: 'Aparat gotowy', cameraHint: 'Otwórz aparat, aby rozpocząć.', players: '2–10 GRACZY', teamBattle: 'BITWA DRUŻYNOWA', unlockedEquipment: 'ODBLOCKOWANE WYPOSAŻENIE', adSimulation: 'SYMULACJA REKLAMY', equipmentSettings: 'WYPOSAŻENIE I USTAWIENIA', allWeaponsUnlocked: 'WSZYSTKIE BRONIE ODBLOKOWANE', equipmentSelection: 'Wybór wyposażenia', weaponsGrenades: 'Broń · granaty', demoCreditStore: 'Sklep kredytów demo', onDeviceProcessing: 'Przetwarzanie obrazu pozostaje na tym urządzeniu.', system: 'SYSTEM', information: 'INFORMACJE', about: 'O Red Zone AR', developerInfo: 'Informacje o twórcy', privacy: 'Polityka prywatności', security: 'Bezpieczeństwo danych', guide: 'Przewodnik gry', language: 'Język', sound: 'Muzyka w tle', close: 'ZAMKNIJ', storeHeroTitle: 'WZMOCNIJ OPERACJĘ', storeBody: 'Kredyty Pro nie wygasają. Kontynuuj operację, gdy potrzebujesz ulepszenia.', creditPacks: 'PAKIETY KREDYTÓW PRO', noExpiry: 'Bez terminu · natychmiastowa dostawa', paymentUnavailable: 'Płatności niedostępne', paymentUnavailableBody: 'Zakupy w aplikacji nie są połączone w tej wersji. Nie pobierzemy opłaty ani nie dodamy kredytów.', paymentUnavailableButton: 'ROZUMIEM', storeNote: 'Kontynuuj bezpłatnie dzięki symulowanej reklamie. Limity reklam odnawiają się codziennie.', errorTitle: 'Coś poszło nie tak', errorMessage: 'Załaduj aplikację ponownie, aby kontynuować.', tryAgain: 'SPRÓBUJ PONOWNIE', errorDetails: 'Szczegóły błędu', viewErrorDetails: 'Pokaż szczegóły błędu', closeErrorDetails: 'Zamknij szczegóły błędu', detailAbout: 'Red Zone AR to gra akcji i symulacja broni oparta na aparacie, stworzona przez Ephesus Medya.', detailDeveloper: 'Twórca: Halil Özsoy\n\nRed Zone AR jest niezależnie tworzona w Ephesus Medya.', detailPrivacy: 'Obrazy z aparatu są używane tylko podczas aktywnej sesji. Nagranie nie powstaje bez wyboru użytkownika. Aplikacja nie przechowuje stale lokalizacji.', detailSecurity: 'Ustawienia są przechowywane lokalnie. Obrazy nie są wysyłane na serwer. To Ty kontrolujesz nagrania.', detailGuide: '1. Zezwól na aparat. 2. Wybierz wyposażenie z katalogu; w tej symulacji wszystko jest dostępne. 3. Poruszaj celownikiem joystickiem i strzelaj przyciskiem akcji. 4. Widok nocny i termiczny to symulowane filtry. 5. Reklamy w tej wersji są symulowane. 6. Przetwarzanie pozostaje na urządzeniu.', countryTR: 'Turcja', countryDE: 'Niemcy', countryUA: 'Ukraina', countryUS: 'Stany Zjednoczone',
  },
  sv: {
    brand: 'RED ZONE AR', developer: 'Utvecklare: Halil Özsoy', bootSubtitle: 'ETT SPEL FRÅN EPHESUS MEDYA', bootCaption: 'FÄLTSYSTEM STARTAS', setupStep: 'FÄLTKONFIGURATION / 01', permissions: 'ENHETSTILLGÅNG', permissionsText: 'Tillåt kameran för att spela. Inspelningstillgång frågas bara när du väljer att spela in.', cameraAccess: 'Kameratillgång', recordingAccess: 'Inspelningstillgång', audioInfo: 'Speljud kräver inte mikrofontillstånd.', recordingLater: 'Mikrofon och media frågas bara vid inspelning.', grantAccess: 'TILLÅT KAMERA', ready: 'REDO', waiting: 'VÄNTAR', continue: 'FORTSÄTT', setupOverline: 'RED ZONE AR / INSTÄLLNING', mission: 'PROFILINSTÄLLNING', missionText: 'Välj region för att anpassa kamera upplevelsen.', chooseRegion: 'VÄLJ DIN REGION', region: 'DIN REGION', home: 'HEM', openCamera: 'ÖPPNA KAMERA', armory: 'VAPENKAMMARE', store: 'BUTIK', settings: 'INSTÄLLNINGAR', camera: 'KAMERA', cameraReady: 'Kameran är redo', cameraHint: 'Öppna kameran för att börja.', players: '2–10 SPELARE', teamBattle: 'LAGSTRID', unlockedEquipment: 'UPPLÅST UTRUSTNING', adSimulation: 'ANNONS-SIMULERING', equipmentSettings: 'UTRUSTNING OCH INSTÄLLNINGAR', allWeaponsUnlocked: 'ALLA VAPEN UPPLÅSTA', equipmentSelection: 'Välj utrustning', weaponsGrenades: 'Vapen · granater', demoCreditStore: 'Demokreditbutik', onDeviceProcessing: 'Kamerabehandlingen stannar på den här enheten.', system: 'SYSTEM', information: 'INFORMATION', about: 'Om Red Zone AR', developerInfo: 'Utvecklarinformation', privacy: 'Integritetspolicy', security: 'Datasäkerhet', guide: 'Spelguide', language: 'Språk', sound: 'Bakgrundsmusik', close: 'STÄNG', storeHeroTitle: 'STÄRK DIN OPERATION', storeBody: 'Pro-krediter upphör aldrig. Fortsätt operationen när du behöver en uppgradering.', creditPacks: 'PRO-KREDITPAKET', noExpiry: 'Ingen giltighetstid · leverans direkt', paymentUnavailable: 'Betalning otillgänglig', paymentUnavailableBody: 'Köp i appen är inte anslutna i denna version. Inget debiteras och inga krediter läggs till.', paymentUnavailableButton: 'FÖRSTÅTT', storeNote: 'Fortsätt gratis med simulerad reklam. Reklamtillgångar återställs dagligen.', errorTitle: 'Något gick fel', errorMessage: 'Ladda om appen för att fortsätta.', tryAgain: 'FÖRSÖK IGEN', errorDetails: 'Feldetaljer', viewErrorDetails: 'Visa feldetaljer', closeErrorDetails: 'Stäng feldetaljer', detailAbout: 'Red Zone AR är ett kamerabaserat action- och vapensimuleringsspel från Ephesus Medya.', detailDeveloper: 'Utvecklare: Halil Özsoy\n\nRed Zone AR utvecklas självständigt av Ephesus Medya.', detailPrivacy: 'Kamerabilder används bara under en aktiv kamerasession. Ingen inspelning skapas utan ditt val. Appen lagrar inte platsdata permanent.', detailSecurity: 'Inställningar sparas lokalt. Kamerabilder skickas inte till servern. Du styr inspelningarna.', detailGuide: '1. Tillåt kamera. 2. Välj utrustning i katalogen; allt är tillgängligt i simuleringen. 3. Flytta siktet med joysticken och skjut med åtgärdsknappen. 4. Natt- och värmevy är simulerade filter. 5. Reklam i denna version är simulerad. 6. Bearbetningen stannar på enheten.', countryTR: 'Turkiet', countryDE: 'Tyskland', countryUA: 'Ukraina', countryUS: 'USA',
  },
  fa: {
    brand: 'RED ZONE AR', developer: 'توسعه‌دهنده: Halil Özsoy', bootSubtitle: 'بازی از EPHESUS MEDYA', bootCaption: 'راه‌اندازی سامانه‌های میدان', setupStep: 'راه‌اندازی میدان / ۰۱', permissions: 'دسترسی دستگاه', permissionsText: 'برای بازی اجازه دوربین بدهید. دسترسی ضبط فقط وقتی درخواست می‌شود که ضبط را انتخاب کنید.', cameraAccess: 'دسترسی دوربین', recordingAccess: 'دسترسی ضبط', audioInfo: 'صدای بازی به اجازه میکروفون نیاز ندارد.', recordingLater: 'دسترسی میکروفون و رسانه فقط برای ضبط درخواست می‌شود.', grantAccess: 'اجازه دوربین', ready: 'آماده', waiting: 'در انتظار', continue: 'ادامه', setupOverline: 'RED ZONE AR / راه‌اندازی', mission: 'راه‌اندازی نمایه', missionText: 'برای شخصی‌سازی تجربه دوربین، منطقه خود را انتخاب کنید.', chooseRegion: 'منطقه خود را انتخاب کنید', region: 'منطقه شما', home: 'خانه', openCamera: 'باز کردن دوربین', armory: 'زرادخانه', store: 'فروشگاه', settings: 'تنظیمات', camera: 'دوربین', cameraReady: 'دوربین آماده است', cameraHint: 'برای شروع دوربین را باز کنید.', players: '۲–۱۰ بازیکن', teamBattle: 'نبرد تیمی', unlockedEquipment: 'تجهیزات بازشده', adSimulation: 'شبیه‌سازی تبلیغ', equipmentSettings: 'تجهیزات و تنظیمات', allWeaponsUnlocked: 'همه سلاح‌ها باز هستند', equipmentSelection: 'انتخاب تجهیزات', weaponsGrenades: 'سلاح‌ها · نارنجک‌ها', demoCreditStore: 'فروشگاه اعتبار آزمایشی', onDeviceProcessing: 'پردازش دوربین روی همین دستگاه انجام می‌شود.', system: 'سیستم', information: 'اطلاعات', about: 'درباره Red Zone AR', developerInfo: 'اطلاعات توسعه‌دهنده', privacy: 'سیاست حریم خصوصی', security: 'امنیت داده', guide: 'راهنمای بازی', language: 'زبان', sound: 'موسیقی پس‌زمینه', close: 'بستن', storeHeroTitle: 'عملیات خود را تقویت کنید', storeBody: 'اعتبارهای Pro منقضی نمی‌شوند. هنگام نیاز به ارتقا عملیات را ادامه دهید.', creditPacks: 'بسته‌های اعتبار PRO', noExpiry: 'بدون انقضا · تحویل فوری', paymentUnavailable: 'پرداخت در دسترس نیست', paymentUnavailableBody: 'خرید درون‌برنامه‌ای در این نسخه متصل نیست. مبلغی دریافت نمی‌شود و اعتباری اضافه نمی‌شود.', paymentUnavailableButton: 'متوجه شدم', storeNote: 'با گزینه تبلیغ شبیه‌سازی‌شده رایگان ادامه دهید. سهمیه تبلیغ هر روز بازنشانی می‌شود.', errorTitle: 'مشکلی پیش آمد', errorMessage: 'برای ادامه برنامه را دوباره بارگذاری کنید.', tryAgain: 'تلاش دوباره', errorDetails: 'جزئیات خطا', viewErrorDetails: 'مشاهده جزئیات خطا', closeErrorDetails: 'بستن جزئیات خطا', detailAbout: 'Red Zone AR یک بازی اکشن و شبیه‌سازی سلاح مبتنی بر دوربین است که توسط Ephesus Medya ساخته شده است.', detailDeveloper: 'توسعه‌دهنده: Halil Özsoy\n\nRed Zone AR به‌صورت مستقل زیرمجموعه Ephesus Medya توسعه می‌یابد.', detailPrivacy: 'فریم‌های دوربین فقط در جلسه فعال دوربین استفاده می‌شوند. بدون انتخاب شما ضبطی ساخته نمی‌شود. برنامه داده مکان را دائمی ذخیره نمی‌کند.', detailSecurity: 'ترجیحات روی دستگاه ذخیره می‌شوند. فریم‌های دوربین به سرور فرستاده نمی‌شوند. ضبط‌ها تحت کنترل شما هستند.', detailGuide: '۱. اجازه دوربین بدهید. ۲. تجهیزات را از فهرست انتخاب کنید؛ همه در این شبیه‌سازی در دسترس‌اند. ۳. نشانه‌گیر را با جوی‌استیک حرکت دهید و با دکمه عملیات شلیک کنید. ۴. دید شب و حرارتی فیلترهای بصری شبیه‌سازی‌شده‌اند، نه حسگر واقعی. ۵. تبلیغ‌ها در این نسخه شبیه‌سازی هستند. ۶. پردازش دوربین روی دستگاه می‌ماند.', countryTR: 'ترکیه', countryDE: 'آلمان', countryUA: 'اوکراین', countryUS: 'ایالات متحده',
  },
} as unknown as Record<Locale, TranslationDictionary>;

// Privacy copy is deliberately kept separate from the legacy catalogue. The
// catalogue predates the multiplayer API and contains outdated recording
// claims. Preserve existing branding while updating data-use disclosures.
type DisclosureKey = 'detailPrivacy' | 'detailSecurity' | 'permissionsText' | 'recordingAccess' | 'recordingLater';
const DISCLOSURE_COPY: Record<'tr' | 'en', Record<DisclosureKey, string>> = {
  tr: {
    permissionsText: 'Oynamak için kamera erişimi ver. Bu derleme kayıt özelliği içermez.',
    recordingAccess: 'Kayıt özelliği yok',
    recordingLater: 'Bu derlemede kayıt için mikrofon veya medya izni istenmez.',
    detailPrivacy: 'Kamera kareleri yalnızca aktif kamera oturumu sırasında bu cihazda işlenir; bu uygulama tarafından yüklenmez. Bu derleme mikrofon veya konum erişimi istemez ve kayıt oluşturmaz. Tercihler ve simülasyon ilerlemesi AsyncStorage ile cihazda saklanır. Takım savaşı, seçtiğin oyuncu adını, oda, takım, işaretçi ve oyun durumunu ve geçici bir oturum kimliğini yapılandırılmış API’ye gönderir; kamera kareleri, mikrofon sesi ve konum gönderilmez. Bu derlemede canlı reklam, ödeme, hesap veya üçüncü taraf analitik yoktur. Genel gizlilik politikası URL’si ve destek iletişimi bu test derlemesinde yapılandırılmamıştır; bu uygulama içi özet yayımlanmış politikanın yerine geçmez.',
    detailSecurity: 'Yerel tercihler ve simülasyon ilerlemesi cihazda tutulur. Çok oyunculu isteklerde geçici bir oturum kimliği kullanılır ve yalnızca yapılandırılmış API’nin ihtiyaç duyduğu oda/oyun verileri gönderilir. Kamera kareleri, mikrofon sesi ve konum bu uygulama tarafından gönderilmez.',
  },
  en: {
    permissionsText: 'Allow camera access to play. This build does not include recording.',
    recordingAccess: 'Recording is not available',
    recordingLater: 'This build does not request microphone or media access for recording.',
    detailPrivacy: 'Camera frames are processed on this device only during an active camera session; this app does not upload them. This build does not request microphone or location access and does not create recordings. Preferences and simulation progress are stored locally with AsyncStorage. Team battle sends the player name you choose, room, team, marker, gameplay state, and a temporary session credential to the configured API; camera frames, microphone audio, and location are not sent. This build has no live ads, payments, accounts, or third-party analytics. A public privacy-policy URL and support contact are not configured in this test build; this in-app summary is not a substitute for a published policy.',
    detailSecurity: 'Local preferences and simulation progress stay on the device. Multiplayer requests use a temporary session credential and send only the room/gameplay data needed by the configured API. Camera frames, microphone audio, and location are not sent by this app.',
  },
};

// The battle controls use direct screen dragging for aim. Keep this copy
// separate from the legacy catalogue entries so an older persisted bundle
// cannot reintroduce joystick instructions.
const TOUCH_AIM_DETAIL_GUIDES: Record<Locale, string> = {
  tr: '1. Kamera erişimi ver. 2. Katalogdan ekipman seç; bu simülasyonda tüm ekipmanlar açıktır. 3. Nişangâhı ekrana dokunup sürükleyerek hareket ettir ve eylem düğmesiyle ateş et. 4. Gece ve termal görünümler gerçek algılama değil, görsel filtre simülasyonudur. 5. Bu sürümde reklamlar simülasyondur. 6. Kamera işleme cihazda kalır. 7. Ses her zaman açıktır; düzeyi cihazının ses düğmeleriyle ayarla.',
  en: '1. Grant camera access. 2. Choose equipment from the catalogue; all equipment is available in this simulation. 3. Drag on the screen to move the sight and use the action button to fire. 4. Night and thermal views are visual filter simulations, not real sensing. 5. Ads in this build are simulations. 6. Camera processing stays on this device. 7. Audio is always enabled; adjust its level with your device volume buttons.',
  zh: '1. 允许相机权限。2. 从目录选择装备；本模拟中的所有装备均可用。3. 在屏幕上拖动来移动瞄准点，并使用动作按钮射击。4. 夜视和热成像是视觉滤镜模拟，不是真实感知。5. 本版本的广告为模拟广告。6. 相机处理保留在设备上。7. 游戏声音始终开启；请使用设备音量按钮调节音量。',
  ja: '1. カメラを許可します。2. カタログから装備を選びます。このシミュレーションでは全装備を利用できます。3. 画面をドラッグして照準を動かし、アクションボタンで発射します。4. ナイト・サーマル表示は視覚フィルターのシミュレーションです。5. このビルドの広告はシミュレーションです。6. カメラ処理は端末内で行われます。7. ゲーム音声は常に有効です。端末の音量ボタンで調整してください。',
  ar: '1. اسمح بالكاميرا. 2. اختر المعدات من الكتالوج؛ كل المعدات متاحة في هذه المحاكاة. 3. اسحب على الشاشة لتحريك التصويب واستخدم زر الإجراء للإطلاق. 4. الرؤية الليلية والحرارية محاكاة لمرشحات بصرية وليست استشعاراً حقيقياً. 5. الإعلانات في هذا الإصدار محاكاة. 6. تبقى معالجة الكاميرا على الجهاز. 7. صوت اللعبة مفعّل دائماً؛ اضبط مستواه بأزرار صوت الجهاز.',
  de: '1. Kamera erlauben. 2. Ausrüstung aus dem Katalog wählen; in dieser Simulation ist alles verfügbar. 3. Ziehe auf dem Bildschirm, um das Ziel zu bewegen, und feuere mit der Aktionstaste. 4. Nacht- und Wärmeansicht sind Filtersimulationen, keine echte Sensorik. 5. Werbung ist in dieser Version simuliert. 6. Kameraverarbeitung bleibt auf dem Gerät. 7. Der Spielton ist immer aktiviert; stelle die Lautstärke mit den Gerätetasten ein.',
  fr: '1. Autorisez la caméra. 2. Choisissez un équipement dans le catalogue ; tout est disponible dans cette simulation. 3. Faites glisser le doigt sur l’écran pour déplacer le viseur et tirez avec le bouton d’action. 4. Les vues nocturne et thermique sont des filtres simulés, pas de vrais capteurs. 5. Les publicités sont simulées dans cette version. 6. Le traitement reste sur l’appareil. 7. Le son du jeu est toujours activé ; réglez son niveau avec les boutons de volume de l’appareil.',
  es: '1. Permite la cámara. 2. Elige equipo del catálogo; todo está disponible en esta simulación. 3. Arrastra el dedo por la pantalla para mover la mira y dispara con el botón de acción. 4. Las vistas nocturna y térmica son filtros simulados, no sensores reales. 5. Los anuncios de esta versión son simulados. 6. El procesamiento queda en el dispositivo. 7. El audio del juego siempre está activado; ajusta el nivel con los botones de volumen del dispositivo.',
  it: '1. Consenti la fotocamera. 2. Scegli l’equipaggiamento dal catalogo; tutto è disponibile in questa simulazione. 3. Trascina sullo schermo per muovere il mirino e spara con il pulsante azione. 4. Le viste notturna e termica sono filtri simulati, non sensori reali. 5. Gli annunci sono simulati in questa versione. 6. L’elaborazione resta sul dispositivo. 7. L’audio del gioco è sempre attivo; regolane il livello con i pulsanti volume del dispositivo.',
  pt: '1. Permita a câmera. 2. Escolha o equipamento no catálogo; tudo está disponível nesta simulação. 3. Arraste na tela para mover a mira e atire com o botão de ação. 4. As visões noturna e térmica são filtros simulados, não sensores reais. 5. Os anúncios desta versão são simulados. 6. O processamento fica no dispositivo. 7. O áudio do jogo está sempre ativado; ajuste o nível com os botões de volume do dispositivo.',
  ru: '1. Разрешите камеру. 2. Выберите снаряжение в каталоге; в симуляции доступно всё. 3. Перетаскивайте прицел по экрану и стреляйте кнопкой действия. 4. Ночное и тепловое зрение — фильтры, а не реальные датчики. 5. Реклама в этой версии симулируется. 6. Обработка камеры остаётся на устройстве. 7. Игровой звук всегда включён; регулируйте громкость кнопками устройства.',
  uk: '1. Дозвольте камеру. 2. Оберіть спорядження в каталозі; у симуляції доступне все. 3. Перетягуйте приціл екраном і стріляйте кнопкою дії. 4. Нічний і тепловий режими — фільтри, а не справжні датчики. 5. Реклама в цій версії симулюється. 6. Обробка камери залишається на пристрої. 7. Ігровий звук завжди ввімкнено; регулюйте гучність кнопками пристрою.',
  hi: '1. कैमरा अनुमति दें। 2. कैटलॉग से उपकरण चुनें; इस सिमुलेशन में सब उपलब्ध है। 3. निशाना घुमाने के लिए स्क्रीन पर उंगली खींचें और एक्शन बटन से फ़ायर करें। 4. नाइट और थर्मल दृश्य फ़िल्टर सिमुलेशन हैं, असली सेंसर नहीं। 5. इस बिल्ड के विज्ञापन सिमुलेशन हैं। 6. कैमरा प्रोसेसिंग डिवाइस पर रहती है। 7. गेम ऑडियो हमेशा चालू रहता है; डिवाइस के वॉल्यूम बटन से स्तर बदलें।',
  ur: '۱. کیمرے کی اجازت دیں۔ ۲. کیٹلاگ سے سامان منتخب کریں؛ اس سمیولیشن میں سب دستیاب ہے۔ ۳. نشانے کو حرکت دینے کے لیے اسکرین پر انگلی گھسیٹیں اور ایکشن بٹن سے فائر کریں۔ ۴. نائٹ اور تھرمل مناظر بصری فلٹرز کی سمیولیشن ہیں، حقیقی سینسر نہیں۔ ۵. اس ورژن کے اشتہارات سمیولیٹڈ ہیں۔ ۶. کیمرہ پراسیسنگ ڈیوائس پر رہتی ہے۔ ۷. گیم آڈیو ہمیشہ فعال ہے؛ ڈیوائس کے والیوم بٹن سے سطح بدلیں۔',
  bn: '১. ক্যামেরার অনুমতি দিন। ২. ক্যাটালগ থেকে সরঞ্জাম বেছে নিন; এই সিমুলেশনে সবই উপলব্ধ। ৩. নিশানা সরাতে স্ক্রিনে টেনে নিন এবং অ্যাকশন বোতাম দিয়ে গুলি করুন। ৪. নাইট ও থার্মাল দৃশ্য ভিজ্যুয়াল ফিল্টারের সিমুলেশন, আসল সেন্সর নয়। ৫. এই বিল্ডের বিজ্ঞাপন সিমুলেটেড। ৬. ক্যামেরা প্রসেসিং ডিভাইসেই থাকে। ৭. গেমের অডিও সবসময় চালু থাকে; ডিভাইসের ভলিউম বোতামে মাত্রা ঠিক করুন।',
  pa: '1. ਕੈਮਰੇ ਦੀ ਇਜਾਜ਼ਤ ਦਿਓ। 2. ਕੈਟਾਲਾਗ ਵਿੱਚੋਂ ਸਾਮਾਨ ਚੁਣੋ; ਇਸ ਸਿਮੂਲੇਸ਼ਨ ਵਿੱਚ ਸਭ ਕੁਝ ਉਪਲਬਧ ਹੈ। 3. ਨਿਸ਼ਾਨਾ ਹਿਲਾਉਣ ਲਈ ਸਕ੍ਰੀਨ ਉੱਤੇ ਉਂਗਲ ਖਿੱਚੋ ਅਤੇ ਐਕਸ਼ਨ ਬਟਨ ਨਾਲ ਫਾਇਰ ਕਰੋ। 4. ਨਾਈਟ ਅਤੇ ਥਰਮਲ ਦ੍ਰਿਸ਼ ਵਿਜ਼ੂਅਲ ਫਿਲਟਰਾਂ ਦੀ ਸਿਮੂਲੇਸ਼ਨ ਹਨ, ਅਸਲੀ ਸੈਂਸਰ ਨਹੀਂ। 5. ਇਸ ਬਿਲਡ ਦੇ ਇਸ਼ਤਿਹਾਰ ਸਿਮੂਲੇਸ਼ਨ ਹਨ। 6. ਕੈਮਰਾ ਪ੍ਰੋਸੈਸਿੰਗ ਡਿਵਾਈਸ ਉੱਤੇ ਰਹਿੰਦੀ ਹੈ। 7. ਗੇਮ ਆਡੀਓ ਹਮੇਸ਼ਾ ਚਾਲੂ ਹੈ; ਡਿਵਾਈਸ ਦੇ ਵਾਲਿਊਮ ਬਟਨਾਂ ਨਾਲ ਪੱਧਰ ਬਦਲੋ।',
  id: '1. Izinkan kamera. 2. Pilih perlengkapan dari katalog; semua tersedia dalam simulasi ini. 3. Seret di layar untuk menggerakkan bidikan dan gunakan tombol aksi untuk menembak. 4. Tampilan malam dan termal adalah simulasi filter visual, bukan sensor nyata. 5. Iklan dalam versi ini adalah simulasi. 6. Pemrosesan kamera tetap di perangkat. 7. Audio game selalu aktif; atur levelnya dengan tombol volume perangkat.',
  ko: '1. 카메라 권한을 허용하세요. 2. 카탈로그에서 장비를 선택하세요. 이 시뮬레이션에서는 모두 사용할 수 있습니다. 3. 화면을 드래그해 조준점을 움직이고 액션 버튼으로 발사하세요. 4. 야간 및 열화상 화면은 실제 센서가 아닌 시각 필터 시뮬레이션입니다. 5. 이 빌드의 광고는 시뮬레이션입니다. 6. 카메라 처리는 기기에 남습니다. 7. 게임 오디오는 항상 켜져 있습니다. 기기 볼륨 버튼으로 조절하세요.',
  vi: '1. Cho phép máy ảnh. 2. Chọn trang bị trong danh mục; mọi trang bị đều có trong mô phỏng này. 3. Kéo trên màn hình để di chuyển tâm ngắm và dùng nút hành động để bắn. 4. Chế độ nhìn đêm và nhiệt là mô phỏng bộ lọc hình ảnh, không phải cảm biến thật. 5. Quảng cáo trong bản này là mô phỏng. 6. Xử lý máy ảnh vẫn trên thiết bị. 7. Âm thanh trò chơi luôn bật; điều chỉnh bằng nút âm lượng của thiết bị.',
  th: '1. อนุญาตให้ใช้กล้อง 2. เลือกอุปกรณ์จากแค็ตตาล็อก ทุกอย่างพร้อมใช้ในโหมดจำลองนี้ 3. ลากบนหน้าจอเพื่อเล็ง และใช้ปุ่มแอ็กชันเพื่อยิง 4. มุมมองกลางคืนและความร้อนเป็นการจำลองฟิลเตอร์ภาพ ไม่ใช่เซ็นเซอร์จริง 5. โฆษณาในรุ่นนี้เป็นการจำลอง 6. การประมวลผลกล้องอยู่บนอุปกรณ์นี้ 7. เสียงเกมเปิดใช้งานเสมอ ปรับระดับด้วยปุ่มเสียงของอุปกรณ์',
  nl: '1. Geef cameratoegang. 2. Kies uitrusting uit de catalogus; alles is beschikbaar in deze simulatie. 3. Sleep over het scherm om het richtpunt te bewegen en schiet met de actieknop. 4. Nacht- en warmtebeeld zijn gesimuleerde filters, geen echte sensoren. 5. Reclame is in deze versie gesimuleerd. 6. Cameraverwerking blijft op het apparaat. 7. Spelaudio is altijd ingeschakeld; regel het volume met de volumeknoppen van je apparaat.',
  pl: '1. Zezwól na aparat. 2. Wybierz wyposażenie z katalogu; w tej symulacji wszystko jest dostępne. 3. Przeciągaj po ekranie, aby poruszać celownikiem, i strzelaj przyciskiem akcji. 4. Widok nocny i termiczny to symulowane filtry, nie prawdziwe sensory. 5. Reklamy w tej wersji są symulowane. 6. Przetwarzanie pozostaje na urządzeniu. 7. Dźwięk gry jest zawsze włączony; ustaw głośność przyciskami urządzenia.',
  sv: '1. Tillåt kamera. 2. Välj utrustning i katalogen; allt är tillgängligt i simuleringen. 3. Dra på skärmen för att flytta siktet och skjut med åtgärdsknappen. 4. Natt- och värmevy är simulerade filter, inte riktiga sensorer. 5. Reklam i denna version är simulerad. 6. Bearbetningen stannar på enheten. 7. Spelljudet är alltid aktiverat; justera nivån med enhetens volymknappar.',
  fa: '۱. اجازه دوربین بدهید. ۲. تجهیزات را از فهرست انتخاب کنید؛ همه در این شبیه‌سازی در دسترس‌اند. ۳. برای حرکت نشانه‌گیر روی صفحه بکشید و با دکمه عملیات شلیک کنید. ۴. دید شب و حرارتی فیلترهای بصری شبیه‌سازی‌شده‌اند، نه حسگر واقعی. ۵. تبلیغ‌ها در این نسخه شبیه‌سازی هستند. ۶. پردازش دوربین روی دستگاه می‌ماند. ۷. صدای بازی همیشه فعال است؛ سطح آن را با دکمه‌های صدای دستگاه تنظیم کنید.',
};

const SOUND_TEST_COPY: Record<Locale, string> = {
  tr: 'SESİ DENE', en: 'TEST SOUND', zh: '测试声音', ja: '音声をテスト', ar: 'اختبار الصوت',
  de: 'TON TESTEN', fr: 'TESTER LE SON', es: 'PROBAR SONIDO', it: 'PROVA AUDIO', pt: 'TESTAR SOM',
  ru: 'ПРОВЕРИТЬ ЗВУК', uk: 'ПЕРЕВІРИТИ ЗВУК', hi: 'ध्वनि जाँचें', ur: 'آواز آزمائیں', bn: 'শব্দ পরীক্ষা',
  pa: 'ਆਵਾਜ਼ ਜਾਂਚੋ', id: 'UJI SUARA', ko: '소리 테스트', vi: 'KIỂM TRA ÂM THANH', th: 'ทดสอบเสียง',
  nl: 'GELUID TESTEN', pl: 'TEST DŹWIĘKU', sv: 'TESTA LJUD', fa: 'آزمایش صدا',
};

/**
 * Commerce copy is kept as an explicit, translated extension to the existing
 * catalogue.  It is merged into every locale before any screen can call
 * translate(), so no locale silently falls back to English or Turkish.
 */
const COMMERCE_COPY: Record<Locale, Record<CommerceTranslationKey, string>> = {
  tr: {
    simulationBadge: 'SİMÜLASYON',
    noRealCharge: 'Gerçek ücret yok · kart veya ödeme API’si kullanılmaz.',
    simulatePurchase: 'SATIN ALMAYI SİMÜLE ET',
    confirmSimulation: 'SİMÜLE EDİLMİŞ SATIN ALMAYI ONAYLA',
    cancelSimulation: 'VIP SİMÜLASYONUNU İPTAL ET',
    resetSimulation: 'SİMÜLASYONU SIFIRLA',
    restoreSimulation: 'KAYITLI SİMÜLASYONU GERİ YÜKLE',
    gold: 'VIP',
    goldPlan: 'VIP · tüm Pro erişimi',
    goldPrice: '$9.99 / takvim ayı',
    goldDuration: 'Bir takvim aylık simüle erişim',
    goldBenefits: 'Tüm Pro ekipmanları · reklamsız · cephane, bıçak, yenileme ve görüş ücretleri yok',
    goldActive: 'VIP AKTİF',
    goldExpires: 'Bitiş',
    adFree: 'Reklamsız erişim',
    allProAccess: 'Tüm Pro erişimi',
    creditsPurchaseConfirm: 'Bu paket yalnızca simülasyonda kredi ekler. Gerçek ücret alınmaz.',
    creditsAdded: 'Simülasyonda kredi eklendi.',
    goldCancelled: 'VIP simülasyonu iptal edildi.',
    simulationReset: 'VIP ve simülasyon işlem kayıtları sıfırlandı.',
  },
  en: {
    simulationBadge: 'SIMULATION',
    noRealCharge: 'No real charge · no card or payment API is used.',
    simulatePurchase: 'SIMULATE PURCHASE',
    confirmSimulation: 'CONFIRM SIMULATED PURCHASE',
    cancelSimulation: 'CANCEL VIP SIMULATION',
    resetSimulation: 'RESET SIMULATION',
    restoreSimulation: 'RESTORE SAVED SIMULATION',
    gold: 'VIP',
    goldPlan: 'VIP · all Pro access',
    goldPrice: '$9.99 / calendar month',
    goldDuration: 'One calendar month of simulated access',
    goldBenefits: 'All Pro equipment · ad-free · no ammo, knife, refill, or vision charges',
    goldActive: 'VIP ACTIVE',
    goldExpires: 'Expires',
    adFree: 'Ad-free access',
    allProAccess: 'All Pro access',
    creditsPurchaseConfirm: 'This package adds credits only in the simulator. No real charge is made.',
    creditsAdded: 'Credits added in simulation.',
    goldCancelled: 'VIP simulation cancelled.',
    simulationReset: 'VIP and simulation transaction records were reset.',
  },
  zh: {
    simulationBadge: '模拟',
    noRealCharge: '不会真实扣款 · 不使用银行卡或支付 API。',
    simulatePurchase: '模拟购买',
    confirmSimulation: '确认模拟购买',
    cancelSimulation: '取消 VIP 模拟',
    resetSimulation: '重置模拟',
    restoreSimulation: '恢复已保存的模拟',
    gold: 'VIP',
    goldPlan: 'VIP · 全部 Pro 权限',
    goldPrice: '$9.99 / 日历月',
    goldDuration: '模拟使用一个日历月',
    goldBenefits: '全部 Pro 装备 · 无广告 · 弹药、飞刀、补给和视野不收费',
    goldActive: 'VIP 已激活',
    goldExpires: '到期',
    adFree: '无广告访问',
    allProAccess: '全部 Pro 权限',
    creditsPurchaseConfirm: '此礼包只会在模拟器中添加积分，不会真实扣款。',
    creditsAdded: '模拟积分已添加。',
    goldCancelled: 'VIP 模拟已取消。',
    simulationReset: 'VIP 和模拟交易记录已重置。',
  },
  ja: {
    simulationBadge: 'シミュレーション',
    noRealCharge: '実際の請求なし · カードや決済 API は使用しません。',
    simulatePurchase: '購入をシミュレート',
    confirmSimulation: 'シミュレーション購入を確認',
    cancelSimulation: 'VIP シミュレーションをキャンセル',
    resetSimulation: 'シミュレーションをリセット',
    restoreSimulation: '保存済みシミュレーションを復元',
    gold: 'VIP',
    goldPlan: 'VIP · すべての Pro アクセス',
    goldPrice: '$9.99 / 暦月',
    goldDuration: '暦月 1 か月のシミュレーション',
    goldBenefits: '全 Pro 装備 · 広告なし · 弾薬、ナイフ、補給、視界が無料',
    goldActive: 'VIP 有効',
    goldExpires: '期限',
    adFree: '広告なし',
    allProAccess: '全 Pro アクセス',
    creditsPurchaseConfirm: 'このパックはシミュレーター内だけでクレジットを追加します。請求はありません。',
    creditsAdded: 'シミュレーションでクレジットを追加しました。',
    goldCancelled: 'VIP シミュレーションをキャンセルしました。',
    simulationReset: 'VIP とシミュレーション取引記録をリセットしました。',
  },
  ar: {
    simulationBadge: 'محاكاة',
    noRealCharge: 'لا توجد رسوم حقيقية · لا تُستخدم بطاقة أو واجهة دفع.',
    simulatePurchase: 'محاكاة الشراء',
    confirmSimulation: 'تأكيد الشراء المحاكى',
    cancelSimulation: 'إلغاء محاكاة VIP',
    resetSimulation: 'إعادة ضبط المحاكاة',
    restoreSimulation: 'استعادة المحاكاة المحفوظة',
    gold: 'VIP',
    goldPlan: 'VIP · وصول Pro كامل',
    goldPrice: '$9.99 / شهر تقويمي',
    goldDuration: 'وصول محاكى لمدة شهر تقويمي واحد',
    goldBenefits: 'كل معدات Pro · بلا إعلانات · بلا رسوم للذخيرة والسكين والتعبئة والرؤية',
    goldActive: 'VIP نشط',
    goldExpires: 'ينتهي',
    adFree: 'وصول بلا إعلانات',
    allProAccess: 'وصول Pro كامل',
    creditsPurchaseConfirm: 'تضيف هذه الحزمة أرصدة داخل المحاكي فقط. لا يتم تحصيل أي مبلغ حقيقي.',
    creditsAdded: 'أُضيفت الأرصدة في المحاكاة.',
    goldCancelled: 'أُلغيت محاكاة VIP.',
    simulationReset: 'تمت إعادة ضبط VIP وسجلات معاملات المحاكاة.',
  },
  de: {
    simulationBadge: 'SIMULATION',
    noRealCharge: 'Keine echte Abbuchung · keine Karte oder Zahlungs-API.',
    simulatePurchase: 'KAUF SIMULIEREN',
    confirmSimulation: 'SIMULIERTEN KAUF BESTÄTIGEN',
    cancelSimulation: 'VIP-SIMULATION ABBRECHEN',
    resetSimulation: 'SIMULATION ZURÜCKSETZEN',
    restoreSimulation: 'GESPEICHERTE SIMULATION LADEN',
    gold: 'VIP',
    goldPlan: 'VIP · voller Pro-Zugriff',
    goldPrice: '$9.99 / Kalendermonat',
    goldDuration: 'Simulierter Zugriff für einen Kalendermonat',
    goldBenefits: 'Alle Pro-Ausrüstungen · werbefrei · keine Kosten für Munition, Messer, Nachladen oder Sicht',
    goldActive: 'VIP AKTIV',
    goldExpires: 'Läuft ab',
    adFree: 'Werbefreier Zugriff',
    allProAccess: 'Voller Pro-Zugriff',
    creditsPurchaseConfirm: 'Dieses Paket fügt nur in der Simulation Guthaben hinzu. Es wird nichts berechnet.',
    creditsAdded: 'Guthaben in der Simulation hinzugefügt.',
    goldCancelled: 'VIP-Simulation abgebrochen.',
    simulationReset: 'VIP und Simulations-Transaktionsdaten zurückgesetzt.',
  },
  fr: {
    simulationBadge: 'SIMULATION',
    noRealCharge: 'Aucun débit réel · aucune carte ni API de paiement.',
    simulatePurchase: 'SIMULER L’ACHAT',
    confirmSimulation: 'CONFIRMER L’ACHAT SIMULÉ',
    cancelSimulation: 'ANNULER LA SIMULATION VIP',
    resetSimulation: 'RÉINITIALISER LA SIMULATION',
    restoreSimulation: 'RESTAURER LA SIMULATION ENREGISTRÉE',
    gold: 'VIP',
    goldPlan: 'VIP · accès Pro complet',
    goldPrice: '$9.99 / mois civil',
    goldDuration: 'Accès simulé pendant un mois civil',
    goldBenefits: 'Tout l’équipement Pro · sans publicité · munitions, couteau, recharge et vision gratuits',
    goldActive: 'VIP ACTIF',
    goldExpires: 'Expire',
    adFree: 'Accès sans publicité',
    allProAccess: 'Accès Pro complet',
    creditsPurchaseConfirm: 'Ce pack ajoute des crédits dans le simulateur uniquement. Aucun débit réel.',
    creditsAdded: 'Crédits ajoutés dans la simulation.',
    goldCancelled: 'Simulation VIP annulée.',
    simulationReset: 'VIP et transactions simulées réinitialisés.',
  },
  es: {
    simulationBadge: 'SIMULACIÓN',
    noRealCharge: 'Sin cobro real · no se usa tarjeta ni API de pagos.',
    simulatePurchase: 'SIMULAR COMPRA',
    confirmSimulation: 'CONFIRMAR COMPRA SIMULADA',
    cancelSimulation: 'CANCELAR SIMULACIÓN VIP',
    resetSimulation: 'RESTABLECER SIMULACIÓN',
    restoreSimulation: 'RESTAURAR SIMULACIÓN GUARDADA',
    gold: 'VIP',
    goldPlan: 'VIP · acceso Pro completo',
    goldPrice: '$9.99 / mes natural',
    goldDuration: 'Acceso simulado durante un mes natural',
    goldBenefits: 'Todo el equipo Pro · sin anuncios · sin coste de munición, cuchillo, recarga ni visión',
    goldActive: 'VIP ACTIVO',
    goldExpires: 'Caduca',
    adFree: 'Acceso sin anuncios',
    allProAccess: 'Acceso Pro completo',
    creditsPurchaseConfirm: 'Este paquete solo añade créditos en el simulador. No se realiza ningún cobro real.',
    creditsAdded: 'Créditos añadidos en la simulación.',
    goldCancelled: 'Simulación VIP cancelada.',
    simulationReset: 'VIP y transacciones de simulación restablecidos.',
  },
  it: {
    simulationBadge: 'SIMULAZIONE',
    noRealCharge: 'Nessun addebito reale · nessuna carta o API di pagamento.',
    simulatePurchase: 'SIMULA ACQUISTO',
    confirmSimulation: 'CONFERMA ACQUISTO SIMULATO',
    cancelSimulation: 'ANNULLA SIMULAZIONE VIP',
    resetSimulation: 'REIMPOSTA SIMULAZIONE',
    restoreSimulation: 'RIPRISTINA SIMULAZIONE SALVATA',
    gold: 'VIP',
    goldPlan: 'VIP · accesso Pro completo',
    goldPrice: '$9.99 / mese solare',
    goldDuration: 'Accesso simulato per un mese solare',
    goldBenefits: 'Tutto l’equipaggiamento Pro · senza pubblicità · munizioni, coltello, ricarica e visione senza costi',
    goldActive: 'VIP ATTIVO',
    goldExpires: 'Scade',
    adFree: 'Accesso senza pubblicità',
    allProAccess: 'Accesso Pro completo',
    creditsPurchaseConfirm: 'Questo pacchetto aggiunge crediti solo nel simulatore. Nessun addebito reale.',
    creditsAdded: 'Crediti aggiunti nella simulazione.',
    goldCancelled: 'Simulazione VIP annullata.',
    simulationReset: 'VIP e transazioni simulate reimpostati.',
  },
  pt: {
    simulationBadge: 'SIMULAÇÃO',
    noRealCharge: 'Sem cobrança real · nenhum cartão ou API de pagamento.',
    simulatePurchase: 'SIMULAR COMPRA',
    confirmSimulation: 'CONFIRMAR COMPRA SIMULADA',
    cancelSimulation: 'CANCELAR SIMULAÇÃO VIP',
    resetSimulation: 'REDEFINIR SIMULAÇÃO',
    restoreSimulation: 'RESTAURAR SIMULAÇÃO SALVA',
    gold: 'VIP',
    goldPlan: 'VIP · acesso Pro completo',
    goldPrice: '$9.99 / mês civil',
    goldDuration: 'Acesso simulado por um mês civil',
    goldBenefits: 'Todo o equipamento Pro · sem anúncios · sem custo de munição, faca, recarga ou visão',
    goldActive: 'VIP ATIVO',
    goldExpires: 'Expira',
    adFree: 'Acesso sem anúncios',
    allProAccess: 'Acesso Pro completo',
    creditsPurchaseConfirm: 'Este pacote adiciona créditos apenas no simulador. Nenhuma cobrança real é feita.',
    creditsAdded: 'Créditos adicionados na simulação.',
    goldCancelled: 'Simulação VIP cancelada.',
    simulationReset: 'VIP e transações simuladas redefinidos.',
  },
  ru: {
    simulationBadge: 'СИМУЛЯЦИЯ',
    noRealCharge: 'Реального списания нет · карта и платёжный API не используются.',
    simulatePurchase: 'СИМУЛИРОВАТЬ ПОКУПКУ',
    confirmSimulation: 'ПОДТВЕРДИТЬ СИМУЛЯЦИЮ ПОКУПКИ',
    cancelSimulation: 'ОТМЕНИТЬ СИМУЛЯЦИЮ VIP',
    resetSimulation: 'СБРОСИТЬ СИМУЛЯЦИЮ',
    restoreSimulation: 'ВОССТАНОВИТЬ СОХРАНЁННУЮ СИМУЛЯЦИЮ',
    gold: 'VIP',
    goldPlan: 'VIP · полный доступ Pro',
    goldPrice: '$9.99 / календарный месяц',
    goldDuration: 'Симулированный доступ на один календарный месяц',
    goldBenefits: 'Всё снаряжение Pro · без рекламы · без платы за боеприпасы, нож, пополнение и обзор',
    goldActive: 'VIP АКТИВЕН',
    goldExpires: 'Истекает',
    adFree: 'Доступ без рекламы',
    allProAccess: 'Полный доступ Pro',
    creditsPurchaseConfirm: 'Пакет добавляет кредиты только в симуляторе. Реального списания нет.',
    creditsAdded: 'Кредиты добавлены в симуляции.',
    goldCancelled: 'Симуляция VIP отменена.',
    simulationReset: 'VIP и записи симулированных операций сброшены.',
  },
  uk: {
    simulationBadge: 'СИМУЛЯЦІЯ',
    noRealCharge: 'Реального списання немає · картка й платіжний API не використовуються.',
    simulatePurchase: 'СИМУЛЮВАТИ ПОКУПІВЛЮ',
    confirmSimulation: 'ПІДТВЕРДИТИ СИМУЛЬОВАНУ ПОКУПІВЛЮ',
    cancelSimulation: 'СКАСУВАТИ СИМУЛЯЦІЮ VIP',
    resetSimulation: 'СКИНУТИ СИМУЛЯЦІЮ',
    restoreSimulation: 'ВІДНОВИТИ ЗБЕРЕЖЕНУ СИМУЛЯЦІЮ',
    gold: 'VIP',
    goldPlan: 'VIP · повний доступ Pro',
    goldPrice: '$9.99 / календарний місяць',
    goldDuration: 'Один календарний місяць симульованого доступу',
    goldBenefits: 'Усе спорядження Pro · без реклами · без плати за боєприпаси, ніж, поповнення й огляд',
    goldActive: 'VIP АКТИВНИЙ',
    goldExpires: 'Завершується',
    adFree: 'Доступ без реклами',
    allProAccess: 'Повний доступ Pro',
    creditsPurchaseConfirm: 'Пакет додає кредити лише в симуляторі. Реального списання немає.',
    creditsAdded: 'Кредити додано в симуляції.',
    goldCancelled: 'Симуляцію VIP скасовано.',
    simulationReset: 'VIP і записи симульованих операцій скинуто.',
  },
  hi: {
    simulationBadge: 'सिमुलेशन',
    noRealCharge: 'कोई वास्तविक शुल्क नहीं · कार्ड या भुगतान API उपयोग नहीं होता।',
    simulatePurchase: 'खरीद का सिमुलेशन करें',
    confirmSimulation: 'सिम्युलेटेड खरीद की पुष्टि करें',
    cancelSimulation: 'VIP सिमुलेशन रद्द करें',
    resetSimulation: 'सिमुलेशन रीसेट करें',
    restoreSimulation: 'सहेजा हुआ सिमुलेशन पुनर्स्थापित करें',
    gold: 'VIP',
    goldPlan: 'VIP · पूरा Pro एक्सेस',
    goldPrice: '$9.99 / कैलेंडर माह',
    goldDuration: 'एक कैलेंडर माह का सिम्युलेटेड एक्सेस',
    goldBenefits: 'सभी Pro उपकरण · विज्ञापन-मुक्त · बारूद, चाकू, रीफिल और विज़न शुल्क-मुक्त',
    goldActive: 'VIP सक्रिय',
    goldExpires: 'समाप्ति',
    adFree: 'विज्ञापन-मुक्त एक्सेस',
    allProAccess: 'पूरा Pro एक्सेस',
    creditsPurchaseConfirm: 'यह पैक केवल सिमुलेटर में क्रेडिट जोड़ता है। कोई वास्तविक शुल्क नहीं लगेगा।',
    creditsAdded: 'सिमुलेशन में क्रेडिट जोड़े गए।',
    goldCancelled: 'VIP सिमुलेशन रद्द किया गया।',
    simulationReset: 'VIP और सिमुलेशन लेन-देन रिकॉर्ड रीसेट किए गए।',
  },
  ur: {
    simulationBadge: 'سمولیشن',
    noRealCharge: 'حقیقی چارج نہیں · کارڈ یا ادائیگی API استعمال نہیں ہوتی۔',
    simulatePurchase: 'خریداری سمولیٹ کریں',
    confirmSimulation: 'سمولیٹ شدہ خریداری کی تصدیق',
    cancelSimulation: 'VIP سمولیشن منسوخ کریں',
    resetSimulation: 'سمولیشن ری سیٹ کریں',
    restoreSimulation: 'محفوظ سمولیشن بحال کریں',
    gold: 'VIP',
    goldPlan: 'VIP · مکمل Pro رسائی',
    goldPrice: '$9.99 / کیلنڈر ماہ',
    goldDuration: 'ایک کیلنڈر ماہ کی سمولیٹ شدہ رسائی',
    goldBenefits: 'تمام Pro سازوسامان · اشتہار سے پاک · گولہ بارود، چاقو، ری فل اور وژن بلا معاوضہ',
    goldActive: 'VIP فعال',
    goldExpires: 'اختتام',
    adFree: 'اشتہار سے پاک رسائی',
    allProAccess: 'مکمل Pro رسائی',
    creditsPurchaseConfirm: 'یہ پیک صرف سمولیٹر میں کریڈٹ شامل کرتا ہے۔ کوئی حقیقی چارج نہیں ہوگا۔',
    creditsAdded: 'سمولیشن میں کریڈٹ شامل کیے گئے۔',
    goldCancelled: 'VIP سمولیشن منسوخ کر دی گئی۔',
    simulationReset: 'VIP اور سمولیشن لین دین کے ریکارڈ ری سیٹ کر دیے گئے۔',
  },
  bn: {
    simulationBadge: 'সিমুলেশন',
    noRealCharge: 'কোনও আসল চার্জ নেই · কার্ড বা পেমেন্ট API ব্যবহার হয় না।',
    simulatePurchase: 'কেনাকাটা সিমুলেট করুন',
    confirmSimulation: 'সিমুলেটেড কেনাকাটা নিশ্চিত করুন',
    cancelSimulation: 'VIP সিমুলেশন বাতিল করুন',
    resetSimulation: 'সিমুলেশন রিসেট করুন',
    restoreSimulation: 'সংরক্ষিত সিমুলেশন পুনরুদ্ধার করুন',
    gold: 'VIP',
    goldPlan: 'VIP · সম্পূর্ণ Pro অ্যাক্সেস',
    goldPrice: '$9.99 / ক্যালেন্ডার মাস',
    goldDuration: 'এক ক্যালেন্ডার মাসের সিমুলেটেড অ্যাক্সেস',
    goldBenefits: 'সব Pro সরঞ্জাম · বিজ্ঞাপনমুক্ত · গোলাবারুদ, ছুরি, রিফিল ও ভিশনে কোনও চার্জ নেই',
    goldActive: 'VIP সক্রিয়',
    goldExpires: 'মেয়াদ শেষ',
    adFree: 'বিজ্ঞাপনমুক্ত অ্যাক্সেস',
    allProAccess: 'সম্পূর্ণ Pro অ্যাক্সেস',
    creditsPurchaseConfirm: 'এই প্যাকটি শুধু সিমুলেটরে ক্রেডিট যোগ করে। কোনও আসল চার্জ হবে না।',
    creditsAdded: 'সিমুলেশনে ক্রেডিট যোগ হয়েছে।',
    goldCancelled: 'VIP সিমুলেশন বাতিল করা হয়েছে।',
    simulationReset: 'VIP এবং সিমুলেশন লেনদেন রেকর্ড রিসেট করা হয়েছে।',
  },
  pa: {
    simulationBadge: 'ਸਿਮੂਲੇਸ਼ਨ',
    noRealCharge: 'ਅਸਲ ਚਾਰਜ ਨਹੀਂ · ਕਾਰਡ ਜਾਂ ਭੁਗਤਾਨ API ਨਹੀਂ ਵਰਤੀ ਜਾਂਦੀ।',
    simulatePurchase: 'ਖਰੀਦ ਸਿਮੂਲੇਟ ਕਰੋ',
    confirmSimulation: 'ਸਿਮੂਲੇਟ ਕੀਤੀ ਖਰੀਦ ਦੀ ਪੁਸ਼ਟੀ ਕਰੋ',
    cancelSimulation: 'VIP ਸਿਮੂਲੇਸ਼ਨ ਰੱਦ ਕਰੋ',
    resetSimulation: 'ਸਿਮੂਲੇਸ਼ਨ ਰੀਸੈਟ ਕਰੋ',
    restoreSimulation: 'ਸੰਭਾਲੀ ਸਿਮੂਲੇਸ਼ਨ ਬਹਾਲ ਕਰੋ',
    gold: 'VIP',
    goldPlan: 'VIP · ਪੂਰੀ Pro ਪਹੁੰਚ',
    goldPrice: '$9.99 / ਕੈਲੰਡਰ ਮਹੀਨਾ',
    goldDuration: 'ਇੱਕ ਕੈਲੰਡਰ ਮਹੀਨੇ ਦੀ ਸਿਮੂਲੇਟ ਕੀਤੀ ਪਹੁੰਚ',
    goldBenefits: 'ਸਾਰਾ Pro ਸਾਮਾਨ · ਵਿਗਿਆਪਨ ਰਹਿਤ · ਗੋਲਾ-ਬਾਰੂਦ, ਚਾਕੂ, ਰੀਫਿਲ ਅਤੇ ਵਿਜ਼ਨ ਲਈ ਕੋਈ ਚਾਰਜ ਨਹੀਂ',
    goldActive: 'VIP ਸਰਗਰਮ',
    goldExpires: 'ਮਿਆਦ',
    adFree: 'ਵਿਗਿਆਪਨ ਰਹਿਤ ਪਹੁੰਚ',
    allProAccess: 'ਪੂਰੀ Pro ਪਹੁੰਚ',
    creditsPurchaseConfirm: 'ਇਹ ਪੈਕ ਸਿਰਫ਼ ਸਿਮੂਲੇਟਰ ਵਿੱਚ ਕ੍ਰੈਡਿਟ ਜੋੜਦਾ ਹੈ। ਕੋਈ ਅਸਲ ਚਾਰਜ ਨਹੀਂ।',
    creditsAdded: 'ਸਿਮੂਲੇਸ਼ਨ ਵਿੱਚ ਕ੍ਰੈਡਿਟ ਜੋੜੇ ਗਏ।',
    goldCancelled: 'VIP ਸਿਮੂਲੇਸ਼ਨ ਰੱਦ ਕੀਤੀ।',
    simulationReset: 'VIP ਅਤੇ ਸਿਮੂਲੇਸ਼ਨ ਲੈਣ-ਦੇਣ ਰਿਕਾਰਡ ਰੀਸੈਟ ਕੀਤੇ।',
  },
  id: {
    simulationBadge: 'SIMULASI',
    noRealCharge: 'Tanpa biaya nyata · tidak ada kartu atau API pembayaran.',
    simulatePurchase: 'SIMULASIKAN PEMBELIAN',
    confirmSimulation: 'KONFIRMASI PEMBELIAN SIMULASI',
    cancelSimulation: 'BATALKAN SIMULASI VIP',
    resetSimulation: 'RESET SIMULASI',
    restoreSimulation: 'PULIHKAN SIMULASI TERSIMPAN',
    gold: 'VIP',
    goldPlan: 'VIP · akses Pro lengkap',
    goldPrice: '$9.99 / bulan kalender',
    goldDuration: 'Akses simulasi selama satu bulan kalender',
    goldBenefits: 'Semua perlengkapan Pro · bebas iklan · tanpa biaya amunisi, pisau, isi ulang, atau visi',
    goldActive: 'VIP AKTIF',
    goldExpires: 'Berakhir',
    adFree: 'Akses bebas iklan',
    allProAccess: 'Akses Pro lengkap',
    creditsPurchaseConfirm: 'Paket ini hanya menambah kredit di simulator. Tidak ada biaya nyata.',
    creditsAdded: 'Kredit ditambahkan dalam simulasi.',
    goldCancelled: 'Simulasi VIP dibatalkan.',
    simulationReset: 'VIP dan catatan transaksi simulasi direset.',
  },
  ko: {
    simulationBadge: '시뮬레이션',
    noRealCharge: '실제 청구 없음 · 카드나 결제 API를 사용하지 않습니다.',
    simulatePurchase: '구매 시뮬레이션',
    confirmSimulation: '시뮬레이션 구매 확인',
    cancelSimulation: 'VIP 시뮬레이션 취소',
    resetSimulation: '시뮬레이션 초기화',
    restoreSimulation: '저장된 시뮬레이션 복원',
    gold: 'VIP',
    goldPlan: 'VIP · 전체 Pro 이용',
    goldPrice: '$9.99 / 달력 기준 한 달',
    goldDuration: '달력 기준 한 달 동안 시뮬레이션 이용',
    goldBenefits: '모든 Pro 장비 · 광고 없음 · 탄약, 칼, 보급, 시야 비용 없음',
    goldActive: 'VIP 활성',
    goldExpires: '만료',
    adFree: '광고 없는 이용',
    allProAccess: '전체 Pro 이용',
    creditsPurchaseConfirm: '이 패키지는 시뮬레이터에만 크레딧을 추가합니다. 실제 청구는 없습니다.',
    creditsAdded: '시뮬레이션에 크레딧이 추가되었습니다.',
    goldCancelled: 'VIP 시뮬레이션이 취소되었습니다.',
    simulationReset: 'VIP 및 시뮬레이션 거래 기록이 초기화되었습니다.',
  },
  vi: {
    simulationBadge: 'MÔ PHỎNG',
    noRealCharge: 'Không tính phí thật · không dùng thẻ hay API thanh toán.',
    simulatePurchase: 'MÔ PHỎNG MUA HÀNG',
    confirmSimulation: 'XÁC NHẬN MUA MÔ PHỎNG',
    cancelSimulation: 'HỦY MÔ PHỎNG VIP',
    resetSimulation: 'ĐẶT LẠI MÔ PHỎNG',
    restoreSimulation: 'KHÔI PHỤC MÔ PHỎNG ĐÃ LƯU',
    gold: 'VIP',
    goldPlan: 'VIP · toàn quyền Pro',
    goldPrice: '$9.99 / tháng theo lịch',
    goldDuration: 'Quyền truy cập mô phỏng trong một tháng theo lịch',
    goldBenefits: 'Toàn bộ trang bị Pro · không quảng cáo · miễn phí đạn, dao, nạp và tầm nhìn',
    goldActive: 'VIP ĐANG BẬT',
    goldExpires: 'Hết hạn',
    adFree: 'Không quảng cáo',
    allProAccess: 'Toàn quyền Pro',
    creditsPurchaseConfirm: 'Gói này chỉ thêm tín dụng trong trình mô phỏng. Không tính phí thật.',
    creditsAdded: 'Đã thêm tín dụng trong mô phỏng.',
    goldCancelled: 'Đã hủy mô phỏng VIP.',
    simulationReset: 'Đã đặt lại VIP và giao dịch mô phỏng.',
  },
  th: {
    simulationBadge: 'จำลอง',
    noRealCharge: 'ไม่มีการเรียกเก็บเงินจริง · ไม่ใช้บัตรหรือ API การชำระเงิน',
    simulatePurchase: 'จำลองการซื้อ',
    confirmSimulation: 'ยืนยันการซื้อจำลอง',
    cancelSimulation: 'ยกเลิกการจำลอง VIP',
    resetSimulation: 'รีเซ็ตการจำลอง',
    restoreSimulation: 'กู้คืนการจำลองที่บันทึกไว้',
    gold: 'VIP',
    goldPlan: 'VIP · เข้าถึง Pro ทั้งหมด',
    goldPrice: '$9.99 / เดือนปฏิทิน',
    goldDuration: 'สิทธิ์จำลองหนึ่งเดือนปฏิทิน',
    goldBenefits: 'อุปกรณ์ Pro ทั้งหมด · ไม่มีโฆษณา · ไม่คิดค่ากระสุน มีด เติมกระสุน หรือวิสัยทัศน์',
    goldActive: 'VIP ใช้งานอยู่',
    goldExpires: 'หมดอายุ',
    adFree: 'ไม่มีโฆษณา',
    allProAccess: 'เข้าถึง Pro ทั้งหมด',
    creditsPurchaseConfirm: 'แพ็กนี้เพิ่มเครดิตในตัวจำลองเท่านั้น ไม่มีการเรียกเก็บเงินจริง',
    creditsAdded: 'เพิ่มเครดิตในการจำลองแล้ว',
    goldCancelled: 'ยกเลิกการจำลอง VIP แล้ว',
    simulationReset: 'รีเซ็ต VIP และรายการธุรกรรมจำลองแล้ว',
  },
  nl: {
    simulationBadge: 'SIMULATIE',
    noRealCharge: 'Geen echte afschrijving · geen kaart of betaal-API.',
    simulatePurchase: 'AANKOOP SIMULEREN',
    confirmSimulation: 'GESIMULEERDE AANKOOP BEVESTIGEN',
    cancelSimulation: 'VIP-SIMULATIE ANNULEREN',
    resetSimulation: 'SIMULATIE RESETTEN',
    restoreSimulation: 'OPGESLAGEN SIMULATIE HERSTELLEN',
    gold: 'VIP',
    goldPlan: 'VIP · volledige Pro-toegang',
    goldPrice: '$9.99 / kalendermaand',
    goldDuration: 'Een kalendermaand gesimuleerde toegang',
    goldBenefits: 'Alle Pro-uitrusting · advertentievrij · geen kosten voor munitie, mes, bijvullen of zicht',
    goldActive: 'VIP ACTIEF',
    goldExpires: 'Verloopt',
    adFree: 'Advertentievrije toegang',
    allProAccess: 'Volledige Pro-toegang',
    creditsPurchaseConfirm: 'Dit pakket voegt alleen credits in de simulator toe. Er wordt niets afgeschreven.',
    creditsAdded: 'Credits toegevoegd in de simulatie.',
    goldCancelled: 'VIP-simulatie geannuleerd.',
    simulationReset: 'VIP en gesimuleerde transacties gereset.',
  },
  pl: {
    simulationBadge: 'SYMULACJA',
    noRealCharge: 'Brak prawdziwej opłaty · bez karty i API płatności.',
    simulatePurchase: 'SYMULUJ ZAKUP',
    confirmSimulation: 'POTWIERDŹ SYMULOWANY ZAKUP',
    cancelSimulation: 'ANULUJ SYMULACJĘ VIP',
    resetSimulation: 'ZRESETUJ SYMULACJĘ',
    restoreSimulation: 'PRZYWRÓĆ ZAPISANĄ SYMULACJĘ',
    gold: 'VIP',
    goldPlan: 'VIP · pełny dostęp Pro',
    goldPrice: '$9.99 / miesiąc kalendarzowy',
    goldDuration: 'Miesiąc kalendarzowy symulowanego dostępu',
    goldBenefits: 'Cały sprzęt Pro · bez reklam · bez opłat za amunicję, nóż, uzupełnianie i widzenie',
    goldActive: 'VIP AKTYWNY',
    goldExpires: 'Wygasa',
    adFree: 'Dostęp bez reklam',
    allProAccess: 'Pełny dostęp Pro',
    creditsPurchaseConfirm: 'Ten pakiet dodaje kredyty tylko w symulatorze. Nie ma prawdziwej opłaty.',
    creditsAdded: 'Kredyty dodano w symulacji.',
    goldCancelled: 'Anulowano symulację VIP.',
    simulationReset: 'Zresetowano VIP i transakcje symulacji.',
  },
  sv: {
    simulationBadge: 'SIMULERING',
    noRealCharge: 'Ingen riktig debitering · inget kort eller betalnings-API.',
    simulatePurchase: 'SIMULERA KÖP',
    confirmSimulation: 'BEKRÄFTA SIMULERAT KÖP',
    cancelSimulation: 'AVBRYT VIP-SIMULERING',
    resetSimulation: 'ÅTERSTÄLL SIMULERING',
    restoreSimulation: 'ÅTERSTÄLL SPARAD SIMULERING',
    gold: 'VIP',
    goldPlan: 'VIP · full Pro-åtkomst',
    goldPrice: '$9.99 / kalendermånad',
    goldDuration: 'En kalendermånads simulerade åtkomst',
    goldBenefits: 'All Pro-utrustning · reklamfritt · ingen kostnad för ammunition, kniv, påfyllning eller syn',
    goldActive: 'VIP AKTIVT',
    goldExpires: 'Går ut',
    adFree: 'Reklamfri åtkomst',
    allProAccess: 'Full Pro-åtkomst',
    creditsPurchaseConfirm: 'Paketet lägger bara till krediter i simulatorn. Ingen riktig debitering sker.',
    creditsAdded: 'Krediter tillagda i simuleringen.',
    goldCancelled: 'VIP-simuleringen avbröts.',
    simulationReset: 'VIP och simulerade transaktioner återställdes.',
  },
  fa: {
    simulationBadge: 'شبیه‌سازی',
    noRealCharge: 'بدون هزینه واقعی · کارت یا API پرداخت استفاده نمی‌شود.',
    simulatePurchase: 'شبیه‌سازی خرید',
    confirmSimulation: 'تأیید خرید شبیه‌سازی‌شده',
    cancelSimulation: 'لغو شبیه‌سازی VIP',
    resetSimulation: 'بازنشانی شبیه‌سازی',
    restoreSimulation: 'بازیابی شبیه‌سازی ذخیره‌شده',
    gold: 'VIP',
    goldPlan: 'VIP · دسترسی کامل Pro',
    goldPrice: '$9.99 / ماه تقویمی',
    goldDuration: 'دسترسی شبیه‌سازی‌شده برای یک ماه تقویمی',
    goldBenefits: 'همه تجهیزات Pro · بدون تبلیغ · بدون هزینه مهمات، چاقو، پرکردن و دید',
    goldActive: 'VIP فعال',
    goldExpires: 'پایان',
    adFree: 'دسترسی بدون تبلیغ',
    allProAccess: 'دسترسی کامل Pro',
    creditsPurchaseConfirm: 'این بسته فقط در شبیه‌ساز اعتبار اضافه می‌کند. هزینه واقعی دریافت نمی‌شود.',
    creditsAdded: 'اعتبار در شبیه‌سازی اضافه شد.',
    goldCancelled: 'شبیه‌سازی VIP لغو شد.',
    simulationReset: 'VIP و سوابق تراکنش شبیه‌سازی بازنشانی شد.',
  },
};

const CAMERA_ONLY_COPY: Record<
  Locale,
  Pick<TranslationDictionary, 'permissionsText' | 'detailPrivacy' | 'detailSecurity'>
> = {
  tr: {
    permissionsText: 'Oynamak için kamera erişimine izin ver.',
    detailPrivacy: 'Kamera görüntüleri yalnızca aktif kamera oturumunda kullanılır. Uygulama konum verisini kalıcı olarak saklamaz.',
    detailSecurity: 'Tercihler cihazında yerel olarak saklanır. Kamera görüntüleri sunucumuza gönderilmez.',
  },
  en: {
    permissionsText: 'Allow camera access to play.',
    detailPrivacy: 'Camera frames are used only during your active camera session. The app does not permanently store location data.',
    detailSecurity: 'Preferences are stored locally on your device. Camera frames are not sent to our server.',
  },
  zh: {
    permissionsText: '允许使用相机即可开始游戏。',
    detailPrivacy: '相机画面仅在主动相机会话期间使用。应用不会永久保存位置数据。',
    detailSecurity: '偏好设置保存在设备本地。相机画面不会发送到服务器。',
  },
  ja: {
    permissionsText: 'プレイするにはカメラを許可してください。',
    detailPrivacy: 'カメラ映像はアクティブなカメラセッション中だけ使用します。位置情報を永続保存しません。',
    detailSecurity: '設定は端末にローカル保存されます。カメラ映像はサーバーへ送信されません。',
  },
  ar: {
    permissionsText: 'اسمح بالكاميرا للعب.',
    detailPrivacy: 'تُستخدم إطارات الكاميرا أثناء جلسة الكاميرا النشطة فقط. لا يحفظ التطبيق بيانات الموقع بشكل دائم.',
    detailSecurity: 'تُحفظ التفضيلات محلياً على جهازك. لا تُرسل إطارات الكاميرا إلى خادمنا.',
  },
  de: {
    permissionsText: 'Erlaube die Kamera zum Spielen.',
    detailPrivacy: 'Kamerabilder werden nur während einer aktiven Kamerasitzung verwendet. Standortdaten werden nicht dauerhaft gespeichert.',
    detailSecurity: 'Einstellungen werden lokal auf deinem Gerät gespeichert. Kamerabilder werden nicht an unseren Server gesendet.',
  },
  fr: {
    permissionsText: 'Autorisez la caméra pour jouer.',
    detailPrivacy: 'Les images caméra ne sont utilisées que pendant la session active. L’application ne conserve pas les données de localisation.',
    detailSecurity: 'Les préférences sont stockées localement. Les images caméra ne sont pas envoyées à notre serveur.',
  },
  es: {
    permissionsText: 'Permite la cámara para jugar.',
    detailPrivacy: 'Las imágenes de cámara solo se usan durante la sesión activa. La app no guarda datos de ubicación permanentemente.',
    detailSecurity: 'Las preferencias se guardan localmente. Las imágenes no se envían a nuestro servidor.',
  },
  it: {
    permissionsText: 'Consenti la fotocamera per giocare.',
    detailPrivacy: 'Le immagini della fotocamera sono usate solo durante la sessione attiva. L’app non conserva la posizione.',
    detailSecurity: 'Le preferenze sono salvate sul dispositivo. Le immagini non vengono inviate al server.',
  },
  pt: {
    permissionsText: 'Permita a câmera para jogar.',
    detailPrivacy: 'As imagens da câmera são usadas apenas durante a sessão ativa. O app não armazena localização permanentemente.',
    detailSecurity: 'As preferências ficam armazenadas localmente. As imagens não são enviadas ao servidor.',
  },
  ru: {
    permissionsText: 'Разрешите камеру для игры.',
    detailPrivacy: 'Кадры камеры используются только во время активной сессии. Геоданные не хранятся постоянно.',
    detailSecurity: 'Настройки хранятся локально. Кадры камеры не отправляются на сервер.',
  },
  uk: {
    permissionsText: 'Дозвольте камеру для гри.',
    detailPrivacy: 'Кадри камери використовуються лише під час активної сесії. Дані про місцезнаходження не зберігаються постійно.',
    detailSecurity: 'Налаштування зберігаються локально. Кадри камери не надсилаються на сервер.',
  },
  hi: {
    permissionsText: 'खेलने के लिए कैमरा अनुमति दें।',
    detailPrivacy: 'कैमरा फ़्रेम केवल सक्रिय कैमरा सत्र में उपयोग होते हैं। ऐप लोकेशन डेटा स्थायी रूप से नहीं रखता।',
    detailSecurity: 'पसंद डिवाइस पर स्थानीय रूप से रखी जाती हैं। कैमरा फ़्रेम सर्वर पर नहीं भेजे जाते।',
  },
  ur: {
    permissionsText: 'کھیلنے کے لیے کیمرے کی اجازت دیں۔',
    detailPrivacy: 'کیمرہ فریم صرف فعال کیمرہ سیشن میں استعمال ہوتے ہیں۔ ایپ مقام کا ڈیٹا مستقل محفوظ نہیں کرتی۔',
    detailSecurity: 'ترجیحات ڈیوائس پر مقامی طور پر محفوظ ہیں۔ کیمرہ فریم سرور کو نہیں بھیجے جاتے۔',
  },
  bn: {
    permissionsText: 'খেলার জন্য ক্যামেরা অনুমতি দিন।',
    detailPrivacy: 'ক্যামেরা ফ্রেম শুধু সক্রিয় ক্যামেরা সেশনে ব্যবহৃত হয়। অ্যাপ স্থায়ীভাবে অবস্থানের ডেটা রাখে না।',
    detailSecurity: 'পছন্দগুলি ডিভাইসে স্থানীয়ভাবে রাখা হয়। ক্যামেরা ফ্রেম সার্ভারে পাঠানো হয় না।',
  },
  pa: {
    permissionsText: 'ਖੇਡਣ ਲਈ ਕੈਮਰੇ ਦੀ ਇਜਾਜ਼ਤ ਦਿਓ।',
    detailPrivacy: 'ਕੈਮਰਾ ਫਰੇਮ ਸਿਰਫ਼ ਸਰਗਰਮ ਕੈਮਰਾ ਸੈਸ਼ਨ ਦੌਰਾਨ ਵਰਤੇ ਜਾਂਦੇ ਹਨ। ਐਪ ਸਥਾਨ ਡਾਟਾ ਸਥਾਈ ਤੌਰ ਉੱਤੇ ਨਹੀਂ ਰੱਖਦੀ।',
    detailSecurity: 'ਤਰਜੀਹਾਂ ਡਿਵਾਈਸ ਉੱਤੇ ਸਥਾਨਕ ਤੌਰ ਉੱਤੇ ਸੁਰੱਖਿਅਤ ਹੁੰਦੀਆਂ ਹਨ। ਕੈਮਰਾ ਫਰੇਮ ਸਰਵਰ ਨੂੰ ਨਹੀਂ ਭੇਜੇ ਜਾਂਦੇ।',
  },
  id: {
    permissionsText: 'Izinkan kamera untuk bermain.',
    detailPrivacy: 'Frame kamera hanya digunakan selama sesi kamera aktif. Aplikasi tidak menyimpan lokasi secara permanen.',
    detailSecurity: 'Preferensi disimpan secara lokal. Frame kamera tidak dikirim ke server.',
  },
  ko: {
    permissionsText: '플레이하려면 카메라를 허용하세요.',
    detailPrivacy: '카메라 프레임은 활성 카메라 세션에서만 사용됩니다. 위치 데이터는 영구 저장하지 않습니다.',
    detailSecurity: '설정은 기기에 로컬 저장됩니다. 카메라 프레임은 서버로 전송되지 않습니다.',
  },
  vi: {
    permissionsText: 'Cho phép máy ảnh để chơi.',
    detailPrivacy: 'Khung hình máy ảnh chỉ được dùng trong phiên máy ảnh đang hoạt động. Ứng dụng không lưu vị trí lâu dài.',
    detailSecurity: 'Tùy chọn được lưu cục bộ. Khung hình không gửi đến máy chủ.',
  },
  th: {
    permissionsText: 'อนุญาตกล้องเพื่อเล่นเกม',
    detailPrivacy: 'ใช้ภาพจากกล้องเฉพาะระหว่างเซสชันกล้องที่ทำงานอยู่ และไม่เก็บข้อมูลตำแหน่งถาวร',
    detailSecurity: 'การตั้งค่าจัดเก็บในอุปกรณ์ และภาพจากกล้องไม่ส่งไปเซิร์ฟเวอร์',
  },
  nl: {
    permissionsText: 'Sta de camera toe om te spelen.',
    detailPrivacy: 'Camerabeelden worden alleen tijdens een actieve sessie gebruikt. Locatie wordt niet blijvend opgeslagen.',
    detailSecurity: 'Voorkeuren worden lokaal opgeslagen. Camerabeelden gaan niet naar onze server.',
  },
  pl: {
    permissionsText: 'Zezwól na aparat, aby grać.',
    detailPrivacy: 'Obrazy z aparatu są używane tylko podczas aktywnej sesji. Aplikacja nie przechowuje stale lokalizacji.',
    detailSecurity: 'Ustawienia są przechowywane lokalnie. Obrazy nie są wysyłane na serwer.',
  },
  sv: {
    permissionsText: 'Tillåt kameran för att spela.',
    detailPrivacy: 'Kamerabilder används bara under en aktiv kamerasession. Appen lagrar inte platsdata permanent.',
    detailSecurity: 'Inställningar sparas lokalt. Kamerabilder skickas inte till servern.',
  },
  fa: {
    permissionsText: 'برای بازی اجازه دوربین بدهید.',
    detailPrivacy: 'فریم‌های دوربین فقط در جلسه فعال دوربین استفاده می‌شوند. برنامه داده مکان را دائمی ذخیره نمی‌کند.',
    detailSecurity: 'ترجیحات روی دستگاه ذخیره می‌شوند. فریم‌های دوربین به سرور فرستاده نمی‌شوند.',
  },
};

for (const locale of SUPPORTED_LOCALES) {
  Object.assign(TRANSLATIONS[locale], COMMERCE_COPY[locale]);
  Object.assign(TRANSLATIONS[locale], CAMERA_ONLY_COPY[locale]);
  TRANSLATIONS[locale].detailGuide = TOUCH_AIM_DETAIL_GUIDES[locale];
  TRANSLATIONS[locale].soundTest = SOUND_TEST_COPY[locale];
}

const LOCALE_ALIASES: Record<string, Locale> = {
  tr: 'tr', en: 'en', zh: 'zh', 'zh-cn': 'zh', 'zh-tw': 'zh', ja: 'ja',
  ar: 'ar', de: 'de', fr: 'fr', es: 'es', it: 'it', pt: 'pt', ru: 'ru',
  uk: 'uk', hi: 'hi', ur: 'ur', bn: 'bn', pa: 'pa', id: 'id', in: 'id',
  ko: 'ko', vi: 'vi', th: 'th', nl: 'nl', pl: 'pl', sv: 'sv', fa: 'fa',
};

export function normalizeLocale(value: string | null | undefined): Locale {
  const normalized = (value ?? '').trim().toLowerCase().replace('_', '-');
  const language = normalized.split('-')[0];
  return LOCALE_ALIASES[normalized] ?? LOCALE_ALIASES[language] ?? 'en';
}

export function detectPreferredLocale(): Locale {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    return normalizeLocale(locale);
  } catch {
    // A JS runtime without Intl is unusual, but English is an explicit,
    // non-Turkish safe default for an unknown device locale.
    return 'en';
  }
}

export type SupportedRegion = 'TR' | 'DE' | 'UA' | 'US';

export function detectPreferredRegion(): SupportedRegion {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale.toUpperCase();
    const region = locale.split('-')[1];
    if (region === 'DE') return 'DE';
    if (region === 'UA') return 'UA';
    if (region === 'US') return 'US';
  } catch {
    // Keep the explicit, non-invasive app default when region data is absent.
  }
  return 'TR';
}

export function countryTranslationKey(country: 'TR' | 'DE' | 'UA' | 'US'): TranslationKey {
  return `country${country}` as TranslationKey;
}

export function translate(locale: Locale, key: TranslationKey): string {
  if (key === 'teamBattle') return locale === 'tr' ? 'ÖLÜM MAÇI' : 'DEATHMATCH';
  if (key === 'players' && locale === 'tr') return '1–10 OYUNCU';
  if (key in DISCLOSURE_COPY.tr) {
    const disclosure = DISCLOSURE_COPY[locale === 'tr' ? 'tr' : 'en'][key as DisclosureKey];
    if (disclosure) return disclosure;
  }
  return TRANSLATIONS[locale][key];
}

const CATEGORY_NAMES = [
  'Tabancalar',
  'Hafif Makineliler',
  'Taarruz Tüfekleri',
  'Pompalı Tüfekler',
  'Keskin Nişancı Tüfekleri',
  'Makineli Tüfekler',
  'El Bombaları',
  'Roketatarlar',
  'Enerji Silahları',
  'Özel Ekipman',
] as const;

/**
 * Weapon metadata predates the locale catalogue and is intentionally kept as
 * stable Turkish identifiers. These presentation labels are translated here,
 * rather than changing persisted/catalogue IDs.
 */
const CATEGORY_LABELS: Record<Locale, readonly string[]> = {
  tr: ['Tabancalar', 'Hafif Makineliler', 'Taarruz Tüfekleri', 'Pompalı Tüfekler', 'Keskin Nişancı Tüfekleri', 'Makineli Tüfekler', 'El Bombaları', 'Roketatarlar', 'Enerji Silahları', 'Özel Ekipman'],
  en: ['Pistols', 'Submachine guns', 'Assault rifles', 'Shotguns', 'Sniper rifles', 'Machine guns', 'Grenades', 'Launchers', 'Energy weapons', 'Special equipment'],
  zh: ['手枪', '冲锋枪', '突击步枪', '霰弹枪', '狙击步枪', '机枪', '手雷', '发射器', '能量武器', '特殊装备'],
  ja: ['ピストル', 'サブマシンガン', 'アサルトライフル', 'ショットガン', 'スナイパーライフル', 'マシンガン', 'グレネード', 'ランチャー', 'エネルギー武器', '特殊装備'],
  ar: ['مسدسات', 'رشاشات خفيفة', 'بنادق هجومية', 'بنادق خرطوش', 'بنادق قنص', 'رشاشات', 'قنابل', 'قاذفات', 'أسلحة طاقة', 'معدات خاصة'],
  de: ['Pistolen', 'Maschinenpistolen', 'Sturmgewehre', 'Schrotflinten', 'Scharfschützengewehre', 'Maschinengewehre', 'Granaten', 'Werfer', 'Energiewaffen', 'Spezialausrüstung'],
  fr: ['Pistolets', 'Pistolets-mitrailleurs', 'Fusils d’assaut', 'Fusils à pompe', 'Fusils de précision', 'Mitrailleuses', 'Grenades', 'Lanceurs', 'Armes à énergie', 'Équipement spécial'],
  es: ['Pistolas', 'Subfusiles', 'Fusiles de asalto', 'Escopetas', 'Fusiles de precisión', 'Ametralladoras', 'Granadas', 'Lanzadores', 'Armas de energía', 'Equipo especial'],
  it: ['Pistole', 'Mitragliette', 'Fucili d’assalto', 'Fucili a pompa', 'Fucili di precisione', 'Mitragliatrici', 'Granate', 'Lanciatori', 'Armi a energia', 'Equipaggiamento speciale'],
  pt: ['Pistolas', 'Submetralhadoras', 'Fuzis de assalto', 'Escopetas', 'Fuzis de precisão', 'Metralhadoras', 'Granadas', 'Lançadores', 'Armas de energia', 'Equipamento especial'],
  ru: ['Пистолеты', 'Пистолеты-пулемёты', 'Штурмовые винтовки', 'Дробовики', 'Снайперские винтовки', 'Пулемёты', 'Гранаты', 'Гранатомёты', 'Энергетическое оружие', 'Спецснаряжение'],
  uk: ['Пістолети', 'Пістолети-кулемети', 'Штурмові гвинтівки', 'Дробовики', 'Снайперські гвинтівки', 'Кулемети', 'Гранати', 'Гранатомети', 'Енергетична зброя', 'Спецспорядження'],
  hi: ['पिस्तौल', 'सबमशीन गन', 'असॉल्ट राइफल', 'शॉटगन', 'स्नाइपर राइफल', 'मशीन गन', 'ग्रेनेड', 'लॉन्चर', 'ऊर्जा हथियार', 'विशेष उपकरण'],
  ur: ['پستول', 'ہلکی مشین گن', 'اسالٹ رائفل', 'شاٹ گن', 'سنائپر رائفل', 'مشین گن', 'گرینیڈ', 'لانچر', 'توانائی کے ہتھیار', 'خصوصی سامان'],
  bn: ['পিস্তল', 'সাবমেশিন গান', 'অ্যাসল্ট রাইফেল', 'শটগান', 'স্নাইপার রাইফেল', 'মেশিন গান', 'গ্রেনেড', 'লঞ্চার', 'এনার্জি অস্ত্র', 'বিশেষ সরঞ্জাম'],
  pa: ['ਪਿਸਤੌਲ', 'ਸਬਮਸ਼ੀਨ ਗਨ', 'ਅਸਾਲਟ ਰਾਈਫਲ', 'ਸ਼ਾਟਗਨ', 'ਸਨਾਈਪਰ ਰਾਈਫਲ', 'ਮਸ਼ੀਨ ਗਨ', 'ਗ੍ਰਨੇਡ', 'ਲਾਂਚਰ', 'ਊਰਜਾ ਹਥਿਆਰ', 'ਖਾਸ ਸਾਮਾਨ'],
  id: ['Pistol', 'Senapan mesin ringan', 'Senapan serbu', 'Shotgun', 'Senapan runduk', 'Senapan mesin', 'Granat', 'Peluncur', 'Senjata energi', 'Perlengkapan khusus'],
  ko: ['권총', '기관단총', '돌격소총', '산탄총', '저격소총', '기관총', '수류탄', '발사기', '에너지 무기', '특수 장비'],
  vi: ['Súng ngắn', 'Súng tiểu liên', 'Súng trường tấn công', 'Súng shotgun', 'Súng bắn tỉa', 'Súng máy', 'Lựu đạn', 'Bệ phóng', 'Vũ khí năng lượng', 'Trang bị đặc biệt'],
  th: ['ปืนพก', 'ปืนกลมือ', 'ปืนไรเฟิลจู่โจม', 'ปืนลูกซอง', 'ปืนไรเฟิลซุ่มยิง', 'ปืนกล', 'ระเบิด', 'เครื่องยิง', 'อาวุธพลังงาน', 'อุปกรณ์พิเศษ'],
  nl: ['Pistolen', 'Machinepistolen', 'Aanvalsgeweren', 'Jachtgeweren', 'Scherpschuttersgeweren', 'Mitrailleurs', 'Granaten', 'Lanceerders', 'Energiewapens', 'Speciale uitrusting'],
  pl: ['Pistolety', 'Pistolety maszynowe', 'Karabiny szturmowe', 'Strzelby', 'Karabiny snajperskie', 'Karabiny maszynowe', 'Granaty', 'Wyrzutnie', 'Broń energetyczna', 'Wyposażenie specjalne'],
  sv: ['Pistoler', 'Kulsprutepistoler', 'Automatkarbiner', 'Hagelgevär', 'Prickskyttegevär', 'Kulsprutor', 'Granater', 'Granatkastare', 'Energivapen', 'Specialutrustning'],
  fa: ['تپانچه‌ها', 'مسلسل‌های سبک', 'تفنگ‌های تهاجمی', 'تفنگ‌های ساچمه‌ای', 'تفنگ‌های تک‌تیرانداز', 'مسلسل‌ها', 'نارنجک‌ها', 'پرتابگرها', 'سلاح‌های انرژی', 'تجهیزات ویژه'],
};

export const WEAPON_ACTION_KEYS = ['grenade', 'launch', 'energy', 'slingshot', 'melee', 'automatic', 'single', 'ammo', 'count', 'rocket', 'ball', 'hit', 'knifeThrow'] as const;
export type WeaponActionKey = (typeof WEAPON_ACTION_KEYS)[number];

export const ACTION_LABELS: Record<Locale, Record<WeaponActionKey, string>> = {
  tr: { grenade: 'ATILABİLİR', launch: 'ROKET ATIŞI', energy: 'ENERJİ', slingshot: 'METAL BİLYE', melee: 'YAKIN DÖVÜŞ', automatic: 'OTOMATİK', single: 'TEK ATIŞ', ammo: 'MERMİ', count: 'ADET', rocket: 'ROKET', ball: 'ÇELİK BİLYE', hit: 'VURUŞ', knifeThrow: 'BIÇAK FIRLATMA' },
  en: { grenade: 'THROWABLE', launch: 'ROCKET FIRE', energy: 'ENERGY', slingshot: 'STEEL BALL', melee: 'MELEE', automatic: 'AUTOMATIC', single: 'SINGLE SHOT', ammo: 'ROUNDS', count: 'COUNT', rocket: 'ROCKET', ball: 'STEEL BALL', hit: 'HITS', knifeThrow: 'KNIFE THROW' },
  zh: { grenade: '可投掷', launch: '火箭发射', energy: '能量', slingshot: '钢珠', melee: '近战', automatic: '自动', single: '单发', ammo: '弹药', count: '数量', rocket: '火箭', ball: '钢珠', hit: '命中', knifeThrow: '飞刀' },
  ja: { grenade: '投てき', launch: 'ロケット発射', energy: 'エネルギー', slingshot: 'スチールボール', melee: '近接', automatic: 'オート', single: '単発', ammo: '弾', count: '個数', rocket: 'ロケット', ball: 'スチールボール', hit: '攻撃', knifeThrow: 'ナイフ投げ' },
  ar: { grenade: 'قابل للرمي', launch: 'إطلاق صاروخ', energy: 'طاقة', slingshot: 'كرة فولاذية', melee: 'قتال قريب', automatic: 'آلي', single: 'طلقة واحدة', ammo: 'ذخيرة', count: 'عدد', rocket: 'صاروخ', ball: 'كرة فولاذية', hit: 'ضربات', knifeThrow: 'رمي السكين' },
  de: { grenade: 'WURFWAFFE', launch: 'RAKETENFEUER', energy: 'ENERGIE', slingshot: 'STAHLKUGEL', melee: 'NAHKAMPF', automatic: 'AUTOMATISCH', single: 'EINZELSCHUSS', ammo: 'MUNITION', count: 'ANZAHL', rocket: 'RAKETE', ball: 'STAHLKUGEL', hit: 'TREFFER', knifeThrow: 'MESSERWURF' },
  fr: { grenade: 'À LANCER', launch: 'TIR DE ROQUETTE', energy: 'ÉNERGIE', slingshot: 'BILLE D’ACIER', melee: 'CORPS À CORPS', automatic: 'AUTOMATIQUE', single: 'COUP PAR COUP', ammo: 'MUNITIONS', count: 'UNITÉS', rocket: 'ROQUETTE', ball: 'BILLE D’ACIER', hit: 'COUPS', knifeThrow: 'LANCER DE COUTEAU' },
  es: { grenade: 'ARROJABLE', launch: 'DISPARO DE COHETE', energy: 'ENERGÍA', slingshot: 'BOLA DE ACERO', melee: 'CUERPO A CUERPO', automatic: 'AUTOMÁTICO', single: 'UN DISPARO', ammo: 'MUNICIÓN', count: 'CANTIDAD', rocket: 'COHETE', ball: 'BOLA DE ACERO', hit: 'GOLPES', knifeThrow: 'LANZAMIENTO DE CUCHILLO' },
  it: { grenade: 'LANCIO', launch: 'FUOCO A RAZZO', energy: 'ENERGIA', slingshot: 'SFERA D’ACCIAIO', melee: 'CORPO A CORPO', automatic: 'AUTOMATICO', single: 'COLPO SINGOLO', ammo: 'MUNIZIONI', count: 'UNITÀ', rocket: 'RAZZO', ball: 'SFERA D’ACCIAIO', hit: 'COLPI', knifeThrow: 'LANCIO DEL COLTELLO' },
  pt: { grenade: 'ARREMESSÁVEL', launch: 'DISPARO DE FOGUETE', energy: 'ENERGIA', slingshot: 'BOLA DE AÇO', melee: 'CORPO A CORPO', automatic: 'AUTOMÁTICO', single: 'TIRO ÚNICO', ammo: 'MUNIÇÃO', count: 'UNIDADES', rocket: 'FOGUETE', ball: 'BOLA DE AÇO', hit: 'GOLPES', knifeThrow: 'ARREMESSO DE FACA' },
  ru: { grenade: 'МЕТАТЕЛЬНОЕ', launch: 'РАКЕТНЫЙ ОГОНЬ', energy: 'ЭНЕРГИЯ', slingshot: 'СТАЛЬНОЙ ШАРИК', melee: 'БЛИЖНИЙ БОЙ', automatic: 'АВТОМАТИЧЕСКИЙ', single: 'ОДИНОЧНЫЙ', ammo: 'ПАТРОНЫ', count: 'ШТ.', rocket: 'РАКЕТА', ball: 'СТАЛЬНОЙ ШАРИК', hit: 'УДАРЫ', knifeThrow: 'БРОСОК НОЖА' },
  uk: { grenade: 'МЕТАЛЬНЕ', launch: 'РАКЕТНИЙ ВОГОНЬ', energy: 'ЕНЕРГІЯ', slingshot: 'СТАЛЕВА КУЛЯ', melee: 'БЛИЖНІЙ БІЙ', automatic: 'АВТОМАТИЧНИЙ', single: 'ОДИНОЧНИЙ', ammo: 'БОЄПРИПАСИ', count: 'КІЛЬКІСТЬ', rocket: 'РАКЕТА', ball: 'СТАЛЕВА КУЛЯ', hit: 'УДАРИ', knifeThrow: 'КИДОК НОЖА' },
  hi: { grenade: 'फेंकने योग्य', launch: 'रॉकेट फायर', energy: 'ऊर्जा', slingshot: 'स्टील बॉल', melee: 'नज़दीकी लड़ाई', automatic: 'ऑटोमैटिक', single: 'एकल शॉट', ammo: 'गोला-बारूद', count: 'संख्या', rocket: 'रॉकेट', ball: 'स्टील बॉल', hit: 'वार', knifeThrow: 'चाकू फेंकना' },
  ur: { grenade: 'پھینکنے کے قابل', launch: 'راکٹ فائر', energy: 'توانائی', slingshot: 'فولادی گیند', melee: 'قریبی لڑائی', automatic: 'خودکار', single: 'ایک گولی', ammo: 'گولہ بارود', count: 'تعداد', rocket: 'راکٹ', ball: 'فولادی گیند', hit: 'وار', knifeThrow: 'چاقو پھینکنا' },
  bn: { grenade: 'নিক্ষেপযোগ্য', launch: 'রকেট ফায়ার', energy: 'শক্তি', slingshot: 'স্টিল বল', melee: 'কাছাকাছি লড়াই', automatic: 'স্বয়ংক্রিয়', single: 'একক শট', ammo: 'গুলি', count: 'সংখ্যা', rocket: 'রকেট', ball: 'স্টিল বল', hit: 'আঘাত', knifeThrow: 'ছুরি নিক্ষেপ' },
  pa: { grenade: 'ਸੁੱਟਣ ਯੋਗ', launch: 'ਰਾਕੇਟ ਫਾਇਰ', energy: 'ਊਰਜਾ', slingshot: 'ਸਟੀਲ ਬਾਲ', melee: 'ਨੇੜਲੀ ਲੜਾਈ', automatic: 'ਆਟੋਮੈਟਿਕ', single: 'ਇੱਕ ਗੋਲੀ', ammo: 'ਗੋਲਾ-ਬਾਰੂਦ', count: 'ਗਿਣਤੀ', rocket: 'ਰਾਕੇਟ', ball: 'ਸਟੀਲ ਬਾਲ', hit: 'ਵਾਰ', knifeThrow: 'ਚਾਕੂ ਸੁੱਟਣਾ' },
  id: { grenade: 'DAPAT DILEMPAR', launch: 'TEMBAKAN ROKET', energy: 'ENERGI', slingshot: 'BOLA BAJA', melee: 'JARAK DEKAT', automatic: 'OTOMATIS', single: 'SATU TEMBAKAN', ammo: 'AMUNISI', count: 'JUMLAH', rocket: 'ROKET', ball: 'BOLA BAJA', hit: 'HIT', knifeThrow: 'LEMPAR PISAU' },
  ko: { grenade: '투척 가능', launch: '로켓 발사', energy: '에너지', slingshot: '강철 구슬', melee: '근접 전투', automatic: '자동', single: '단발', ammo: '탄약', count: '수량', rocket: '로켓', ball: '강철 구슬', hit: '타격', knifeThrow: '칼 던지기' },
  vi: { grenade: 'Có thể ném', launch: 'Bắn tên lửa', energy: 'Năng lượng', slingshot: 'Bi thép', melee: 'Cận chiến', automatic: 'Tự động', single: 'Bắn từng phát', ammo: 'Đạn', count: 'Số lượng', rocket: 'Tên lửa', ball: 'Bi thép', hit: 'Đòn đánh', knifeThrow: 'NÉM DAO' },
  th: { grenade: 'ขว้างได้', launch: 'ยิงจรวด', energy: 'พลังงาน', slingshot: 'ลูกเหล็ก', melee: 'ระยะประชิด', automatic: 'อัตโนมัติ', single: 'ทีละนัด', ammo: 'กระสุน', count: 'จำนวน', rocket: 'จรวด', ball: 'ลูกเหล็ก', hit: 'ครั้ง', knifeThrow: 'ขว้างมีด' },
  nl: { grenade: 'WERPBAAR', launch: 'RAKETVUUR', energy: 'ENERGIE', slingshot: 'STALEN KOGEL', melee: 'NABIJHEID', automatic: 'AUTOMATISCH', single: 'ENKEL SCHOT', ammo: 'MUNITIE', count: 'AANTAL', rocket: 'RAKET', ball: 'STALEN KOGEL', hit: 'TREFFERS', knifeThrow: 'MESWORP' },
  pl: { grenade: 'DO RZUCANIA', launch: 'OGIEŃ RAKIETOWY', energy: 'ENERGIA', slingshot: 'STALOWA KULA', melee: 'WRĘCZ', automatic: 'AUTOMATYCZNY', single: 'POJEDYNCZY STRZAŁ', ammo: 'AMUNICJA', count: 'LICZBA', rocket: 'RAKIETA', ball: 'STALOWA KULA', hit: 'TRAFIENIA', knifeThrow: 'RZUT NOŻEM' },
  sv: { grenade: 'KASTBAR', launch: 'RAKETELD', energy: 'ENERGI', slingshot: 'STÅLKULA', melee: 'NÄRKAMP', automatic: 'AUTOMATISK', single: 'ENKELSKOTT', ammo: 'AMMUNITION', count: 'ANTAL', rocket: 'RAKET', ball: 'STÅLKULA', hit: 'TRÄFFAR', knifeThrow: 'KNIVKAST' },
  fa: { grenade: 'قابل پرتاب', launch: 'شلیک راکت', energy: 'انرژی', slingshot: 'گلوله فولادی', melee: 'نبرد نزدیک', automatic: 'خودکار', single: 'تک‌تیر', ammo: 'مهمات', count: 'تعداد', rocket: 'راکت', ball: 'گلوله فولادی', hit: 'ضربه', knifeThrow: 'پرتاب چاقو' },
};

export function weaponCategoryLabel(locale: Locale, category: string): string {
  const index = CATEGORY_NAMES.indexOf(category as (typeof CATEGORY_NAMES)[number]);
  return index >= 0 ? CATEGORY_LABELS[locale][index] : translate(locale, 'equipmentSelection');
}

export function weaponActionLabel(locale: Locale, action: string): string {
  return action in ACTION_LABELS[locale]
    ? ACTION_LABELS[locale][action as WeaponActionKey]
    : translate(locale, 'equipmentSelection');
}

const VISION_LABELS: Record<Locale, readonly [string, string, string]> = {
  tr: ['NORMAL', 'GECE', 'TERMAL'],
  en: ['NORMAL', 'NIGHT', 'THERMAL'],
  zh: ['普通', '夜视', '热成像'],
  ja: ['通常', 'ナイト', 'サーマル'],
  ar: ['عادي', 'ليلي', 'حراري'],
  de: ['NORMAL', 'NACHT', 'THERMAL'],
  fr: ['NORMAL', 'NOCTURNE', 'THERMIQUE'],
  es: ['NORMAL', 'NOCTURNO', 'TÉRMICO'],
  it: ['NORMALE', 'NOTTURNA', 'TERMICA'],
  pt: ['NORMAL', 'NOTURNA', 'TÉRMICA'],
  ru: ['ОБЫЧНЫЙ', 'НОЧНОЙ', 'ТЕПЛОВОЙ'],
  uk: ['ЗВИЧАЙНИЙ', 'НІЧНИЙ', 'ТЕПЛОВИЙ'],
  hi: ['सामान्य', 'नाइट', 'थर्मल'],
  ur: ['عام', 'نائٹ', 'تھرمل'],
  bn: ['স্বাভাবিক', 'নাইট', 'থার্মাল'],
  pa: ['ਆਮ', 'ਨਾਈਟ', 'ਥਰਮਲ'],
  id: ['NORMAL', 'MALAM', 'TERMAL'],
  ko: ['일반', '야간', '열화상'],
  vi: ['Bình thường', 'Ban đêm', 'Nhiệt'],
  th: ['ปกติ', 'กลางคืน', 'ความร้อน'],
  nl: ['NORMAAL', 'NACHT', 'THERMISCH'],
  pl: ['NORMALNY', 'NOCNY', 'TERMALNY'],
  sv: ['NORMAL', 'NATT', 'VÄRME'],
  fa: ['عادی', 'دید شب', 'حرارتی'],
};

export function visionModeLabel(locale: Locale, mode: 'normal' | 'nightVision' | 'thermal'): string {
  return VISION_LABELS[locale][mode === 'normal' ? 0 : mode === 'nightVision' ? 1 : 2];
}

const FACING_LABELS: Record<Locale, readonly [string, string]> = {
  tr: ['ÖN KAMERA', 'ARKA KAMERA'], en: ['FRONT CAMERA', 'REAR CAMERA'], zh: ['前置摄像头', '后置摄像头'], ja: ['フロントカメラ', '背面カメラ'],
  ar: ['الكاميرا الأمامية', 'الكاميرا الخلفية'], de: ['FRONTKAMERA', 'RÜCKKAMERA'], fr: ['CAMÉRA AVANT', 'CAMÉRA ARRIÈRE'], es: ['CÁMARA FRONTAL', 'CÁMARA TRASERA'],
  it: ['FOTOCAMERA ANTERIORE', 'FOTOCAMERA POSTERIORE'], pt: ['CÂMERA FRONTAL', 'CÂMERA TRASEIRA'], ru: ['ФРОНТАЛЬНАЯ КАМЕРА', 'ЗАДНЯЯ КАМЕРА'],
  uk: ['ФРОНТАЛЬНА КАМЕРА', 'ЗАДНЯ КАМЕРА'], hi: ['फ्रंट कैमरा', 'रियर कैमरा'], ur: ['سامنے کا کیمرا', 'پیچھے کا کیمرا'],
  bn: ['সামনের ক্যামেরা', 'পেছনের ক্যামেরা'], pa: ['ਅੱਗੇ ਵਾਲਾ ਕੈਮਰਾ', 'ਪਿਛਲਾ ਕੈਮਰਾ'], id: ['KAMERA DEPAN', 'KAMERA BELAKANG'],
  ko: ['전면 카메라', '후면 카메라'], vi: ['Camera trước', 'Camera sau'], th: ['กล้องหน้า', 'กล้องหลัง'], nl: ['FRONTCAMERA', 'ACHTERCAMERA'],
  pl: ['PRZEDNI APARAT', 'TYLNY APARAT'], sv: ['FRÄMRE KAMERA', 'BAKKAMERA'], fa: ['دوربین جلو', 'دوربین پشت'],
};

export function cameraFacingLabel(locale: Locale, facing: 'front' | 'back'): string {
  return FACING_LABELS[locale][facing === 'front' ? 0 : 1];
}

const TEAM_LABELS: Record<Locale, readonly [string, string]> = {
  tr: ['KIRMIZI', 'MAVİ'], en: ['RED', 'BLUE'], zh: ['红队', '蓝队'], ja: ['赤', '青'], ar: ['الأحمر', 'الأزرق'],
  de: ['ROT', 'BLAU'], fr: ['ROUGE', 'BLEU'], es: ['ROJO', 'AZUL'], it: ['ROSSA', 'BLU'], pt: ['VERMELHO', 'AZUL'],
  ru: ['КРАСНАЯ', 'СИНЯЯ'], uk: ['ЧЕРВОНА', 'СИНЯ'], hi: ['लाल', 'नीली'], ur: ['سرخ', 'نیلی'], bn: ['লাল', 'নীল'],
  pa: ['ਲਾਲ', 'ਨੀਲਾ'], id: ['MERAH', 'BIRU'], ko: ['레드', '블루'], vi: ['ĐỎ', 'XANH'], th: ['แดง', 'น้ำเงิน'],
  nl: ['ROOD', 'BLAUW'], pl: ['CZERWONA', 'NIEBIESKA'], sv: ['RÖD', 'BLÅ'], fa: ['قرمز', 'آبی'],
};

export function teamLabel(locale: Locale, team: 'red' | 'blue'): string {
  return TEAM_LABELS[locale][team === 'red' ? 0 : 1];
}

/**
 * Context-specific labels for screens whose copy cannot be represented by a
 * broad navigation label (for example, a room code is not "Settings").
 * Keeping these outside the persisted game model lets the combat/lobby
 * components use stable semantic identifiers while every locale still gets
 * its own rendered text.
 */
export type UiCopyKey =
  | 'roomCode' | 'playerName' | 'createRoom' | 'joinRoom' | 'teamRed' | 'teamBlue'
  | 'winner'
  | 'playerMarker' | 'markerHint' | 'startRequirements' | 'waitingHost'
  | 'serverChecking' | 'roomCreateHint' | 'roomJoinHint'
  | 'freeArsenal' | 'premiumArsenal' | 'allEquipmentStatus'
  | 'smoke' | 'flash' | 'explosion'
  | 'scopeMagnification' | 'scopeDistance' | 'scopeWind' | 'scopeAdjust'
  | 'recordingTitle' | 'recordingHint' | 'recordingLive' | 'recordingChecking'
  | 'recordingSaving' | 'recordingSaved' | 'recordingNew' | 'recordingCancel'
  | 'recordingStart' | 'recordingAd' | 'recordingCredit' | 'recordingUnsupported'
  | 'recordingEconomy' | 'recordingNoDevice' | 'recordingError' | 'recordingShare'
  | 'recordingPrepare' | 'cameraPermissionDenied' | 'cameraUnavailable'
  | 'cameraUnavailableTitle' | 'continueWithoutCamera' | 'recordingDeferred'
  | 'openInNewTab';

type PermissionUiCopyKey = 'cameraPermissionDenied' | 'cameraUnavailable' | 'cameraUnavailableTitle' | 'continueWithoutCamera' | 'recordingDeferred' | 'openInNewTab';
type UiCopy = Record<Exclude<UiCopyKey, PermissionUiCopyKey>, string>;

const UI_COPY: Record<Locale, UiCopy> = {
  tr: {
    winner: 'Kazanan',
    roomCode: 'ODA KODU', playerName: 'OYUNCU ADI', createRoom: 'ODA KUR', joinRoom: 'ODAYA GİR', teamRed: 'KIRMIZI TAKIM', teamBlue: 'MAVİ TAKIM',
    playerMarker: 'SANA ÖZEL İŞARET', markerHint: 'Rakip kamera bu renk ve numarayı tanır. Ekranını görünür tut.', startRequirements: 'Hemen gir, tek başına olsan bile. Diğer oyuncular oda kodunu kullanarak daha sonra katılabilir.', waitingHost: 'Oda sahibinin savaşı başlatması bekleniyor…',
    serverChecking: 'Sunucu bağlantısı kontrol ediliyor…', roomCreateHint: 'Yeni oda kodu sunucu tarafından oluşturulur.', roomJoinHint: 'Bir oyuncudan aldığınız 6 haneli kodu girin.',
    freeArsenal: 'ÜCRETSİZ ARSENAL', premiumArsenal: 'PRO ARSENAL', allEquipmentStatus: 'Yalnızca tabancalar ve hafif makineli silahlar ücretsizdir.',
    smoke: 'DUMAN', flash: 'FLAŞ', explosion: 'PATLAMA', scopeMagnification: 'BÜYÜTME', scopeDistance: 'MESAFE', scopeWind: 'RÜZGÂR', scopeAdjust: 'DÜRBÜN SIFIRLAMA',
    recordingTitle: 'OYUN EKRANI KAYDI', recordingHint: 'Sessiz oyun ekranının 5 saniyelik klibi.', recordingLive: 'Gerçek ve sessiz oyun ekranı kaydediliyor.', recordingChecking: 'Kayıt hazırlanıyor…', recordingSaving: 'KAYDEDİLİYOR',
    recordingSaved: 'Sessiz oyun klibi cihaza kaydedildi.', recordingNew: 'YENİ KAYIT', recordingCancel: 'KAYDI İPTAL ET', recordingStart: '5 SN KAYDET', recordingAd: 'REKLAM', recordingCredit: 'KREDİ',
    recordingUnsupported: 'ÖZEL DERLEME GEREKİR', recordingEconomy: 'EKONOMİ BAĞLANTISI GEREKİR', recordingNoDevice: 'Bu cihazda ekran kaydı desteklenmiyor.', recordingError: 'Ekran kaydı tamamlanamadı.', recordingShare: 'Klibi paylaş', recordingPrepare: 'KAYDI HAZIRLA',
  },
  en: {
    winner: 'Winner',
    roomCode: 'ROOM CODE', playerName: 'PLAYER NAME', createRoom: 'CREATE ROOM', joinRoom: 'JOIN ROOM', teamRed: 'RED TEAM', teamBlue: 'BLUE TEAM',
    playerMarker: 'YOUR MARKER', markerHint: 'The opposing camera recognizes this color and number. Keep your screen visible.', startRequirements: 'Enter immediately, even alone. Other players can join later using the room code.', waitingHost: 'Waiting for the room host to start the battle…',
    serverChecking: 'Checking server connection…', roomCreateHint: 'The server creates a new room code.', roomJoinHint: 'Enter the six-character code from another player.',
    freeArsenal: 'FREE ARSENAL', premiumArsenal: 'PRO ARSENAL', allEquipmentStatus: 'Only pistols and submachine guns are free.',
    smoke: 'SMOKE', flash: 'FLASH', explosion: 'EXPLOSION', scopeMagnification: 'MAGNIFICATION', scopeDistance: 'DIST', scopeWind: 'WIND', scopeAdjust: 'SCOPE ZERO',
    recordingTitle: 'GAME SCREEN RECORDING', recordingHint: 'A silent five-second clip of the game screen.', recordingLive: 'Recording the real game screen without audio.', recordingChecking: 'Preparing recording…', recordingSaving: 'SAVING',
    recordingSaved: 'Silent game clip saved to the device.', recordingNew: 'NEW RECORDING', recordingCancel: 'CANCEL RECORDING', recordingStart: 'RECORD 5 SEC', recordingAd: 'AD', recordingCredit: 'CREDIT',
    recordingUnsupported: 'CUSTOM BUILD REQUIRED', recordingEconomy: 'ECONOMY CONNECTION REQUIRED', recordingNoDevice: 'Screen recording is not supported on this device.', recordingError: 'Screen recording could not be completed.', recordingShare: 'Share clip', recordingPrepare: 'PREPARE RECORDING',
  },
  zh: {
    winner: '获胜者',
    roomCode: '房间代码', playerName: '玩家名称', createRoom: '创建房间', joinRoom: '加入房间', teamRed: '红队', teamBlue: '蓝队',
    playerMarker: '你的标记', markerHint: '对手相机会识别此颜色和编号。请保持屏幕可见。', startRequirements: '立即进入，即使只有你一个人也可以。其他玩家之后可以使用房间代码加入。', waitingHost: '等待房主开始战斗…',
    serverChecking: '正在检查服务器连接…', roomCreateHint: '服务器会创建新的房间代码。', roomJoinHint: '输入其他玩家提供的六位代码。',
    freeArsenal: '免费武器库', premiumArsenal: 'PRO 武器库', allEquipmentStatus: '只有手枪和冲锋枪免费。',
    smoke: '烟雾', flash: '闪光', explosion: '爆炸', scopeMagnification: '倍率', scopeDistance: '距离', scopeWind: '风向', scopeAdjust: '瞄准镜归零',
    recordingTitle: '游戏画面录制', recordingHint: '五秒无声游戏画面片段。', recordingLive: '正在录制真实游戏画面（无音频）。', recordingChecking: '正在准备录制…', recordingSaving: '保存中',
    recordingSaved: '无声游戏片段已保存到设备。', recordingNew: '新录制', recordingCancel: '取消录制', recordingStart: '录制 5 秒', recordingAd: '广告', recordingCredit: '积分',
    recordingUnsupported: '需要专用构建', recordingEconomy: '需要经济连接', recordingNoDevice: '此设备不支持屏幕录制。', recordingError: '无法完成屏幕录制。', recordingShare: '分享片段', recordingPrepare: '准备录制',
  },
  ja: {
    winner: '勝者',
    roomCode: 'ルームコード', playerName: 'プレイヤー名', createRoom: 'ルームを作成', joinRoom: 'ルームに参加', teamRed: 'レッドチーム', teamBlue: 'ブルーチーム',
    playerMarker: 'あなたのマーカー', markerHint: '相手のカメラはこの色と番号を認識します。画面を見える状態にしてください。', startRequirements: '一人でもすぐに入室できます。他のプレイヤーは後からルームコードで参加できます。', waitingHost: 'ルームホストが戦闘を開始するまで待機中…',
    serverChecking: 'サーバー接続を確認中…', roomCreateHint: '新しいルームコードはサーバーが作成します。', roomJoinHint: '他のプレイヤーから受け取った6文字のコードを入力します。',
    freeArsenal: '無料武器庫', premiumArsenal: 'PRO 武器庫', allEquipmentStatus: '無料なのはピストルとサブマシンガンだけです。',
    smoke: 'スモーク', flash: 'フラッシュ', explosion: '爆発', scopeMagnification: '倍率', scopeDistance: '距離', scopeWind: '風', scopeAdjust: 'スコープ調整',
    recordingTitle: 'ゲーム画面録画', recordingHint: 'ゲーム画面を5秒間、無音で録画します。', recordingLive: '音声なしで実際のゲーム画面を録画中。', recordingChecking: '録画を準備中…', recordingSaving: '保存中',
    recordingSaved: '無音のゲーム映像を端末に保存しました。', recordingNew: '新しい録画', recordingCancel: '録画をキャンセル', recordingStart: '5秒録画', recordingAd: '広告', recordingCredit: 'クレジット',
    recordingUnsupported: '専用ビルドが必要', recordingEconomy: '決済接続が必要', recordingNoDevice: 'この端末は画面録画に対応していません。', recordingError: '画面録画を完了できませんでした。', recordingShare: 'クリップを共有', recordingPrepare: '録画を準備',
  },
  ar: {
    winner: 'الفائز',
    roomCode: 'رمز الغرفة', playerName: 'اسم اللاعب', createRoom: 'إنشاء غرفة', joinRoom: 'دخول الغرفة', teamRed: 'الفريق الأحمر', teamBlue: 'الفريق الأزرق',
    playerMarker: 'علامتك', markerHint: 'تتعرف كاميرا الخصم على هذا اللون والرقم. أبقِ شاشتك ظاهرة.', startRequirements: 'ادخل فورًا حتى لو كنت وحدك. يمكن للاعبين الآخرين الانضمام لاحقًا باستخدام رمز الغرفة.', waitingHost: 'بانتظار مالك الغرفة لبدء المعركة…',
    serverChecking: 'جارٍ فحص اتصال الخادم…', roomCreateHint: 'ينشئ الخادم رمز غرفة جديداً.', roomJoinHint: 'أدخل الرمز المؤلف من ستة أحرف من لاعب آخر.',
    freeArsenal: 'ترسانة مجانية', premiumArsenal: 'ترسانة PRO', allEquipmentStatus: 'المسدسات والرشاشات الخفيفة فقط مجانية.',
    smoke: 'دخان', flash: 'وميض', explosion: 'انفجار', scopeMagnification: 'التكبير', scopeDistance: 'المسافة', scopeWind: 'الرياح', scopeAdjust: 'ضبط المنظار',
    recordingTitle: 'تسجيل شاشة اللعبة', recordingHint: 'مقطع صامت مدته خمس ثوانٍ من شاشة اللعبة.', recordingLive: 'جارٍ تسجيل شاشة اللعبة الحقيقية بلا صوت.', recordingChecking: 'جارٍ تجهيز التسجيل…', recordingSaving: 'جارٍ الحفظ',
    recordingSaved: 'حُفظ مقطع اللعبة الصامت على الجهاز.', recordingNew: 'تسجيل جديد', recordingCancel: 'إلغاء التسجيل', recordingStart: 'تسجيل 5 ثوانٍ', recordingAd: 'إعلان', recordingCredit: 'رصيد',
    recordingUnsupported: 'يلزم إصدار مخصص', recordingEconomy: 'يلزم اتصال الاقتصاد', recordingNoDevice: 'تسجيل الشاشة غير مدعوم على هذا الجهاز.', recordingError: 'تعذر إكمال تسجيل الشاشة.', recordingShare: 'مشاركة المقطع', recordingPrepare: 'تجهيز التسجيل',
  },
  de: {
    winner: 'Sieger',
    roomCode: 'RAUMCODE', playerName: 'SPIELERNAME', createRoom: 'RAUM ERSTELLEN', joinRoom: 'RAUM BEITRETEN', teamRed: 'ROTES TEAM', teamBlue: 'BLAUES TEAM',
    playerMarker: 'DEIN MARKER', markerHint: 'Die gegnerische Kamera erkennt diese Farbe und Nummer. Halte deinen Bildschirm sichtbar.', startRequirements: 'Betritt den Raum sofort, auch allein. Andere Spieler können später mit dem Raumcode beitreten.', waitingHost: 'Warten, bis der Raumleiter den Kampf startet…',
    serverChecking: 'Serververbindung wird geprüft…', roomCreateHint: 'Der Server erstellt einen neuen Raumcode.', roomJoinHint: 'Gib den sechsstelligen Code eines anderen Spielers ein.',
    freeArsenal: 'KOSTENLOSE WAFFENKAMMER', premiumArsenal: 'PRO-WAFFENKAMMER', allEquipmentStatus: 'Nur Pistolen und Maschinenpistolen sind kostenlos.',
    smoke: 'RAUCH', flash: 'BLITZ', explosion: 'EXPLOSION', scopeMagnification: 'VERGRÖSSERUNG', scopeDistance: 'DISTANZ', scopeWind: 'WIND', scopeAdjust: 'ZIELFERNROHR NULLEN',
    recordingTitle: 'SPIELBILDAUFNAHME', recordingHint: 'Ein stummer fünfsekündiger Clip des Spielbildschirms.', recordingLive: 'Der echte Spielbildschirm wird ohne Ton aufgenommen.', recordingChecking: 'Aufnahme wird vorbereitet…', recordingSaving: 'WIRD GESPEICHERT',
    recordingSaved: 'Stummer Spielclip wurde auf dem Gerät gespeichert.', recordingNew: 'NEUE AUFNAHME', recordingCancel: 'AUFNAHME ABBRECHEN', recordingStart: '5 SEK. AUFNEHMEN', recordingAd: 'WERBUNG', recordingCredit: 'KREDIT',
    recordingUnsupported: 'SPEZIELLER BUILD ERFORDERLICH', recordingEconomy: 'WIRTSCHAFTSVERBINDUNG ERFORDERLICH', recordingNoDevice: 'Bildschirmaufnahme wird auf diesem Gerät nicht unterstützt.', recordingError: 'Bildschirmaufnahme konnte nicht abgeschlossen werden.', recordingShare: 'Clip teilen', recordingPrepare: 'AUFNAHME VORBEREITEN',
  },
  fr: {
    winner: 'Gagnant',
    roomCode: 'CODE DE SALLE', playerName: 'NOM DU JOUEUR', createRoom: 'CRÉER UNE SALLE', joinRoom: 'REJOINDRE LA SALLE', teamRed: 'ÉQUIPE ROUGE', teamBlue: 'ÉQUIPE BLEUE',
    playerMarker: 'VOTRE MARQUEUR', markerHint: 'La caméra adverse reconnaît cette couleur et ce numéro. Gardez votre écran visible.', startRequirements: 'Entrez immédiatement, même si vous êtes seul. Les autres joueurs pourront rejoindre la partie plus tard avec le code de la salle.', waitingHost: 'En attente du propriétaire de la salle…',
    serverChecking: 'Vérification de la connexion au serveur…', roomCreateHint: 'Le serveur crée un nouveau code de salle.', roomJoinHint: 'Saisissez le code à six caractères reçu d’un autre joueur.',
    freeArsenal: 'ARSENAL GRATUIT', premiumArsenal: 'ARSENAL PRO', allEquipmentStatus: 'Seuls les pistolets et pistolets-mitrailleurs sont gratuits.',
    smoke: 'FUMÉE', flash: 'FLASH', explosion: 'EXPLOSION', scopeMagnification: 'GROSSISSEMENT', scopeDistance: 'DISTANCE', scopeWind: 'VENT', scopeAdjust: 'RÉGLAGE DE LUNETTE',
    recordingTitle: 'ENREGISTREMENT DE L’ÉCRAN', recordingHint: 'Clip muet de cinq secondes de l’écran de jeu.', recordingLive: 'Enregistrement de l’écran réel du jeu, sans audio.', recordingChecking: 'Préparation de l’enregistrement…', recordingSaving: 'ENREGISTREMENT',
    recordingSaved: 'Le clip muet a été enregistré sur l’appareil.', recordingNew: 'NOUVEL ENREGISTREMENT', recordingCancel: 'ANNULER', recordingStart: 'ENREGISTRER 5 S', recordingAd: 'PUBLICITÉ', recordingCredit: 'CRÉDIT',
    recordingUnsupported: 'BUILD SPÉCIAL REQUIS', recordingEconomy: 'CONNEXION ÉCONOMIQUE REQUISE', recordingNoDevice: 'L’enregistrement d’écran n’est pas pris en charge sur cet appareil.', recordingError: 'L’enregistrement d’écran a échoué.', recordingShare: 'Partager le clip', recordingPrepare: 'PRÉPARER L’ENREGISTREMENT',
  },
  es: {
    winner: 'Ganador',
    roomCode: 'CÓDIGO DE SALA', playerName: 'NOMBRE DEL JUGADOR', createRoom: 'CREAR SALA', joinRoom: 'UNIRSE A LA SALA', teamRed: 'EQUIPO ROJO', teamBlue: 'EQUIPO AZUL',
    playerMarker: 'TU MARCADOR', markerHint: 'La cámara rival reconoce este color y número. Mantén visible tu pantalla.', startRequirements: 'Entra de inmediato, incluso si estás solo. Los demás jugadores pueden unirse más tarde con el código de la sala.', waitingHost: 'Esperando a que el anfitrión inicie la batalla…',
    serverChecking: 'Comprobando conexión con el servidor…', roomCreateHint: 'El servidor crea un código de sala nuevo.', roomJoinHint: 'Introduce el código de seis caracteres de otro jugador.',
    freeArsenal: 'ARSENAL GRATUITO', premiumArsenal: 'ARSENAL PRO', allEquipmentStatus: 'Solo las pistolas y subfusiles son gratuitos.',
    smoke: 'HUMO', flash: 'DESTELLO', explosion: 'EXPLOSIÓN', scopeMagnification: 'AUMENTO', scopeDistance: 'DISTANCIA', scopeWind: 'VIENTO', scopeAdjust: 'AJUSTE DE MIRA',
    recordingTitle: 'GRABACIÓN DE PANTALLA', recordingHint: 'Clip mudo de cinco segundos de la pantalla del juego.', recordingLive: 'Grabando la pantalla real del juego sin audio.', recordingChecking: 'Preparando la grabación…', recordingSaving: 'GUARDANDO',
    recordingSaved: 'El clip mudo se guardó en el dispositivo.', recordingNew: 'NUEVA GRABACIÓN', recordingCancel: 'CANCELAR GRABACIÓN', recordingStart: 'GRABAR 5 S', recordingAd: 'ANUNCIO', recordingCredit: 'CRÉDITO',
    recordingUnsupported: 'SE REQUIERE UNA VERSIÓN ESPECIAL', recordingEconomy: 'SE REQUIERE CONEXIÓN ECONÓMICA', recordingNoDevice: 'Este dispositivo no admite la grabación de pantalla.', recordingError: 'No se pudo completar la grabación de pantalla.', recordingShare: 'Compartir clip', recordingPrepare: 'PREPARAR GRABACIÓN',
  },
  it: {
    winner: 'Vincitore',
    roomCode: 'CODICE STANZA', playerName: 'NOME GIOCATORE', createRoom: 'CREA STANZA', joinRoom: 'UNISCITI ALLA STANZA', teamRed: 'SQUADRA ROSSA', teamBlue: 'SQUADRA BLU',
    playerMarker: 'IL TUO MARCATORE', markerHint: 'La fotocamera avversaria riconosce questo colore e numero. Tieni visibile lo schermo.', startRequirements: 'Entra subito, anche da solo. Gli altri giocatori potranno unirsi più tardi usando il codice della stanza.', waitingHost: 'In attesa che il proprietario della stanza inizi la battaglia…',
    serverChecking: 'Controllo della connessione al server…', roomCreateHint: 'Il server crea un nuovo codice stanza.', roomJoinHint: 'Inserisci il codice di sei caratteri ricevuto da un altro giocatore.',
    freeArsenal: 'ARSENALE GRATUITO', premiumArsenal: 'ARSENALE PRO', allEquipmentStatus: 'Solo pistole e mitragliette sono gratuite.',
    smoke: 'FUMO', flash: 'FLASH', explosion: 'ESPLOSIONE', scopeMagnification: 'INGRANDIMENTO', scopeDistance: 'DISTANZA', scopeWind: 'VENTO', scopeAdjust: 'AZZERAMENTO OTTICA',
    recordingTitle: 'REGISTRAZIONE SCHERMO', recordingHint: 'Clip muto di cinque secondi dello schermo di gioco.', recordingLive: 'Registrazione dello schermo reale del gioco senza audio.', recordingChecking: 'Preparazione registrazione…', recordingSaving: 'SALVATAGGIO',
    recordingSaved: 'Clip di gioco senza audio salvato sul dispositivo.', recordingNew: 'NUOVA REGISTRAZIONE', recordingCancel: 'ANNULLA REGISTRAZIONE', recordingStart: 'REGISTRA 5 S', recordingAd: 'PUBBLICITÀ', recordingCredit: 'CREDITO',
    recordingUnsupported: 'RICHIESTA BUILD SPECIALE', recordingEconomy: 'RICHIESTA CONNESSIONE ECONOMICA', recordingNoDevice: 'La registrazione dello schermo non è supportata su questo dispositivo.', recordingError: 'Impossibile completare la registrazione dello schermo.', recordingShare: 'Condividi clip', recordingPrepare: 'PREPARA REGISTRAZIONE',
  },
  pt: {
    winner: 'Vencedor',
    roomCode: 'CÓDIGO DA SALA', playerName: 'NOME DO JOGADOR', createRoom: 'CRIAR SALA', joinRoom: 'ENTRAR NA SALA', teamRed: 'EQUIPE VERMELHA', teamBlue: 'EQUIPE AZUL',
    playerMarker: 'SEU MARCADOR', markerHint: 'A câmera adversária reconhece esta cor e número. Mantenha sua tela visível.', startRequirements: 'Entre imediatamente, mesmo sozinho. Os outros jogadores podem entrar mais tarde usando o código da sala.', waitingHost: 'Aguardando o dono da sala iniciar a batalha…',
    serverChecking: 'Verificando conexão com o servidor…', roomCreateHint: 'O servidor cria um novo código de sala.', roomJoinHint: 'Digite o código de seis caracteres de outro jogador.',
    freeArsenal: 'ARSENAL GRATUITO', premiumArsenal: 'ARSENAL PRO', allEquipmentStatus: 'Somente pistolas e submetralhadoras são gratuitas.',
    smoke: 'FUMAÇA', flash: 'FLASH', explosion: 'EXPLOSÃO', scopeMagnification: 'AMPLIAÇÃO', scopeDistance: 'DISTÂNCIA', scopeWind: 'VENTO', scopeAdjust: 'ZERAR MIRA',
    recordingTitle: 'GRAVAÇÃO DA TELA', recordingHint: 'Clipe sem som de cinco segundos da tela do jogo.', recordingLive: 'Gravando a tela real do jogo sem áudio.', recordingChecking: 'Preparando gravação…', recordingSaving: 'SALVANDO',
    recordingSaved: 'Clipe de jogo sem som salvo no dispositivo.', recordingNew: 'NOVA GRAVAÇÃO', recordingCancel: 'CANCELAR GRAVAÇÃO', recordingStart: 'GRAVAR 5 S', recordingAd: 'ANÚNCIO', recordingCredit: 'CRÉDITO',
    recordingUnsupported: 'BUILD ESPECIAL NECESSÁRIO', recordingEconomy: 'CONEXÃO ECONÔMICA NECESSÁRIA', recordingNoDevice: 'A gravação de tela não é compatível com este dispositivo.', recordingError: 'Não foi possível concluir a gravação da tela.', recordingShare: 'Compartilhar clipe', recordingPrepare: 'PREPARAR GRAVAÇÃO',
  },
  ru: {
    winner: 'Победитель',
    roomCode: 'КОД КОМНАТЫ', playerName: 'ИМЯ ИГРОКА', createRoom: 'СОЗДАТЬ КОМНАТУ', joinRoom: 'ВОЙТИ В КОМНАТУ', teamRed: 'КРАСНАЯ КОМАНДА', teamBlue: 'СИНЯЯ КОМАНДА',
    playerMarker: 'ВАША МЕТКА', markerHint: 'Камера противника распознаёт этот цвет и номер. Держите экран видимым.', startRequirements: 'Входите сразу, даже в одиночку. Другие игроки смогут присоединиться позже по коду комнаты.', waitingHost: 'Ожидание запуска боя владельцем комнаты…',
    serverChecking: 'Проверка соединения с сервером…', roomCreateHint: 'Сервер создаст новый код комнаты.', roomJoinHint: 'Введите шестизначный код другого игрока.',
    freeArsenal: 'БЕСПЛАТНЫЙ АРСЕНАЛ', premiumArsenal: 'PRO-АРСЕНАЛ', allEquipmentStatus: 'Бесплатны только пистолеты и пистолеты-пулемёты.',
    smoke: 'ДЫМ', flash: 'ВСПЫШКА', explosion: 'ВЗРЫВ', scopeMagnification: 'УВЕЛИЧЕНИЕ', scopeDistance: 'ДИСТАНЦИЯ', scopeWind: 'ВЕТЕР', scopeAdjust: 'ПРИСТРЕЛКА',
    recordingTitle: 'ЗАПИСЬ ЭКРАНА ИГРЫ', recordingHint: 'Пятасекундный клип экрана игры без звука.', recordingLive: 'Идёт запись настоящего экрана игры без звука.', recordingChecking: 'Подготовка записи…', recordingSaving: 'СОХРАНЕНИЕ',
    recordingSaved: 'Беззвучный игровой клип сохранён на устройстве.', recordingNew: 'НОВАЯ ЗАПИСЬ', recordingCancel: 'ОТМЕНИТЬ ЗАПИСЬ', recordingStart: 'ЗАПИСАТЬ 5 С', recordingAd: 'РЕКЛАМА', recordingCredit: 'КРЕДИТ',
    recordingUnsupported: 'НУЖНА СПЕЦИАЛЬНАЯ СБОРКА', recordingEconomy: 'НУЖНО ПОДКЛЮЧЕНИЕ ЭКОНОМИКИ', recordingNoDevice: 'Запись экрана не поддерживается на этом устройстве.', recordingError: 'Не удалось завершить запись экрана.', recordingShare: 'Поделиться клипом', recordingPrepare: 'ПОДГОТОВИТЬ ЗАПИСЬ',
  },
  uk: {
    winner: 'Переможець',
    roomCode: 'КОД КІМНАТИ', playerName: 'ІМ’Я ГРАВЦЯ', createRoom: 'СТВОРИТИ КІМНАТУ', joinRoom: 'УВІЙТИ ДО КІМНАТИ', teamRed: 'ЧЕРВОНА КОМАНДА', teamBlue: 'СИНЯ КОМАНДА',
    playerMarker: 'ВАША ПОЗНАЧКА', markerHint: 'Камера суперника розпізнає цей колір і номер. Тримайте екран видимим.', startRequirements: 'Заходьте одразу, навіть якщо ви самі. Інші гравці зможуть приєднатися пізніше за кодом кімнати.', waitingHost: 'Очікування запуску бою власником кімнати…',
    serverChecking: 'Перевірка з’єднання із сервером…', roomCreateHint: 'Сервер створить новий код кімнати.', roomJoinHint: 'Введіть шестизначний код іншого гравця.',
    freeArsenal: 'БЕЗКОШТОВНИЙ АРСЕНАЛ', premiumArsenal: 'PRO-АРСЕНАЛ', allEquipmentStatus: 'Безкоштовні лише пістолети та пістолети-кулемети.',
    smoke: 'ДИМ', flash: 'СПАЛАХ', explosion: 'ВИБУХ', scopeMagnification: 'ЗБІЛЬШЕННЯ', scopeDistance: 'ВІДСТАНЬ', scopeWind: 'ВІТЕР', scopeAdjust: 'ПРИСТРІЛКА',
    recordingTitle: 'ЗАПИС ЕКРАНА ГРИ', recordingHint: 'П’ятисекундний кліп екрана гри без звуку.', recordingLive: 'Запис справжнього екрана гри без звуку.', recordingChecking: 'Підготовка запису…', recordingSaving: 'ЗБЕРЕЖЕННЯ',
    recordingSaved: 'Беззвучний ігровий кліп збережено на пристрої.', recordingNew: 'НОВИЙ ЗАПИС', recordingCancel: 'СКАСУВАТИ ЗАПИС', recordingStart: 'ЗАПИСАТИ 5 С', recordingAd: 'РЕКЛАМА', recordingCredit: 'КРЕДИТ',
    recordingUnsupported: 'ПОТРІБНА СПЕЦІАЛЬНА ЗБІРКА', recordingEconomy: 'ПОТРІБНЕ ПІДКЛЮЧЕННЯ ЕКОНОМІКИ', recordingNoDevice: 'Запис екрана не підтримується на цьому пристрої.', recordingError: 'Не вдалося завершити запис екрана.', recordingShare: 'Поділитися кліпом', recordingPrepare: 'ПІДГОТУВАТИ ЗАПИС',
  },
  hi: {
    winner: 'विजेता',
    roomCode: 'रूम कोड', playerName: 'खिलाड़ी का नाम', createRoom: 'रूम बनाएँ', joinRoom: 'रूम में शामिल हों', teamRed: 'लाल टीम', teamBlue: 'नीली टीम',
    playerMarker: 'आपका मार्कर', markerHint: 'प्रतिद्वंद्वी कैमरा इस रंग और नंबर को पहचानता है। अपनी स्क्रीन दिखाई देती रखें।', startRequirements: 'अकेले होने पर भी तुरंत प्रवेश करें। अन्य खिलाड़ी बाद में रूम कोड का उपयोग करके जुड़ सकते हैं।', waitingHost: 'रूम मालिक के लड़ाई शुरू करने की प्रतीक्षा…',
    serverChecking: 'सर्वर कनेक्शन जाँचा जा रहा है…', roomCreateHint: 'सर्वर नया रूम कोड बनाएगा।', roomJoinHint: 'दूसरे खिलाड़ी से मिला छह अक्षरों का कोड डालें।',
    freeArsenal: 'मुफ़्त शस्त्रागार', premiumArsenal: 'PRO शस्त्रागार', allEquipmentStatus: 'केवल पिस्तौल और सबमशीन गन मुफ़्त हैं।',
    smoke: 'धुआँ', flash: 'फ्लैश', explosion: 'विस्फोट', scopeMagnification: 'आवर्धन', scopeDistance: 'दूरी', scopeWind: 'हवा', scopeAdjust: 'स्कोप शून्य',
    recordingTitle: 'गेम स्क्रीन रिकॉर्डिंग', recordingHint: 'गेम स्क्रीन की पाँच सेकंड की बिना आवाज़ क्लिप।', recordingLive: 'बिना ऑडियो असली गेम स्क्रीन रिकॉर्ड हो रही है।', recordingChecking: 'रिकॉर्डिंग तैयार हो रही है…', recordingSaving: 'सहेजा जा रहा है',
    recordingSaved: 'बिना आवाज़ की गेम क्लिप डिवाइस में सहेजी गई।', recordingNew: 'नई रिकॉर्डिंग', recordingCancel: 'रिकॉर्डिंग रद्द करें', recordingStart: '5 सेकंड रिकॉर्ड करें', recordingAd: 'विज्ञापन', recordingCredit: 'क्रेडिट',
    recordingUnsupported: 'विशेष बिल्ड आवश्यक', recordingEconomy: 'इकोनॉमी कनेक्शन आवश्यक', recordingNoDevice: 'इस डिवाइस पर स्क्रीन रिकॉर्डिंग समर्थित नहीं है।', recordingError: 'स्क्रीन रिकॉर्डिंग पूरी नहीं हो सकी।', recordingShare: 'क्लिप साझा करें', recordingPrepare: 'रिकॉर्डिंग तैयार करें',
  },
  ur: {
    winner: 'فاتح',
    roomCode: 'روم کوڈ', playerName: 'کھلاڑی کا نام', createRoom: 'روم بنائیں', joinRoom: 'روم میں شامل ہوں', teamRed: 'سرخ ٹیم', teamBlue: 'نیلی ٹیم',
    playerMarker: 'آپ کا نشان', markerHint: 'مخالف کیمرا اس رنگ اور نمبر کو پہچانتا ہے۔ اپنی اسکرین نمایاں رکھیں۔', startRequirements: 'اکیلے بھی فوراً داخل ہوں۔ دوسرے کھلاڑی بعد میں روم کوڈ استعمال کرکے شامل ہو سکتے ہیں۔', waitingHost: 'روم کے میزبان کے جنگ شروع کرنے کا انتظار ہے…',
    serverChecking: 'سرور کنکشن چیک ہو رہا ہے…', roomCreateHint: 'سرور نیا روم کوڈ بنائے گا۔', roomJoinHint: 'دوسرے کھلاڑی سے ملا چھ حروف کا کوڈ درج کریں۔',
    freeArsenal: 'مفت اسلحہ خانہ', premiumArsenal: 'PRO اسلحہ خانہ', allEquipmentStatus: 'صرف پستول اور ہلکی مشین گن مفت ہیں۔',
    smoke: 'دھواں', flash: 'فلیش', explosion: 'دھماکہ', scopeMagnification: 'بڑھاؤ', scopeDistance: 'فاصلہ', scopeWind: 'ہوا', scopeAdjust: 'اسکوپ زیرو',
    recordingTitle: 'گیم اسکرین ریکارڈنگ', recordingHint: 'گیم اسکرین کی پانچ سیکنڈ کی خاموش کلپ۔', recordingLive: 'بغیر آواز اصلی گیم اسکرین ریکارڈ ہو رہی ہے۔', recordingChecking: 'ریکارڈنگ تیار ہو رہی ہے…', recordingSaving: 'محفوظ ہو رہا ہے',
    recordingSaved: 'خاموش گیم کلپ ڈیوائس پر محفوظ ہو گئی۔', recordingNew: 'نئی ریکارڈنگ', recordingCancel: 'ریکارڈنگ منسوخ کریں', recordingStart: '5 سیکنڈ ریکارڈ کریں', recordingAd: 'اشتہار', recordingCredit: 'کریڈٹ',
    recordingUnsupported: 'خصوصی بلڈ درکار ہے', recordingEconomy: 'اکانومی کنکشن درکار ہے', recordingNoDevice: 'اس ڈیوائس پر اسکرین ریکارڈنگ معاونت یافتہ نہیں۔', recordingError: 'اسکرین ریکارڈنگ مکمل نہیں ہو سکی۔', recordingShare: 'کلپ شیئر کریں', recordingPrepare: 'ریکارڈنگ تیار کریں',
  },
  bn: {
    winner: 'বিজয়ী',
    roomCode: 'রুম কোড', playerName: 'খেলোয়াড়ের নাম', createRoom: 'রুম তৈরি করুন', joinRoom: 'রুমে যোগ দিন', teamRed: 'লাল দল', teamBlue: 'নীল দল',
    playerMarker: 'আপনার মার্কার', markerHint: 'প্রতিপক্ষের ক্যামেরা এই রং ও নম্বর চিনবে। স্ক্রিন দৃশ্যমান রাখুন।', startRequirements: 'একা হলেও এখনই প্রবেশ করুন। অন্য খেলোয়াড়রা পরে রুম কোড ব্যবহার করে যোগ দিতে পারবে।', waitingHost: 'রুম মালিকের যুদ্ধ শুরু করার অপেক্ষায়…',
    serverChecking: 'সার্ভার সংযোগ পরীক্ষা হচ্ছে…', roomCreateHint: 'সার্ভার একটি নতুন রুম কোড তৈরি করবে।', roomJoinHint: 'অন্য খেলোয়াড়ের দেওয়া ছয় অক্ষরের কোড লিখুন।',
    freeArsenal: 'বিনামূল্যের অস্ত্রাগার', premiumArsenal: 'PRO অস্ত্রাগার', allEquipmentStatus: 'শুধু পিস্তল ও সাবমেশিন গান বিনামূল্যে।',
    smoke: 'ধোঁয়া', flash: 'ফ্ল্যাশ', explosion: 'বিস্ফোরণ', scopeMagnification: 'বর্ধন', scopeDistance: 'দূরত্ব', scopeWind: 'বাতাস', scopeAdjust: 'স্কোপ শূন্য',
    recordingTitle: 'গেম স্ক্রিন রেকর্ডিং', recordingHint: 'গেম স্ক্রিনের পাঁচ সেকেন্ডের নীরব ক্লিপ।', recordingLive: 'অডিও ছাড়া আসল গেম স্ক্রিন রেকর্ড হচ্ছে।', recordingChecking: 'রেকর্ডিং প্রস্তুত হচ্ছে…', recordingSaving: 'সংরক্ষণ হচ্ছে',
    recordingSaved: 'নীরব গেম ক্লিপ ডিভাইসে সংরক্ষিত হয়েছে।', recordingNew: 'নতুন রেকর্ডিং', recordingCancel: 'রেকর্ডিং বাতিল করুন', recordingStart: '৫ সেকেন্ড রেকর্ড', recordingAd: 'বিজ্ঞাপন', recordingCredit: 'ক্রেডিট',
    recordingUnsupported: 'বিশেষ বিল্ড প্রয়োজন', recordingEconomy: 'ইকোনমি সংযোগ প্রয়োজন', recordingNoDevice: 'এই ডিভাইসে স্ক্রিন রেকর্ডিং সমর্থিত নয়।', recordingError: 'স্ক্রিন রেকর্ডিং সম্পন্ন করা যায়নি।', recordingShare: 'ক্লিপ শেয়ার করুন', recordingPrepare: 'রেকর্ডিং প্রস্তুত করুন',
  },
  pa: {
    winner: 'ਜੇਤੂ',
    roomCode: 'ਰੂਮ ਕੋਡ', playerName: 'ਖਿਡਾਰੀ ਦਾ ਨਾਮ', createRoom: 'ਰੂਮ ਬਣਾਓ', joinRoom: 'ਰੂਮ ਵਿੱਚ ਸ਼ਾਮਲ ਹੋਵੋ', teamRed: 'ਲਾਲ ਟੀਮ', teamBlue: 'ਨੀਲੀ ਟੀਮ',
    playerMarker: 'ਤੁਹਾਡਾ ਨਿਸ਼ਾਨ', markerHint: 'ਵਿਰੋਧੀ ਕੈਮਰਾ ਇਸ ਰੰਗ ਅਤੇ ਨੰਬਰ ਨੂੰ ਪਛਾਣਦਾ ਹੈ। ਆਪਣੀ ਸਕ੍ਰੀਨ ਦਿਖਾਈ ਰੱਖੋ।', startRequirements: 'ਇਕੱਲੇ ਹੋਣ ਦੇ ਬਾਵਜੂਦ ਤੁਰੰਤ ਦਾਖ਼ਲ ਹੋਵੋ। ਹੋਰ ਖਿਡਾਰੀ ਬਾਅਦ ਵਿੱਚ ਰੂਮ ਕੋਡ ਰਾਹੀਂ ਸ਼ਾਮਲ ਹੋ ਸਕਦੇ ਹਨ।', waitingHost: 'ਰੂਮ ਮਾਲਕ ਦੇ ਲੜਾਈ ਸ਼ੁਰੂ ਕਰਨ ਦੀ ਉਡੀਕ…',
    serverChecking: 'ਸਰਵਰ ਕਨੈਕਸ਼ਨ ਜਾਂਚਿਆ ਜਾ ਰਿਹਾ ਹੈ…', roomCreateHint: 'ਸਰਵਰ ਨਵਾਂ ਰੂਮ ਕੋਡ ਬਣਾਏਗਾ।', roomJoinHint: 'ਦੂਜੇ ਖਿਡਾਰੀ ਤੋਂ ਮਿਲਿਆ ਛੇ ਅੱਖਰਾਂ ਦਾ ਕੋਡ ਦਾਖਲ ਕਰੋ।',
    freeArsenal: 'ਮੁਫ਼ਤ ਹਥਿਆਰਖਾਨਾ', premiumArsenal: 'PRO ਹਥਿਆਰਖਾਨਾ', allEquipmentStatus: 'ਸਿਰਫ਼ ਪਿਸਤੌਲ ਅਤੇ ਸਬਮਸ਼ੀਨ ਗਨ ਮੁਫ਼ਤ ਹਨ।',
    smoke: 'ਧੂੰਆਂ', flash: 'ਫਲੈਸ਼', explosion: 'ਧਮਾਕਾ', scopeMagnification: 'ਵੱਡਦਰਸ਼ੀ', scopeDistance: 'ਦੂਰੀ', scopeWind: 'ਹਵਾ', scopeAdjust: 'ਸਕੋਪ ਜ਼ੀਰੋ',
    recordingTitle: 'ਗੇਮ ਸਕ੍ਰੀਨ ਰਿਕਾਰਡਿੰਗ', recordingHint: 'ਗੇਮ ਸਕ੍ਰੀਨ ਦੀ ਪੰਜ ਸਕਿੰਟ ਦੀ ਬਿਨਾਂ ਆਵਾਜ਼ ਕਲਿੱਪ।', recordingLive: 'ਬਿਨਾਂ ਆਡੀਓ ਅਸਲ ਗੇਮ ਸਕ੍ਰੀਨ ਰਿਕਾਰਡ ਹੋ ਰਹੀ ਹੈ।', recordingChecking: 'ਰਿਕਾਰਡਿੰਗ ਤਿਆਰ ਹੋ ਰਹੀ ਹੈ…', recordingSaving: 'ਸੰਭਾਲਿਆ ਜਾ ਰਿਹਾ ਹੈ',
    recordingSaved: 'ਬਿਨਾਂ ਆਵਾਜ਼ ਦੀ ਗੇਮ ਕਲਿੱਪ ਡਿਵਾਈਸ ਵਿੱਚ ਸੰਭਾਲੀ ਗਈ।', recordingNew: 'ਨਵੀਂ ਰਿਕਾਰਡਿੰਗ', recordingCancel: 'ਰਿਕਾਰਡਿੰਗ ਰੱਦ ਕਰੋ', recordingStart: '5 ਸਕਿੰਟ ਰਿਕਾਰਡ ਕਰੋ', recordingAd: 'ਇਸ਼ਤਿਹਾਰ', recordingCredit: 'ਕ੍ਰੈਡਿਟ',
    recordingUnsupported: 'ਖਾਸ ਬਿਲਡ ਲੋੜੀਂਦਾ', recordingEconomy: 'ਅਰਥਵਿਵਸਥਾ ਕਨੈਕਸ਼ਨ ਲੋੜੀਂਦਾ', recordingNoDevice: 'ਇਸ ਡਿਵਾਈਸ ਉੱਤੇ ਸਕ੍ਰੀਨ ਰਿਕਾਰਡਿੰਗ ਸਮਰਥਿਤ ਨਹੀਂ।', recordingError: 'ਸਕ੍ਰੀਨ ਰਿਕਾਰਡਿੰਗ ਪੂਰੀ ਨਹੀਂ ਹੋ ਸਕੀ।', recordingShare: 'ਕਲਿੱਪ ਸਾਂਝੀ ਕਰੋ', recordingPrepare: 'ਰਿਕਾਰਡਿੰਗ ਤਿਆਰ ਕਰੋ',
  },
  id: {
    winner: 'Pemenang',
    roomCode: 'KODE RUANG', playerName: 'NAMA PEMAIN', createRoom: 'BUAT RUANG', joinRoom: 'GABUNG RUANG', teamRed: 'TIM MERAH', teamBlue: 'TIM BIRU',
    playerMarker: 'PENANDA ANDA', markerHint: 'Kamera lawan mengenali warna dan nomor ini. Jaga layar tetap terlihat.', startRequirements: 'Segera masuk, meski sendirian. Pemain lain dapat bergabung nanti menggunakan kode ruangan.', waitingHost: 'Menunggu pemilik ruang memulai pertempuran…',
    serverChecking: 'Memeriksa koneksi server…', roomCreateHint: 'Server akan membuat kode ruang baru.', roomJoinHint: 'Masukkan kode enam karakter dari pemain lain.',
    freeArsenal: 'ARSENAL GRATIS', premiumArsenal: 'ARSENAL PRO', allEquipmentStatus: 'Hanya pistol dan senapan mesin ringan yang gratis.',
    smoke: 'ASAP', flash: 'KILAT', explosion: 'LEDAKAN', scopeMagnification: 'PEMBESARAN', scopeDistance: 'JARAK', scopeWind: 'ANGIN', scopeAdjust: 'NOLKAN BIDIKAN',
    recordingTitle: 'REKAMAN LAYAR GAME', recordingHint: 'Klip lima detik layar game tanpa suara.', recordingLive: 'Merekam layar game asli tanpa audio.', recordingChecking: 'Menyiapkan rekaman…', recordingSaving: 'MENYIMPAN',
    recordingSaved: 'Klip game tanpa suara disimpan ke perangkat.', recordingNew: 'REKAMAN BARU', recordingCancel: 'BATALKAN REKAMAN', recordingStart: 'REKAM 5 DETIK', recordingAd: 'IKLAN', recordingCredit: 'KREDIT',
    recordingUnsupported: 'PERLU BUILD KHUSUS', recordingEconomy: 'PERLU KONEKSI EKONOMI', recordingNoDevice: 'Perekaman layar tidak didukung di perangkat ini.', recordingError: 'Rekaman layar tidak dapat diselesaikan.', recordingShare: 'Bagikan klip', recordingPrepare: 'SIAPKAN REKAMAN',
  },
  ko: {
    winner: '승자',
    roomCode: '방 코드', playerName: '플레이어 이름', createRoom: '방 만들기', joinRoom: '방 참가', teamRed: '레드 팀', teamBlue: '블루 팀',
    playerMarker: '내 마커', markerHint: '상대 카메라는 이 색상과 번호를 인식합니다. 화면을 보이게 유지하세요.', startRequirements: '혼자라도 바로 입장하세요. 다른 플레이어는 나중에 방 코드를 사용해 참여할 수 있습니다.', waitingHost: '방장이 전투를 시작하기를 기다리는 중…',
    serverChecking: '서버 연결 확인 중…', roomCreateHint: '서버가 새 방 코드를 만듭니다.', roomJoinHint: '다른 플레이어에게 받은 6자리 코드를 입력하세요.',
    freeArsenal: '무료 무기고', premiumArsenal: 'PRO 무기고', allEquipmentStatus: '권총과 기관단총만 무료입니다.',
    smoke: '연막', flash: '섬광', explosion: '폭발', scopeMagnification: '배율', scopeDistance: '거리', scopeWind: '바람', scopeAdjust: '조준경 영점',
    recordingTitle: '게임 화면 녹화', recordingHint: '게임 화면을 5초 동안 무음으로 녹화합니다.', recordingLive: '오디오 없이 실제 게임 화면을 녹화하는 중입니다.', recordingChecking: '녹화 준비 중…', recordingSaving: '저장 중',
    recordingSaved: '무음 게임 클립이 기기에 저장되었습니다.', recordingNew: '새 녹화', recordingCancel: '녹화 취소', recordingStart: '5초 녹화', recordingAd: '광고', recordingCredit: '크레딧',
    recordingUnsupported: '특수 빌드 필요', recordingEconomy: '경제 연결 필요', recordingNoDevice: '이 기기에서는 화면 녹화를 지원하지 않습니다.', recordingError: '화면 녹화를 완료하지 못했습니다.', recordingShare: '클립 공유', recordingPrepare: '녹화 준비',
  },
  vi: {
    winner: 'Người thắng',
    roomCode: 'MÃ PHÒNG', playerName: 'TÊN NGƯỜI CHƠI', createRoom: 'TẠO PHÒNG', joinRoom: 'VÀO PHÒNG', teamRed: 'ĐỘI ĐỎ', teamBlue: 'ĐỘI XANH',
    playerMarker: 'DẤU CỦA BẠN', markerHint: 'Camera đối thủ nhận diện màu và số này. Hãy giữ màn hình hiển thị.', startRequirements: 'Hãy vào ngay, ngay cả khi chỉ có một mình. Người chơi khác có thể tham gia sau bằng mã phòng.', waitingHost: 'Đang chờ chủ phòng bắt đầu trận…',
    serverChecking: 'Đang kiểm tra kết nối máy chủ…', roomCreateHint: 'Máy chủ sẽ tạo mã phòng mới.', roomJoinHint: 'Nhập mã sáu ký tự từ người chơi khác.',
    freeArsenal: 'KHO VŨ KHÍ MIỄN PHÍ', premiumArsenal: 'KHO VŨ KHÍ PRO', allEquipmentStatus: 'Chỉ súng ngắn và súng tiểu liên là miễn phí.',
    smoke: 'KHÓI', flash: 'CHỚP', explosion: 'VỤ NỔ', scopeMagnification: 'ĐỘ PHÓNG ĐẠI', scopeDistance: 'KHOẢNG CÁCH', scopeWind: 'GIÓ', scopeAdjust: 'CHỈNH ỐNG NGẮM',
    recordingTitle: 'GHI MÀN HÌNH TRÒ CHƠI', recordingHint: 'Đoạn clip trò chơi 5 giây không có âm thanh.', recordingLive: 'Đang ghi màn hình trò chơi thật không có âm thanh.', recordingChecking: 'Đang chuẩn bị ghi…', recordingSaving: 'ĐANG LƯU',
    recordingSaved: 'Đã lưu clip trò chơi không tiếng vào thiết bị.', recordingNew: 'BẢN GHI MỚI', recordingCancel: 'HỦY GHI', recordingStart: 'GHI 5 GIÂY', recordingAd: 'QUẢNG CÁO', recordingCredit: 'TÍN DỤNG',
    recordingUnsupported: 'CẦN BẢN DỰNG ĐẶC BIỆT', recordingEconomy: 'CẦN KẾT NỐI KINH TẾ', recordingNoDevice: 'Thiết bị này không hỗ trợ ghi màn hình.', recordingError: 'Không thể hoàn tất ghi màn hình.', recordingShare: 'Chia sẻ clip', recordingPrepare: 'CHUẨN BỊ GHI',
  },
  th: {
    winner: 'ผู้ชนะ',
    roomCode: 'รหัสห้อง', playerName: 'ชื่อผู้เล่น', createRoom: 'สร้างห้อง', joinRoom: 'เข้าร่วมห้อง', teamRed: 'ทีมแดง', teamBlue: 'ทีมสีน้ำเงิน',
    playerMarker: 'เครื่องหมายของคุณ', markerHint: 'กล้องฝ่ายตรงข้ามจะรู้จักสีและหมายเลขนี้ ให้เปิดหน้าจอไว้', startRequirements: 'เข้าห้องได้ทันทีแม้อยู่คนเดียว ผู้เล่นคนอื่นสามารถเข้าร่วมภายหลังโดยใช้รหัสห้อง', waitingHost: 'กำลังรอเจ้าของห้องเริ่มการต่อสู้…',
    serverChecking: 'กำลังตรวจสอบการเชื่อมต่อเซิร์ฟเวอร์…', roomCreateHint: 'เซิร์ฟเวอร์จะสร้างรหัสห้องใหม่', roomJoinHint: 'ป้อนรหัสหกตัวอักษรจากผู้เล่นคนอื่น',
    freeArsenal: 'คลังอาวุธฟรี', premiumArsenal: 'คลังอาวุธ PRO', allEquipmentStatus: 'ปืนพกและปืนกลมือเท่านั้นที่ฟรี',
    smoke: 'ควัน', flash: 'แฟลช', explosion: 'ระเบิด', scopeMagnification: 'กำลังขยาย', scopeDistance: 'ระยะทาง', scopeWind: 'ลม', scopeAdjust: 'ปรับศูนย์กล้อง',
    recordingTitle: 'บันทึกหน้าจอเกม', recordingHint: 'คลิปหน้าจอเกมห้าวินาทีแบบไม่มีเสียง', recordingLive: 'กำลังบันทึกหน้าจอเกมจริงโดยไม่มีเสียง', recordingChecking: 'กำลังเตรียมการบันทึก…', recordingSaving: 'กำลังบันทึก',
    recordingSaved: 'บันทึกคลิปเกมแบบไม่มีเสียงลงอุปกรณ์แล้ว', recordingNew: 'บันทึกใหม่', recordingCancel: 'ยกเลิกการบันทึก', recordingStart: 'บันทึก 5 วินาที', recordingAd: 'โฆษณา', recordingCredit: 'เครดิต',
    recordingUnsupported: 'ต้องใช้บิลด์พิเศษ', recordingEconomy: 'ต้องเชื่อมต่อระบบเศรษฐกิจ', recordingNoDevice: 'อุปกรณ์นี้ไม่รองรับการบันทึกหน้าจอ', recordingError: 'บันทึกหน้าจอไม่สำเร็จ', recordingShare: 'แชร์คลิป', recordingPrepare: 'เตรียมการบันทึก',
  },
  nl: {
    winner: 'Winnaar',
    roomCode: 'KAMERCODE', playerName: 'SPELERSNAAM', createRoom: 'KAMER MAKEN', joinRoom: 'KAMER BETREDEN', teamRed: 'ROOD TEAM', teamBlue: 'BLAUW TEAM',
    playerMarker: 'JOUW MARKER', markerHint: 'De camera van de tegenstander herkent deze kleur en dit nummer. Houd je scherm zichtbaar.', startRequirements: 'Ga meteen de kamer in, ook als je alleen bent. Andere spelers kunnen later meedoen met de kamercode.', waitingHost: 'Wachten tot de kamerhost de strijd start…',
    serverChecking: 'Serververbinding controleren…', roomCreateHint: 'De server maakt een nieuwe kamercode.', roomJoinHint: 'Voer de code van zes tekens van een andere speler in.',
    freeArsenal: 'GRATIS ARSENAAL', premiumArsenal: 'PRO-ARSENAAL', allEquipmentStatus: 'Alleen pistolen en machinepistolen zijn gratis.',
    smoke: 'ROOK', flash: 'FLITS', explosion: 'EXPLOSIE', scopeMagnification: 'VERGROTING', scopeDistance: 'AFSTAND', scopeWind: 'WIND', scopeAdjust: 'VIZIER NULSTELLEN',
    recordingTitle: 'SCHERMOPNAME VAN DE GAME', recordingHint: 'Een stille clip van vijf seconden van het gamescherm.', recordingLive: 'Het echte gamescherm wordt zonder audio opgenomen.', recordingChecking: 'Opname voorbereiden…', recordingSaving: 'OPSLAAN',
    recordingSaved: 'Stille gameclip opgeslagen op het apparaat.', recordingNew: 'NIEUWE OPNAME', recordingCancel: 'OPNAME ANNULEREN', recordingStart: '5 SEC. OPNEMEN', recordingAd: 'ADVERTENTIE', recordingCredit: 'TEGOED',
    recordingUnsupported: 'SPECIALE BUILD VEREIST', recordingEconomy: 'ECONOMISCHE VERBINDING VEREIST', recordingNoDevice: 'Schermopname wordt niet ondersteund op dit apparaat.', recordingError: 'Schermopname kon niet worden voltooid.', recordingShare: 'Clip delen', recordingPrepare: 'OPNAME VOORBEREIDEN',
  },
  pl: {
    winner: 'Zwycięzca',
    roomCode: 'KOD POKOJU', playerName: 'NAZWA GRACZA', createRoom: 'UTWÓRZ POKÓJ', joinRoom: 'DOŁĄCZ DO POKOJU', teamRed: 'CZERWONA DRUŻYNA', teamBlue: 'NIEBIESKA DRUŻYNA',
    playerMarker: 'TWÓJ ZNACZNIK', markerHint: 'Kamera przeciwnika rozpoznaje ten kolor i numer. Zadbaj, by ekran był widoczny.', startRequirements: 'Wejdź od razu, nawet w pojedynkę. Inni gracze mogą dołączyć później za pomocą kodu pokoju.', waitingHost: 'Oczekiwanie na rozpoczęcie walki przez gospodarza pokoju…',
    serverChecking: 'Sprawdzanie połączenia z serwerem…', roomCreateHint: 'Serwer utworzy nowy kod pokoju.', roomJoinHint: 'Wpisz sześci znaków kod od innego gracza.',
    freeArsenal: 'DARMOWY ARSENAŁ', premiumArsenal: 'ARSENAŁ PRO', allEquipmentStatus: 'Darmowe są tylko pistolety i pistolety maszynowe.',
    smoke: 'DYM', flash: 'BŁYSK', explosion: 'EKSPLOZJA', scopeMagnification: 'POWIĘKSZENIE', scopeDistance: 'ODLEGŁOŚĆ', scopeWind: 'WIATR', scopeAdjust: 'ZEROWANIE CELOWNIKA',
    recordingTitle: 'NAGRYWANIE EKRANU GRY', recordingHint: 'Pięciosekundowy, cichy klip z ekranu gry.', recordingLive: 'Nagrywanie prawdziwego ekranu gry bez dźwięku.', recordingChecking: 'Przygotowywanie nagrania…', recordingSaving: 'ZAPISYWANIE',
    recordingSaved: 'Cichy klip gry zapisano na urządzeniu.', recordingNew: 'NOWE NAGRANIE', recordingCancel: 'ANULUJ NAGRANIE', recordingStart: 'NAGRAJ 5 S', recordingAd: 'REKLAMA', recordingCredit: 'KREDYT',
    recordingUnsupported: 'WYMAGANY SPECJALNY BUILD', recordingEconomy: 'WYMAGANE POŁĄCZENIE EKONOMII', recordingNoDevice: 'Nagrywanie ekranu nie jest obsługiwane na tym urządzeniu.', recordingError: 'Nie udało się zakończyć nagrywania ekranu.', recordingShare: 'Udostępnij klip', recordingPrepare: 'PRZYGOTUJ NAGRANIE',
  },
  sv: {
    winner: 'Vinnare',
    roomCode: 'RUMSKOD', playerName: 'SPELARNAMN', createRoom: 'SKAPA RUM', joinRoom: 'GÅ MED I RUM', teamRed: 'RÖDA LAGET', teamBlue: 'BLÅ LAGET',
    playerMarker: 'DIN MARKÖR', markerHint: 'Motståndarens kamera känner igen denna färg och siffra. Håll skärmen synlig.', startRequirements: 'Gå in direkt, även ensam. Andra spelare kan ansluta senare med rumskoden.', waitingHost: 'Väntar på att rumsvärden ska starta striden…',
    serverChecking: 'Kontrollerar serveranslutning…', roomCreateHint: 'Servern skapar en ny rumskod.', roomJoinHint: 'Ange den sex tecken långa koden från en annan spelare.',
    freeArsenal: 'GRATIS ARSENAL', premiumArsenal: 'PRO-ARSENAL', allEquipmentStatus: 'Endast pistoler och kulsprutepistoler är gratis.',
    smoke: 'RÖK', flash: 'BLIXT', explosion: 'EXPLOSION', scopeMagnification: 'FÖRSTORING', scopeDistance: 'AVSTÅND', scopeWind: 'VIND', scopeAdjust: 'NOLLSTÄLL SIKTE',
    recordingTitle: 'SPELSKÄRMSINSPELNING', recordingHint: 'Ett ljudlöst femsekundersklipp av spelskärmen.', recordingLive: 'Spelar in den riktiga spelskärmen utan ljud.', recordingChecking: 'Förbereder inspelning…', recordingSaving: 'SPARAR',
    recordingSaved: 'Det ljudlösa spelklippet sparades på enheten.', recordingNew: 'NY INSPELNING', recordingCancel: 'AVBRYT INSPELNING', recordingStart: 'SPELA IN 5 S', recordingAd: 'ANNONS', recordingCredit: 'KREDIT',
    recordingUnsupported: 'ANPASSAD BUILD KRÄVS', recordingEconomy: 'EKONOMISK ANSLUTNING KRÄVS', recordingNoDevice: 'Skärminspelning stöds inte på den här enheten.', recordingError: 'Skärminspelningen kunde inte slutföras.', recordingShare: 'Dela klipp', recordingPrepare: 'FÖRBERED INSPELNING',
  },
  fa: {
    winner: 'برنده',
    roomCode: 'کد اتاق', playerName: 'نام بازیکن', createRoom: 'ساخت اتاق', joinRoom: 'ورود به اتاق', teamRed: 'تیم قرمز', teamBlue: 'تیم آبی',
    playerMarker: 'نشان شما', markerHint: 'دوربین حریف این رنگ و شماره را می‌شناسد. صفحه را قابل مشاهده نگه دارید.', startRequirements: 'حتی اگر تنها هستید، فوراً وارد شوید. بازیکنان دیگر می‌توانند بعداً با استفاده از کد اتاق ملحق شوند.', waitingHost: 'در انتظار شروع نبرد توسط صاحب اتاق…',
    serverChecking: 'در حال بررسی اتصال سرور…', roomCreateHint: 'سرور یک کد اتاق جدید می‌سازد.', roomJoinHint: 'کد شش‌حرفی بازیکن دیگر را وارد کنید.',
    freeArsenal: 'زرادخانه رایگان', premiumArsenal: 'زرادخانه PRO', allEquipmentStatus: 'فقط تپانچه‌ها و مسلسل‌های سبک رایگان هستند.',
    smoke: 'دود', flash: 'فلاش', explosion: 'انفجار', scopeMagnification: 'بزرگ‌نمایی', scopeDistance: 'فاصله', scopeWind: 'باد', scopeAdjust: 'تنظیم دوربین',
    recordingTitle: 'ضبط صفحه بازی', recordingHint: 'کلیپ پنج‌ثانیه‌ای بی‌صدا از صفحه بازی.', recordingLive: 'صفحه واقعی بازی بدون صدا در حال ضبط است.', recordingChecking: 'در حال آماده‌سازی ضبط…', recordingSaving: 'در حال ذخیره',
    recordingSaved: 'کلیپ بی‌صدای بازی در دستگاه ذخیره شد.', recordingNew: 'ضبط جدید', recordingCancel: 'لغو ضبط', recordingStart: 'ضبط ۵ ثانیه', recordingAd: 'تبلیغ', recordingCredit: 'اعتبار',
    recordingUnsupported: 'نسخه ویژه لازم است', recordingEconomy: 'اتصال اقتصاد لازم است', recordingNoDevice: 'ضبط صفحه در این دستگاه پشتیبانی نمی‌شود.', recordingError: 'ضبط صفحه کامل نشد.', recordingShare: 'اشتراک‌گذاری کلیپ', recordingPrepare: 'آماده‌سازی ضبط',
  },
};

const PERMISSION_COPY: Record<Locale, Record<PermissionUiCopyKey, string>> = {
  tr: { cameraPermissionDenied: 'Kamera izni reddedildi. Tarayıcı ayarlarından kameraya izin verip tekrar dene.', cameraUnavailable: 'Bu cihazda kamera kullanılamıyor. İstersen kamerayı kullanmadan devam edebilirsin.', cameraUnavailableTitle: 'Kamera görüntüsü yok', continueWithoutCamera: 'KAMERA OLMADAN DEVAM ET', recordingDeferred: 'KAYIT SEÇİLENE KADAR BEKLETİLDİ', openInNewTab: 'YENİ SEKMEDE AÇ' },
  en: { cameraPermissionDenied: 'Camera permission was denied. Allow it in browser settings, then retry.', cameraUnavailable: 'Camera is unavailable on this device. You can continue without camera.', cameraUnavailableTitle: 'Camera unavailable', continueWithoutCamera: 'CONTINUE WITHOUT CAMERA', recordingDeferred: 'DEFERRED UNTIL RECORDING IS CHOSEN', openInNewTab: 'OPEN IN NEW TAB' },
  zh: { cameraPermissionDenied: '相机权限被拒绝。请在浏览器设置中允许相机，然后重试。', cameraUnavailable: '此设备无法使用相机。你可以不使用相机继续。', cameraUnavailableTitle: '相机不可用', continueWithoutCamera: '不使用相机继续', recordingDeferred: '仅在选择录制时请求', openInNewTab: '在新标签页打开' },
  ja: { cameraPermissionDenied: 'カメラの権限が拒否されました。ブラウザー設定で許可してから再試行してください。', cameraUnavailable: 'この端末ではカメラを利用できません。カメラなしで続行できます。', cameraUnavailableTitle: 'カメラを利用できません', continueWithoutCamera: 'カメラなしで続行', recordingDeferred: '録画を選択するまで保留', openInNewTab: '新しいタブで開く' },
  ar: { cameraPermissionDenied: 'رُفض إذن الكاميرا. اسمح بها من إعدادات المتصفح ثم أعد المحاولة.', cameraUnavailable: 'الكاميرا غير متاحة على هذا الجهاز. يمكنك المتابعة دون كاميرا.', cameraUnavailableTitle: 'الكاميرا غير متاحة', continueWithoutCamera: 'المتابعة دون كاميرا', recordingDeferred: 'مؤجل حتى اختيار التسجيل', openInNewTab: 'فتح في علامة تبويب جديدة' },
  de: { cameraPermissionDenied: 'Kameraberechtigung abgelehnt. Erlaube sie in den Browsereinstellungen und versuche es erneut.', cameraUnavailable: 'Die Kamera ist auf diesem Gerät nicht verfügbar. Du kannst ohne Kamera fortfahren.', cameraUnavailableTitle: 'Kamera nicht verfügbar', continueWithoutCamera: 'OHNE KAMERA FORTFAHREN', recordingDeferred: 'ZURÜCKGESTELLT, BIS AUFNAHME GEWÄHLT WIRD', openInNewTab: 'IN NEUEM TAB ÖFFNEN' },
  fr: { cameraPermissionDenied: 'Autorisation de caméra refusée. Autorisez-la dans les paramètres du navigateur, puis réessayez.', cameraUnavailable: 'La caméra est indisponible sur cet appareil. Vous pouvez continuer sans caméra.', cameraUnavailableTitle: 'Caméra indisponible', continueWithoutCamera: 'CONTINUER SANS CAMÉRA', recordingDeferred: 'DIFFÉRÉ JUSQU’AU CHOIX DE L’ENREGISTREMENT', openInNewTab: 'OUVRIR DANS UN NOUVEL ONGLET' },
  es: { cameraPermissionDenied: 'Permiso de cámara rechazado. Permítelo en la configuración del navegador y vuelve a intentarlo.', cameraUnavailable: 'La cámara no está disponible en este dispositivo. Puedes continuar sin cámara.', cameraUnavailableTitle: 'Cámara no disponible', continueWithoutCamera: 'CONTINUAR SIN CÁMARA', recordingDeferred: 'POSPUESTO HASTA ELEGIR GRABAR', openInNewTab: 'ABRIR EN UNA PESTAÑA NUEVA' },
  it: { cameraPermissionDenied: 'Permesso fotocamera negato. Consentilo nelle impostazioni del browser e riprova.', cameraUnavailable: 'La fotocamera non è disponibile su questo dispositivo. Puoi continuare senza fotocamera.', cameraUnavailableTitle: 'Fotocamera non disponibile', continueWithoutCamera: 'CONTINUA SENZA FOTOCAMERA', recordingDeferred: 'RIMANDATO FINCHÉ NON SCEGLI DI REGISTRARE', openInNewTab: 'APRI IN UNA NUOVA SCHEDA' },
  pt: { cameraPermissionDenied: 'Permissão da câmera negada. Permita-a nas configurações do navegador e tente novamente.', cameraUnavailable: 'A câmera não está disponível neste dispositivo. Você pode continuar sem câmera.', cameraUnavailableTitle: 'Câmera indisponível', continueWithoutCamera: 'CONTINUAR SEM CÂMERA', recordingDeferred: 'ADIADO ATÉ ESCOLHER GRAVAR', openInNewTab: 'ABRIR EM NOVA ABA' },
  ru: { cameraPermissionDenied: 'Доступ к камере запрещён. Разрешите его в настройках браузера и повторите попытку.', cameraUnavailable: 'Камера недоступна на этом устройстве. Можно продолжить без камеры.', cameraUnavailableTitle: 'Камера недоступна', continueWithoutCamera: 'ПРОДОЛЖИТЬ БЕЗ КАМЕРЫ', recordingDeferred: 'ОТЛОЖЕНО ДО ВЫБОРА ЗАПИСИ', openInNewTab: 'ОТКРЫТЬ В НОВОЙ ВКЛАДКЕ' },
  uk: { cameraPermissionDenied: 'Доступ до камери заборонено. Дозвольте його в налаштуваннях браузера й повторіть спробу.', cameraUnavailable: 'Камера недоступна на цьому пристрої. Можна продовжити без камери.', cameraUnavailableTitle: 'Камера недоступна', continueWithoutCamera: 'ПРОДОВЖИТИ БЕЗ КАМЕРИ', recordingDeferred: 'ВІДКЛАДЕНО ДО ВИБОРУ ЗАПИСУ', openInNewTab: 'ВІДКРИТИ В НОВІЙ ВКЛАДЦІ' },
  hi: { cameraPermissionDenied: 'कैमरा अनुमति अस्वीकार हुई। ब्राउज़र सेटिंग में अनुमति दें और फिर प्रयास करें।', cameraUnavailable: 'इस डिवाइस पर कैमरा उपलब्ध नहीं है। आप कैमरे के बिना जारी रख सकते हैं।', cameraUnavailableTitle: 'कैमरा उपलब्ध नहीं', continueWithoutCamera: 'कैमरे के बिना जारी रखें', recordingDeferred: 'रिकॉर्डिंग चुनने तक स्थगित', openInNewTab: 'नए टैब में खोलें' },
  ur: { cameraPermissionDenied: 'کیمرہ اجازت مسترد ہو گئی۔ براؤزر کی ترتیبات میں اجازت دے کر دوبارہ کوشش کریں۔', cameraUnavailable: 'اس ڈیوائس پر کیمرہ دستیاب نہیں۔ آپ کیمرے کے بغیر جاری رکھ سکتے ہیں۔', cameraUnavailableTitle: 'کیمرہ دستیاب نہیں', continueWithoutCamera: 'کیمرے کے بغیر جاری رکھیں', recordingDeferred: 'ریکارڈنگ منتخب کرنے تک مؤخر', openInNewTab: 'نئے ٹیب میں کھولیں' },
  bn: { cameraPermissionDenied: 'ক্যামেরার অনুমতি প্রত্যাখ্যাত হয়েছে। ব্রাউজার সেটিংসে অনুমতি দিয়ে আবার চেষ্টা করুন।', cameraUnavailable: 'এই ডিভাইসে ক্যামেরা উপলব্ধ নয়। আপনি ক্যামেরা ছাড়াই এগোতে পারেন।', cameraUnavailableTitle: 'ক্যামেরা উপলব্ধ নয়', continueWithoutCamera: 'ক্যামেরা ছাড়া এগিয়ে যান', recordingDeferred: 'রেকর্ডিং বেছে নেওয়া পর্যন্ত স্থগিত', openInNewTab: 'নতুন ট্যাবে খুলুন' },
  pa: { cameraPermissionDenied: 'ਕੈਮਰਾ ਇਜਾਜ਼ਤ ਰੱਦ ਹੋ ਗਈ। ਬ੍ਰਾਊਜ਼ਰ ਸੈਟਿੰਗਾਂ ਵਿੱਚ ਇਜਾਜ਼ਤ ਦੇ ਕੇ ਮੁੜ ਕੋਸ਼ਿਸ਼ ਕਰੋ।', cameraUnavailable: 'ਇਸ ਡਿਵਾਈਸ ਉੱਤੇ ਕੈਮਰਾ ਉਪਲਬਧ ਨਹੀਂ। ਤੁਸੀਂ ਕੈਮਰੇ ਤੋਂ ਬਿਨਾਂ ਜਾਰੀ ਰੱਖ ਸਕਦੇ ਹੋ।', cameraUnavailableTitle: 'ਕੈਮਰਾ ਉਪਲਬਧ ਨਹੀਂ', continueWithoutCamera: 'ਕੈਮਰੇ ਤੋਂ ਬਿਨਾਂ ਜਾਰੀ ਰੱਖੋ', recordingDeferred: 'ਰਿਕਾਰਡਿੰਗ ਚੁਣਨ ਤੱਕ ਮੁਲਤਵੀ', openInNewTab: 'ਨਵੀਂ ਟੈਬ ਵਿੱਚ ਖੋਲ੍ਹੋ' },
  id: { cameraPermissionDenied: 'Izin kamera ditolak. Izinkan di pengaturan browser, lalu coba lagi.', cameraUnavailable: 'Kamera tidak tersedia di perangkat ini. Anda dapat melanjutkan tanpa kamera.', cameraUnavailableTitle: 'Kamera tidak tersedia', continueWithoutCamera: 'LANJUTKAN TANPA KAMERA', recordingDeferred: 'DITUNDA SAMPAI REKAMAN DIPILIH', openInNewTab: 'BUKA DI TAB BARU' },
  ko: { cameraPermissionDenied: '카메라 권한이 거부되었습니다. 브라우저 설정에서 허용한 뒤 다시 시도하세요.', cameraUnavailable: '이 기기에서는 카메라를 사용할 수 없습니다. 카메라 없이 계속할 수 있습니다.', cameraUnavailableTitle: '카메라를 사용할 수 없음', continueWithoutCamera: '카메라 없이 계속', recordingDeferred: '녹화를 선택할 때까지 보류', openInNewTab: '새 탭에서 열기' },
  vi: { cameraPermissionDenied: 'Quyền máy ảnh bị từ chối. Cho phép trong cài đặt trình duyệt rồi thử lại.', cameraUnavailable: 'Máy ảnh không khả dụng trên thiết bị này. Bạn có thể tiếp tục không cần máy ảnh.', cameraUnavailableTitle: 'Máy ảnh không khả dụng', continueWithoutCamera: 'TIẾP TỤC KHÔNG CÓ MÁY ẢNH', recordingDeferred: 'HOÃN ĐẾN KHI CHỌN GHI', openInNewTab: 'MỞ TRONG TAB MỚI' },
  th: { cameraPermissionDenied: 'การอนุญาตใช้กล้องถูกปฏิเสธ ให้เปิดใช้ในการตั้งค่าเบราว์เซอร์แล้วลองอีกครั้ง', cameraUnavailable: 'อุปกรณ์นี้ไม่มีกล้องให้ใช้งาน คุณสามารถดำเนินการต่อโดยไม่ใช้กล้อง', cameraUnavailableTitle: 'กล้องไม่พร้อมใช้งาน', continueWithoutCamera: 'ดำเนินการต่อโดยไม่ใช้กล้อง', recordingDeferred: 'เลื่อนจนกว่าจะเลือกบันทึก', openInNewTab: 'เปิดในแท็บใหม่' },
  nl: { cameraPermissionDenied: 'Cameratoestemming geweigerd. Sta dit toe in de browserinstellingen en probeer opnieuw.', cameraUnavailable: 'De camera is niet beschikbaar op dit apparaat. Je kunt zonder camera doorgaan.', cameraUnavailableTitle: 'Camera niet beschikbaar', continueWithoutCamera: 'DOORGAAN ZONDER CAMERA', recordingDeferred: 'UITGESTELD TOT JE OPNEMEN KIEST', openInNewTab: 'OPENEN IN NIEUW TABBLAD' },
  pl: { cameraPermissionDenied: 'Odmówiono dostępu do kamery. Zezwól na niego w ustawieniach przeglądarki i spróbuj ponownie.', cameraUnavailable: 'Kamera jest niedostępna na tym urządzeniu. Możesz kontynuować bez kamery.', cameraUnavailableTitle: 'Kamera niedostępna', continueWithoutCamera: 'KONTYNUUJ BEZ KAMERY', recordingDeferred: 'ODROCZONE DO WYBORU NAGRYWANIA', openInNewTab: 'OTWÓRZ W NOWEJ KARCIE' },
  sv: { cameraPermissionDenied: 'Kamerabehörighet nekades. Tillåt den i webbläsarens inställningar och försök igen.', cameraUnavailable: 'Kameran är inte tillgänglig på den här enheten. Du kan fortsätta utan kamera.', cameraUnavailableTitle: 'Kamera inte tillgänglig', continueWithoutCamera: 'FORTSÄTT UTAN KAMERA', recordingDeferred: 'UPPSKJUTET TILLS INSPELNING VÄLJS', openInNewTab: 'ÖPPNA I NY FLIK' },
  fa: { cameraPermissionDenied: 'دسترسی دوربین رد شد. در تنظیمات مرورگر اجازه دهید و دوباره تلاش کنید.', cameraUnavailable: 'دوربین در این دستگاه در دسترس نیست. می‌توانید بدون دوربین ادامه دهید.', cameraUnavailableTitle: 'دوربین در دسترس نیست', continueWithoutCamera: 'ادامه بدون دوربین', recordingDeferred: 'تا انتخاب ضبط به تعویق افتاد', openInNewTab: 'باز کردن در زبانه جدید' },
};

export function uiText(locale: Locale, key: UiCopyKey): string {
  if (key in PERMISSION_COPY[locale]) return PERMISSION_COPY[locale][key as PermissionUiCopyKey];
  return UI_COPY[locale][key as Exclude<UiCopyKey, PermissionUiCopyKey>];
}