import type { Locale } from '@/lib/i18n';

export type BattleSessionCopy = {
  expiredTitle: string;
  expiredMessage: string;
  leaveTitle: string;
  leaveMessage: string;
  leaveConfirm: string;
  leaveCancel: string;
};

/**
 * Session lifecycle copy is kept separate from the general catalogue because
 * it is used only by the multiplayer leave/expiry flow. Every supported
 * locale is still represented explicitly so a connectivity event never falls
 * back to an unrelated language.
 */
const BATTLE_SESSION_COPY: Record<Locale, BattleSessionCopy> = {
  tr: {
    expiredTitle: 'Oda oturumu sona erdi',
    expiredMessage: 'Bağlantı çok uzun süre kesildiği için odadan çıkarıldın. Takıma yeniden katılabilirsin.',
    leaveTitle: 'Savaştan çıkılsın mı?',
    leaveMessage: 'Bu odadan ayrılırsan savaşa geri dönmek için yeniden katılman gerekir.',
    leaveConfirm: 'AYRIL',
    leaveCancel: 'ODADA KAL',
  },
  en: {
    expiredTitle: 'Room session ended',
    expiredMessage: 'You were removed after the connection was inactive too long. You can join the team again.',
    leaveTitle: 'Leave the battle?',
    leaveMessage: 'Leaving this room means you must join again to return to the battle.',
    leaveConfirm: 'LEAVE',
    leaveCancel: 'STAY',
  },
  zh: {
    expiredTitle: '房间会话已结束',
    expiredMessage: '连接长时间不活跃，你已被移出房间。你可以重新加入团队。',
    leaveTitle: '要离开战斗吗？',
    leaveMessage: '离开房间后，必须重新加入才能回到战斗。',
    leaveConfirm: '离开',
    leaveCancel: '留在房间',
  },
  ja: {
    expiredTitle: 'ルームセッションが終了しました',
    expiredMessage: '接続が長時間停止したため、ルームから退出しました。チームには再参加できます。',
    leaveTitle: '戦闘を退出しますか？',
    leaveMessage: 'ルームを退出すると、戻るにはもう一度参加する必要があります。',
    leaveConfirm: '退出',
    leaveCancel: '残る',
  },
  ar: {
    expiredTitle: 'انتهت جلسة الغرفة',
    expiredMessage: 'تمت إزالتك بعد بقاء الاتصال غير نشط مدة طويلة. يمكنك الانضمام إلى الفريق مجددًا.',
    leaveTitle: 'هل تريد مغادرة المعركة؟',
    leaveMessage: 'مغادرة الغرفة تعني أنك ستحتاج إلى الانضمام مجددًا للعودة إلى المعركة.',
    leaveConfirm: 'مغادرة',
    leaveCancel: 'البقاء',
  },
  de: {
    expiredTitle: 'Raumsitzung beendet',
    expiredMessage: 'Du wurdest entfernt, weil die Verbindung zu lange inaktiv war. Du kannst dem Team erneut beitreten.',
    leaveTitle: 'Kampf verlassen?',
    leaveMessage: 'Wenn du den Raum verlässt, musst du erneut beitreten, um zurückzukehren.',
    leaveConfirm: 'VERLASSEN',
    leaveCancel: 'BLEIBEN',
  },
  fr: {
    expiredTitle: 'Session de salle terminée',
    expiredMessage: 'Vous avez été retiré après une trop longue inactivité de la connexion. Vous pouvez rejoindre l’équipe.',
    leaveTitle: 'Quitter la bataille ?',
    leaveMessage: 'En quittant cette salle, vous devrez la rejoindre à nouveau pour revenir au combat.',
    leaveConfirm: 'QUITTER',
    leaveCancel: 'RESTER',
  },
  es: {
    expiredTitle: 'La sesión de la sala terminó',
    expiredMessage: 'Se te eliminó porque la conexión estuvo inactiva demasiado tiempo. Puedes volver a unirte al equipo.',
    leaveTitle: '¿Salir de la batalla?',
    leaveMessage: 'Si sales de esta sala, tendrás que volver a unirte para regresar a la batalla.',
    leaveConfirm: 'SALIR',
    leaveCancel: 'QUEDARME',
  },
  it: {
    expiredTitle: 'Sessione della stanza terminata',
    expiredMessage: 'Sei stato rimosso perché la connessione è rimasta inattiva troppo a lungo. Puoi unirti di nuovo alla squadra.',
    leaveTitle: 'Vuoi lasciare la battaglia?',
    leaveMessage: 'Lasciando la stanza dovrai unirti di nuovo per tornare in battaglia.',
    leaveConfirm: 'LASCIA',
    leaveCancel: 'RESTA',
  },
  pt: {
    expiredTitle: 'A sessão da sala terminou',
    expiredMessage: 'Você foi removido porque a conexão ficou inativa por muito tempo. É possível entrar na equipe novamente.',
    leaveTitle: 'Sair da batalha?',
    leaveMessage: 'Ao sair desta sala, você precisará entrar novamente para voltar à batalha.',
    leaveConfirm: 'SAIR',
    leaveCancel: 'FICAR',
  },
  ru: {
    expiredTitle: 'Сеанс комнаты завершён',
    expiredMessage: 'Вы были удалены, потому что соединение слишком долго не проявляло активности. Вы можете снова войти в команду.',
    leaveTitle: 'Выйти из боя?',
    leaveMessage: 'После выхода из комнаты для возвращения в бой нужно будет войти снова.',
    leaveConfirm: 'ВЫЙТИ',
    leaveCancel: 'ОСТАТЬСЯ',
  },
  uk: {
    expiredTitle: 'Сеанс кімнати завершено',
    expiredMessage: 'Вас вилучено, бо з’єднання було неактивним надто довго. Ви можете знову приєднатися до команди.',
    leaveTitle: 'Вийти з бою?',
    leaveMessage: 'Після виходу з кімнати, щоб повернутися до бою, потрібно буде приєднатися знову.',
    leaveConfirm: 'ВИЙТИ',
    leaveCancel: 'ЗАЛИШИТИСЯ',
  },
  hi: {
    expiredTitle: 'रूम सत्र समाप्त हो गया',
    expiredMessage: 'कनेक्शन बहुत देर तक निष्क्रिय रहने के कारण आपको हटा दिया गया। आप टीम में फिर शामिल हो सकते हैं।',
    leaveTitle: 'क्या लड़ाई छोड़ें?',
    leaveMessage: 'रूम छोड़ने के बाद लड़ाई में लौटने के लिए फिर से शामिल होना होगा।',
    leaveConfirm: 'छोड़ें',
    leaveCancel: 'रुकें',
  },
  ur: {
    expiredTitle: 'روم سیشن ختم ہو گیا',
    expiredMessage: 'کنکشن بہت دیر غیر فعال رہنے کی وجہ سے آپ کو نکال دیا گیا۔ آپ دوبارہ ٹیم میں شامل ہو سکتے ہیں۔',
    leaveTitle: 'کیا جنگ چھوڑنی ہے؟',
    leaveMessage: 'روم چھوڑنے کے بعد جنگ میں واپس آنے کے لیے دوبارہ شامل ہونا ہوگا۔',
    leaveConfirm: 'چھوڑیں',
    leaveCancel: 'رکیں',
  },
  bn: {
    expiredTitle: 'রুম সেশন শেষ হয়েছে',
    expiredMessage: 'সংযোগ অনেকক্ষণ নিষ্ক্রিয় থাকায় আপনাকে সরিয়ে দেওয়া হয়েছে। আপনি আবার দলে যোগ দিতে পারেন।',
    leaveTitle: 'যুদ্ধ ছাড়বেন?',
    leaveMessage: 'এই রুম ছাড়লে যুদ্ধে ফিরতে আবার যোগ দিতে হবে।',
    leaveConfirm: 'ছাড়ুন',
    leaveCancel: 'থাকুন',
  },
  pa: {
    expiredTitle: 'ਰੂਮ ਸੈਸ਼ਨ ਖਤਮ ਹੋ ਗਿਆ',
    expiredMessage: 'ਕਨੈਕਸ਼ਨ ਬਹੁਤ ਦੇਰ ਨਿਸ਼ਕਿਰਿਆ ਰਹਿਣ ਕਾਰਨ ਤੁਹਾਨੂੰ ਹਟਾ ਦਿੱਤਾ ਗਿਆ। ਤੁਸੀਂ ਟੀਮ ਵਿੱਚ ਮੁੜ ਸ਼ਾਮਲ ਹੋ ਸਕਦੇ ਹੋ।',
    leaveTitle: 'ਕੀ ਜੰਗ ਛੱਡਣੀ ਹੈ?',
    leaveMessage: 'ਰੂਮ ਛੱਡਣ ਤੋਂ ਬਾਅਦ ਜੰਗ ਵਿੱਚ ਵਾਪਸ ਆਉਣ ਲਈ ਮੁੜ ਸ਼ਾਮਲ ਹੋਣਾ ਪਵੇਗਾ।',
    leaveConfirm: 'ਛੱਡੋ',
    leaveCancel: 'ਰੁਕੋ',
  },
  id: {
    expiredTitle: 'Sesi ruang berakhir',
    expiredMessage: 'Anda dikeluarkan karena koneksi terlalu lama tidak aktif. Anda dapat bergabung kembali ke tim.',
    leaveTitle: 'Tinggalkan pertempuran?',
    leaveMessage: 'Jika meninggalkan ruang ini, Anda harus bergabung lagi untuk kembali ke pertempuran.',
    leaveConfirm: 'TINGGALKAN',
    leaveCancel: 'TETAP',
  },
  ko: {
    expiredTitle: '방 세션이 종료되었습니다',
    expiredMessage: '연결이 너무 오래 비활성 상태여서 방에서 제거되었습니다. 팀에 다시 참가할 수 있습니다.',
    leaveTitle: '전투를 나갈까요?',
    leaveMessage: '방을 나가면 전투로 돌아올 때 다시 참가해야 합니다.',
    leaveConfirm: '나가기',
    leaveCancel: '남기',
  },
  vi: {
    expiredTitle: 'Phiên phòng đã kết thúc',
    expiredMessage: 'Bạn bị xóa vì kết nối không hoạt động quá lâu. Bạn có thể tham gia lại đội.',
    leaveTitle: 'Rời trận đấu?',
    leaveMessage: 'Rời phòng này nghĩa là bạn phải tham gia lại để quay lại trận đấu.',
    leaveConfirm: 'RỜI',
    leaveCancel: 'Ở LẠI',
  },
  th: {
    expiredTitle: 'เซสชันห้องสิ้นสุดแล้ว',
    expiredMessage: 'คุณถูกนำออกเพราะการเชื่อมต่อไม่ทำงานนานเกินไป คุณเข้าร่วมทีมใหม่ได้',
    leaveTitle: 'ออกจากการต่อสู้หรือไม่',
    leaveMessage: 'หากออกจากห้อง คุณต้องเข้าร่วมใหม่เพื่อกลับเข้าสู่การต่อสู้',
    leaveConfirm: 'ออก',
    leaveCancel: 'อยู่ต่อ',
  },
  nl: {
    expiredTitle: 'Roomsessie beëindigd',
    expiredMessage: 'Je bent verwijderd omdat de verbinding te lang inactief was. Je kunt opnieuw bij het team komen.',
    leaveTitle: 'Strijd verlaten?',
    leaveMessage: 'Als je deze kamer verlaat, moet je opnieuw deelnemen om terug te keren.',
    leaveConfirm: 'VERLATEN',
    leaveCancel: 'BLIJVEN',
  },
  pl: {
    expiredTitle: 'Sesja pokoju zakończona',
    expiredMessage: 'Usunięto Cię, ponieważ połączenie było zbyt długo nieaktywne. Możesz ponownie dołączyć do drużyny.',
    leaveTitle: 'Opuścić bitwę?',
    leaveMessage: 'Po opuszczeniu pokoju musisz dołączyć ponownie, aby wrócić do bitwy.',
    leaveConfirm: 'OPUŚĆ',
    leaveCancel: 'ZOSTAŃ',
  },
  sv: {
    expiredTitle: 'Rumssessionen avslutades',
    expiredMessage: 'Du togs bort eftersom anslutningen var inaktiv för länge. Du kan gå med i laget igen.',
    leaveTitle: 'Lämna striden?',
    leaveMessage: 'Om du lämnar rummet måste du gå med igen för att återvända till striden.',
    leaveConfirm: 'LÄMNA',
    leaveCancel: 'STANNA',
  },
  fa: {
    expiredTitle: 'نشست اتاق تمام شد',
    expiredMessage: 'به‌دلیل غیرفعال بودن طولانی اتصال، از اتاق خارج شدید. می‌توانید دوباره به تیم بپیوندید.',
    leaveTitle: 'ترک نبرد؟',
    leaveMessage: 'با ترک این اتاق، برای بازگشت به نبرد باید دوباره ملحق شوید.',
    leaveConfirm: 'ترک',
    leaveCancel: 'ماندن',
  },
};

export function battleSessionCopy(locale: Locale): BattleSessionCopy {
  return BATTLE_SESSION_COPY[locale];
}