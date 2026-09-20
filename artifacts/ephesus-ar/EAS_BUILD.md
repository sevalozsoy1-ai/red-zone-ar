# EAS bulut Android derlemesi

Bu uygulama için bulut test paketi `preview` profiliyle APK, mağaza paketi
`production` profiliyle AAB üretir. Yerel Gradle/Android SDK kurulumu gerekmez.

## İlk bağlantı

Expo hesabıyla giriş yapıp uygulamayı Expo projesine bağlayın:

```bash
cd artifacts/ephesus-ar
pnpm dlx eas-cli@latest login
pnpm dlx eas-cli@latest init
```

`init` sırasında mevcut `com.ephesusmedya.redzonear` Android paket kimliğini
koruyun. Komut, Expo proje kimliğini `app.json` içindeki `extra.eas.projectId`
alanına ekler. Bu kimlik elle uydurulmamalıdır.

## Önizleme APK'sı

`preview` derlemesi `EXPO_PUBLIC_APP_ENV=test` kullanır ve kalıcı
`https://ar-savas-oyunu.replit.app` API adresini `EXPO_PUBLIC_API_URL` olarak
pakete gömer. Bu değer gizli değildir. Geçici `.replit.dev` adresleri cihaz
build'lerinde kullanılmaz.

API deployment'ının `/api/healthz` isteğine `200 OK` verdiğini doğruladıktan sonra:

```bash
pnpm run eas:build:android:preview
```

Derleme tamamlandığında EAS çıktısındaki APK bağlantısı Android test cihazına
indirilebilir. Bu paket yalnızca test dağıtımı içindir ve Google Play'e
yüklenmemelidir.

## Production AAB'si

`production` profili aynı kalıcı HTTPS API adresini, EAS'te korunan Android
imzalama yapılandırmasını ve otomatik sürüm artırmayı kullanır:

```bash
pnpm run validate:release
pnpm run eas:build:android:production
```

Gerçek imzalı AAB üretildikten sonra
`pnpm verify:android <artifact>.aab --release`
ile onaylı sertifika parmak izi ve 16 KB native kütüphane hizalamasını kontrol
edin.

## Replit/monorepo notu

EAS derlemesi `artifacts/ephesus-ar` dizininden başlatılmalıdır. Build servisine
GitHub bağlantısı gerekiyorsa Expo projesine bu GitHub deposunu bağlayın; Replit
çalışma alanındaki yerel Git remote'u tek başına EAS kaynak deposu değildir.