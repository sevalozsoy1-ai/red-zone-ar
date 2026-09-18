import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/hooks/useColors';
import { useI18n } from '@/hooks/useI18n';
import type { Locale } from '@/lib/i18n';
import {
  selectCameraPerformanceProfile,
  type CameraPerformanceProfile,
} from '@/lib/camera-performance';

const NOTICE_KEY = 'camera-performance-notice-v1';

type NoticeCopy = {
  title: string;
  body: string;
  minimum: string;
  recommended: string;
  profile: string;
  profiles: Record<CameraPerformanceProfile, string>;
  acknowledge: string;
};

const COPY: Record<Locale, NoticeCopy> = {
  tr: { title: 'CİHAZ VE PERFORMANS', body: 'Oyun bu cihazda çalışır. Kamera akıcılığı ve hedef algılama; işlemci, bellek, kamera sürücüsü, sıcaklık ve pil tasarrufuna göre değişebilir. Uygulama analiz kalitesini otomatik ayarlar.', minimum: 'Asgari: Android 9, 4 GB RAM, 64-bit 8 çekirdekli işlemci, OpenGL ES 3.0 ve otomatik odaklamalı arka kamera.', recommended: 'Önerilen: Android 12+, 6 GB RAM ve Snapdragon 720G / Helio G99 / Kirin 810 veya üzeri.', profile: 'Otomatik profil', profiles: { quality: 'Yüksek', balanced: 'Dengeli', compatibility: 'Uyumluluk' }, acknowledge: 'ANLADIM, DEVAM ET' },
  en: { title: 'DEVICE AND PERFORMANCE', body: 'The game will run on this device. Camera smoothness and target detection may vary with the processor, memory, camera driver, temperature, and battery saver. Analysis quality is adjusted automatically.', minimum: 'Minimum: Android 9, 4 GB RAM, 64-bit 8-core processor, OpenGL ES 3.0, and an autofocus rear camera.', recommended: 'Recommended: Android 12+, 6 GB RAM, and Snapdragon 720G / Helio G99 / Kirin 810 or better.', profile: 'Automatic profile', profiles: { quality: 'High', balanced: 'Balanced', compatibility: 'Compatibility' }, acknowledge: 'I UNDERSTAND, CONTINUE' },
  zh: { title: '设备与性能', body: '游戏可在此设备上运行。相机流畅度和目标检测会受处理器、内存、相机驱动、温度和省电模式影响。应用会自动调整分析质量。', minimum: '最低：Android 9、4 GB 内存、64 位八核处理器、OpenGL ES 3.0 和自动对焦后置相机。', recommended: '推荐：Android 12+、6 GB 内存及 Snapdragon 720G / Helio G99 / Kirin 810 或更高。', profile: '自动配置', profiles: { quality: '高', balanced: '均衡', compatibility: '兼容' }, acknowledge: '我已了解，继续' },
  ja: { title: '端末とパフォーマンス', body: 'この端末でもゲームは動作します。カメラの滑らかさとターゲット検出は、CPU、メモリ、カメラドライバー、温度、省電力設定により変化します。解析品質は自動調整されます。', minimum: '最低：Android 9、4 GB RAM、64ビット8コアCPU、OpenGL ES 3.0、オートフォーカス背面カメラ。', recommended: '推奨：Android 12以上、6 GB RAM、Snapdragon 720G / Helio G99 / Kirin 810以上。', profile: '自動プロファイル', profiles: { quality: '高', balanced: 'バランス', compatibility: '互換' }, acknowledge: '確認して続行' },
  ar: { title: 'الجهاز والأداء', body: 'ستعمل اللعبة على هذا الجهاز. قد تختلف سلاسة الكاميرا واكتشاف الهدف حسب المعالج والذاكرة وبرنامج الكاميرا والحرارة وتوفير الطاقة. تُضبط جودة التحليل تلقائيًا.', minimum: 'الحد الأدنى: Android 9 وذاكرة 4 GB ومعالج 64 بت ثماني النواة وOpenGL ES 3.0 وكاميرا خلفية بتركيز تلقائي.', recommended: 'الموصى به: Android 12+ وذاكرة 6 GB وSnapdragon 720G أو Helio G99 أو Kirin 810 أو أفضل.', profile: 'الوضع التلقائي', profiles: { quality: 'عالٍ', balanced: 'متوازن', compatibility: 'توافق' }, acknowledge: 'فهمت، متابعة' },
  de: { title: 'GERÄT UND LEISTUNG', body: 'Das Spiel läuft auf diesem Gerät. Kameraflüssigkeit und Zielerkennung können je nach Prozessor, Speicher, Kameratreiber, Temperatur und Energiesparmodus variieren. Die Analysequalität wird automatisch angepasst.', minimum: 'Minimum: Android 9, 4 GB RAM, 64-Bit-Achtkernprozessor, OpenGL ES 3.0 und Autofokus-Rückkamera.', recommended: 'Empfohlen: Android 12+, 6 GB RAM und Snapdragon 720G / Helio G99 / Kirin 810 oder besser.', profile: 'Automatisches Profil', profiles: { quality: 'Hoch', balanced: 'Ausgewogen', compatibility: 'Kompatibilität' }, acknowledge: 'VERSTANDEN, WEITER' },
  fr: { title: 'APPAREIL ET PERFORMANCES', body: 'Le jeu fonctionne sur cet appareil. La fluidité de la caméra et la détection peuvent varier selon le processeur, la mémoire, le pilote caméra, la température et l’économie d’énergie. La qualité d’analyse est ajustée automatiquement.', minimum: 'Minimum : Android 9, 4 Go de RAM, processeur 64 bits à 8 cœurs, OpenGL ES 3.0 et caméra arrière autofocus.', recommended: 'Recommandé : Android 12+, 6 Go de RAM et Snapdragon 720G / Helio G99 / Kirin 810 ou supérieur.', profile: 'Profil automatique', profiles: { quality: 'Élevé', balanced: 'Équilibré', compatibility: 'Compatibilité' }, acknowledge: 'J’AI COMPRIS, CONTINUER' },
  es: { title: 'DISPOSITIVO Y RENDIMIENTO', body: 'El juego funcionará en este dispositivo. La fluidez de la cámara y la detección pueden variar según el procesador, la memoria, el controlador de cámara, la temperatura y el ahorro de batería. La calidad se ajusta automáticamente.', minimum: 'Mínimo: Android 9, 4 GB de RAM, procesador de 64 bits y 8 núcleos, OpenGL ES 3.0 y cámara trasera con autoenfoque.', recommended: 'Recomendado: Android 12+, 6 GB de RAM y Snapdragon 720G / Helio G99 / Kirin 810 o superior.', profile: 'Perfil automático', profiles: { quality: 'Alto', balanced: 'Equilibrado', compatibility: 'Compatibilidad' }, acknowledge: 'ENTIENDO, CONTINUAR' },
  it: { title: 'DISPOSITIVO E PRESTAZIONI', body: 'Il gioco funziona su questo dispositivo. Fluidità della fotocamera e rilevamento possono variare in base a processore, memoria, driver, temperatura e risparmio energetico. La qualità viene regolata automaticamente.', minimum: 'Minimo: Android 9, 4 GB RAM, processore 64 bit a 8 core, OpenGL ES 3.0 e fotocamera posteriore autofocus.', recommended: 'Consigliato: Android 12+, 6 GB RAM e Snapdragon 720G / Helio G99 / Kirin 810 o superiore.', profile: 'Profilo automatico', profiles: { quality: 'Alto', balanced: 'Bilanciato', compatibility: 'Compatibilità' }, acknowledge: 'HO CAPITO, CONTINUA' },
  pt: { title: 'DISPOSITIVO E DESEMPENHO', body: 'O jogo funciona neste dispositivo. A fluidez da câmera e a detecção podem variar conforme processador, memória, driver, temperatura e economia de bateria. A qualidade é ajustada automaticamente.', minimum: 'Mínimo: Android 9, 4 GB de RAM, processador 64 bits de 8 núcleos, OpenGL ES 3.0 e câmera traseira com foco automático.', recommended: 'Recomendado: Android 12+, 6 GB de RAM e Snapdragon 720G / Helio G99 / Kirin 810 ou superior.', profile: 'Perfil automático', profiles: { quality: 'Alto', balanced: 'Equilibrado', compatibility: 'Compatibilidade' }, acknowledge: 'ENTENDI, CONTINUAR' },
  ru: { title: 'УСТРОЙСТВО И ПРОИЗВОДИТЕЛЬНОСТЬ', body: 'Игра работает на этом устройстве. Плавность камеры и обнаружение цели зависят от процессора, памяти, драйвера камеры, температуры и энергосбережения. Качество анализа настраивается автоматически.', minimum: 'Минимум: Android 9, 4 ГБ ОЗУ, 64-битный 8-ядерный процессор, OpenGL ES 3.0 и задняя камера с автофокусом.', recommended: 'Рекомендуется: Android 12+, 6 ГБ ОЗУ и Snapdragon 720G / Helio G99 / Kirin 810 или лучше.', profile: 'Автопрофиль', profiles: { quality: 'Высокий', balanced: 'Баланс', compatibility: 'Совместимость' }, acknowledge: 'ПОНЯТНО, ПРОДОЛЖИТЬ' },
  uk: { title: 'ПРИСТРІЙ І ПРОДУКТИВНІСТЬ', body: 'Гра працює на цьому пристрої. Плавність камери й виявлення цілі залежать від процесора, пам’яті, драйвера камери, температури та енергозбереження. Якість аналізу налаштовується автоматично.', minimum: 'Мінімум: Android 9, 4 ГБ ОЗП, 64-бітний 8-ядерний процесор, OpenGL ES 3.0 та задня камера з автофокусом.', recommended: 'Рекомендовано: Android 12+, 6 ГБ ОЗП і Snapdragon 720G / Helio G99 / Kirin 810 або краще.', profile: 'Автопрофіль', profiles: { quality: 'Високий', balanced: 'Баланс', compatibility: 'Сумісність' }, acknowledge: 'ЗРОЗУМІЛО, ПРОДОВЖИТИ' },
  hi: { title: 'डिवाइस और प्रदर्शन', body: 'गेम इस डिवाइस पर चलेगा। कैमरा प्रवाह और लक्ष्य पहचान प्रोसेसर, मेमोरी, कैमरा ड्राइवर, तापमान और बैटरी सेवर के अनुसार बदल सकते हैं। विश्लेषण गुणवत्ता अपने आप समायोजित होती है।', minimum: 'न्यूनतम: Android 9, 4 GB RAM, 64-बिट 8-कोर प्रोसेसर, OpenGL ES 3.0 और ऑटोफोकस पिछला कैमरा।', recommended: 'अनुशंसित: Android 12+, 6 GB RAM और Snapdragon 720G / Helio G99 / Kirin 810 या बेहतर।', profile: 'स्वचालित प्रोफ़ाइल', profiles: { quality: 'उच्च', balanced: 'संतुलित', compatibility: 'अनुकूलता' }, acknowledge: 'समझ गया, जारी रखें' },
  ur: { title: 'ڈیوائس اور کارکردگی', body: 'گیم اس ڈیوائس پر چلے گی۔ کیمرہ روانی اور ہدف کی شناخت پروسیسر، میموری، کیمرہ ڈرائیور، درجہ حرارت اور بیٹری سیور کے مطابق بدل سکتی ہے۔ معیار خودکار طور پر ایڈجسٹ ہوتا ہے۔', minimum: 'کم از کم: Android 9، 4 GB RAM، 64 بٹ 8 کور پروسیسر، OpenGL ES 3.0 اور آٹو فوکس پچھلا کیمرہ۔', recommended: 'تجویز کردہ: Android 12+، 6 GB RAM اور Snapdragon 720G / Helio G99 / Kirin 810 یا بہتر۔', profile: 'خودکار پروفائل', profiles: { quality: 'اعلیٰ', balanced: 'متوازن', compatibility: 'مطابقت' }, acknowledge: 'سمجھ گیا، جاری رکھیں' },
  bn: { title: 'ডিভাইস ও কর্মক্ষমতা', body: 'গেমটি এই ডিভাইসে চলবে। ক্যামেরার মসৃণতা ও লক্ষ্য শনাক্তকরণ প্রসেসর, মেমরি, ক্যামেরা ড্রাইভার, তাপমাত্রা ও ব্যাটারি সেভারের ওপর নির্ভর করতে পারে। মান স্বয়ংক্রিয়ভাবে সামঞ্জস্য হয়।', minimum: 'ন্যূনতম: Android 9, 4 GB RAM, 64-বিট 8-কোর প্রসেসর, OpenGL ES 3.0 এবং অটোফোকাস পেছনের ক্যামেরা।', recommended: 'প্রস্তাবিত: Android 12+, 6 GB RAM এবং Snapdragon 720G / Helio G99 / Kirin 810 বা উন্নত।', profile: 'স্বয়ংক্রিয় প্রোফাইল', profiles: { quality: 'উচ্চ', balanced: 'ভারসাম্য', compatibility: 'সামঞ্জস্য' }, acknowledge: 'বুঝেছি, চালিয়ে যান' },
  pa: { title: 'ਡਿਵਾਈਸ ਅਤੇ ਕਾਰਗੁਜ਼ਾਰੀ', body: 'ਗੇਮ ਇਸ ਡਿਵਾਈਸ ਉੱਤੇ ਚੱਲੇਗੀ। ਕੈਮਰਾ ਸੁਚਾਰੂਤਾ ਅਤੇ ਨਿਸ਼ਾਨਾ ਪਛਾਣ ਪ੍ਰੋਸੈਸਰ, ਮੈਮੋਰੀ, ਕੈਮਰਾ ਡਰਾਈਵਰ, ਤਾਪਮਾਨ ਅਤੇ ਬੈਟਰੀ ਸੇਵਰ ਅਨੁਸਾਰ ਬਦਲ ਸਕਦੀ ਹੈ। ਗੁਣਵੱਤਾ ਆਪਣੇ ਆਪ ਠੀਕ ਹੁੰਦੀ ਹੈ।', minimum: 'ਘੱਟੋ-ਘੱਟ: Android 9, 4 GB RAM, 64-ਬਿਟ 8-ਕੋਰ ਪ੍ਰੋਸੈਸਰ, OpenGL ES 3.0 ਅਤੇ ਆਟੋਫੋਕਸ ਪਿਛਲਾ ਕੈਮਰਾ।', recommended: 'ਸਿਫਾਰਸ਼ੀ: Android 12+, 6 GB RAM ਅਤੇ Snapdragon 720G / Helio G99 / Kirin 810 ਜਾਂ ਵਧੀਆ।', profile: 'ਆਟੋਮੈਟਿਕ ਪ੍ਰੋਫਾਈਲ', profiles: { quality: 'ਉੱਚ', balanced: 'ਸੰਤੁਲਿਤ', compatibility: 'ਅਨੁਕੂਲਤਾ' }, acknowledge: 'ਸਮਝ ਗਿਆ, ਜਾਰੀ ਰੱਖੋ' },
  id: { title: 'PERANGKAT DAN PERFORMA', body: 'Game dapat berjalan di perangkat ini. Kelancaran kamera dan deteksi target dapat berubah sesuai prosesor, memori, driver kamera, suhu, dan penghemat baterai. Kualitas analisis disesuaikan otomatis.', minimum: 'Minimum: Android 9, RAM 4 GB, prosesor 64-bit 8-core, OpenGL ES 3.0, dan kamera belakang autofokus.', recommended: 'Disarankan: Android 12+, RAM 6 GB, dan Snapdragon 720G / Helio G99 / Kirin 810 atau lebih tinggi.', profile: 'Profil otomatis', profiles: { quality: 'Tinggi', balanced: 'Seimbang', compatibility: 'Kompatibilitas' }, acknowledge: 'SAYA MENGERTI, LANJUTKAN' },
  ko: { title: '기기 및 성능', body: '이 기기에서도 게임이 실행됩니다. 카메라 부드러움과 표적 감지는 프로세서, 메모리, 카메라 드라이버, 온도 및 절전 설정에 따라 달라질 수 있습니다. 분석 품질은 자동 조정됩니다.', minimum: '최소: Android 9, 4 GB RAM, 64비트 8코어 프로세서, OpenGL ES 3.0, 자동 초점 후면 카메라.', recommended: '권장: Android 12+, 6 GB RAM, Snapdragon 720G / Helio G99 / Kirin 810 이상.', profile: '자동 프로필', profiles: { quality: '높음', balanced: '균형', compatibility: '호환' }, acknowledge: '확인, 계속' },
  vi: { title: 'THIẾT BỊ VÀ HIỆU NĂNG', body: 'Trò chơi chạy được trên thiết bị này. Độ mượt camera và nhận diện mục tiêu có thể thay đổi theo bộ xử lý, bộ nhớ, trình điều khiển camera, nhiệt độ và tiết kiệm pin. Chất lượng được tự động điều chỉnh.', minimum: 'Tối thiểu: Android 9, RAM 4 GB, bộ xử lý 64-bit 8 nhân, OpenGL ES 3.0 và camera sau tự động lấy nét.', recommended: 'Khuyến nghị: Android 12+, RAM 6 GB và Snapdragon 720G / Helio G99 / Kirin 810 trở lên.', profile: 'Cấu hình tự động', profiles: { quality: 'Cao', balanced: 'Cân bằng', compatibility: 'Tương thích' }, acknowledge: 'ĐÃ HIỂU, TIẾP TỤC' },
  th: { title: 'อุปกรณ์และประสิทธิภาพ', body: 'เกมทำงานบนอุปกรณ์นี้ได้ ความลื่นไหลของกล้องและการตรวจจับเป้าหมายอาจต่างกันตามหน่วยประมวลผล หน่วยความจำ ไดรเวอร์กล้อง อุณหภูมิ และโหมดประหยัดแบตเตอรี่ คุณภาพจะปรับอัตโนมัติ', minimum: 'ขั้นต่ำ: Android 9, RAM 4 GB, หน่วยประมวลผล 64 บิต 8 คอร์, OpenGL ES 3.0 และกล้องหลังออโต้โฟกัส', recommended: 'แนะนำ: Android 12+, RAM 6 GB และ Snapdragon 720G / Helio G99 / Kirin 810 หรือสูงกว่า', profile: 'โปรไฟล์อัตโนมัติ', profiles: { quality: 'สูง', balanced: 'สมดุล', compatibility: 'เข้ากันได้' }, acknowledge: 'เข้าใจแล้ว ดำเนินการต่อ' },
  nl: { title: 'APPARAAT EN PRESTATIES', body: 'Het spel werkt op dit apparaat. Cameravloeiendheid en doeldetectie kunnen variëren door processor, geheugen, camerastuurprogramma, temperatuur en batterijbesparing. De analysekwaliteit wordt automatisch aangepast.', minimum: 'Minimum: Android 9, 4 GB RAM, 64-bits 8-coreprocessor, OpenGL ES 3.0 en een autofocuscamera achter.', recommended: 'Aanbevolen: Android 12+, 6 GB RAM en Snapdragon 720G / Helio G99 / Kirin 810 of beter.', profile: 'Automatisch profiel', profiles: { quality: 'Hoog', balanced: 'Gebalanceerd', compatibility: 'Compatibiliteit' }, acknowledge: 'BEGREPEN, DOORGAAN' },
  pl: { title: 'URZĄDZENIE I WYDAJNOŚĆ', body: 'Gra działa na tym urządzeniu. Płynność kamery i wykrywanie celu mogą zależeć od procesora, pamięci, sterownika kamery, temperatury i oszczędzania baterii. Jakość analizy jest dostosowywana automatycznie.', minimum: 'Minimum: Android 9, 4 GB RAM, 64-bitowy procesor 8-rdzeniowy, OpenGL ES 3.0 i tylna kamera z autofokusem.', recommended: 'Zalecane: Android 12+, 6 GB RAM i Snapdragon 720G / Helio G99 / Kirin 810 lub lepszy.', profile: 'Profil automatyczny', profiles: { quality: 'Wysoki', balanced: 'Zrównoważony', compatibility: 'Zgodność' }, acknowledge: 'ROZUMIEM, KONTYNUUJ' },
  sv: { title: 'ENHET OCH PRESTANDA', body: 'Spelet fungerar på den här enheten. Kameraflöde och måldetektering kan variera beroende på processor, minne, kameradrivrutin, temperatur och batterisparläge. Analyskvaliteten justeras automatiskt.', minimum: 'Minimum: Android 9, 4 GB RAM, 64-bitars 8-kärnig processor, OpenGL ES 3.0 och bakre kamera med autofokus.', recommended: 'Rekommenderat: Android 12+, 6 GB RAM och Snapdragon 720G / Helio G99 / Kirin 810 eller bättre.', profile: 'Automatisk profil', profiles: { quality: 'Hög', balanced: 'Balanserad', compatibility: 'Kompatibilitet' }, acknowledge: 'JAG FÖRSTÅR, FORTSÄTT' },
  fa: { title: 'دستگاه و عملکرد', body: 'بازی روی این دستگاه اجرا می‌شود. روانی دوربین و تشخیص هدف ممکن است با پردازنده، حافظه، درایور دوربین، دما و ذخیره باتری تغییر کند. کیفیت تحلیل خودکار تنظیم می‌شود.', minimum: 'حداقل: Android 9، رم 4 GB، پردازنده 64 بیتی 8 هسته‌ای، OpenGL ES 3.0 و دوربین پشت با فوکوس خودکار.', recommended: 'پیشنهادی: Android 12+، رم 6 GB و Snapdragon 720G / Helio G99 / Kirin 810 یا بهتر.', profile: 'نمایه خودکار', profiles: { quality: 'بالا', balanced: 'متعادل', compatibility: 'سازگاری' }, acknowledge: 'متوجه شدم، ادامه' },
};

export default function CameraPerformanceNotice() {
  const colors = useColors();
  const { locale, rtl } = useI18n();
  const [visible, setVisible] = useState(false);
  const profile = selectCameraPerformanceProfile(Constants.deviceYearClass);
  const copy = COPY[locale];
  const textAlign = rtl ? 'right' : 'left';

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(NOTICE_KEY)
      .then((value) => {
        if (active && value !== 'acknowledged') setVisible(true);
      })
      .catch(() => {
        if (active) setVisible(true);
      });
    return () => { active = false; };
  }, []);

  const acknowledge = () => {
    void AsyncStorage.setItem(NOTICE_KEY, 'acknowledged');
    setVisible(false);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => undefined}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.foreground, textAlign }]}>{copy.title}</Text>
          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            <Text style={[styles.body, { color: colors.mutedForeground, textAlign }]}>{copy.body}</Text>
            <Text style={[styles.requirement, { color: colors.foreground, textAlign }]}>{copy.minimum}</Text>
            <Text style={[styles.requirement, { color: colors.foreground, textAlign }]}>{copy.recommended}</Text>
            <Text style={[styles.profile, { color: colors.cyan, textAlign }]}>{copy.profile}: {copy.profiles[profile]}</Text>
          </ScrollView>
          <Pressable
            accessibilityRole="button"
            testID="camera-performance-acknowledge"
            onPress={acknowledge}
            style={[styles.button, { backgroundColor: colors.cyan }]}
          >
            <Text style={[styles.buttonText, { color: colors.ink }]}>{copy.acknowledge}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(3,10,9,0.82)', justifyContent: 'center', padding: 22 },
  card: { maxHeight: '82%', borderWidth: 1, borderRadius: 22, padding: 22 },
  title: { fontSize: 21, fontWeight: '900', letterSpacing: 0.8, marginBottom: 14 },
  scroll: { flexGrow: 0 },
  body: { fontSize: 14, lineHeight: 21 },
  requirement: { fontSize: 13, lineHeight: 20, marginTop: 14 },
  profile: { fontSize: 13, fontWeight: '900', marginTop: 16 },
  button: { minHeight: 54, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginTop: 20, paddingHorizontal: 14 },
  buttonText: { fontSize: 12, fontWeight: '900', textAlign: 'center', letterSpacing: 0.8 },
});