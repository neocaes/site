# Backend Logic – Randevu Sistemi

Production mantığına uygun adımlar ve kurallar.

---

## 1. Randevu Oluşturma Akışı (POST /appointments)

### 1.1 Giriş Validasyonu
1. **email** zorunlu, geçerli format (RFC 5322 veya basit regex).
2. **name** zorunlu, trim, 1–255 karakter.
3. **phone** opsiyonel.
4. **date** zorunlu, YYYY-MM-DD, geçmiş tarih olmamalı.
5. **time** zorunlu, HH:mm, çalışma saatleri içinde (Salı–Cuma 09–18, Cumartesi 09–17).
6. **service** zorunlu, izin verilen değerler listesinde.
7. **note** opsiyonel.

Hata: **400** + uygun mesaj.

### 1.2 Randevu Limiti (Aynı Gün, Aynı Email)
1. Email ile kullanıcıyı bul: `SELECT id FROM users WHERE email = ?`.
2. Varsa `user_id`, yoksa henüz kullanıcı yok (yeni kullanıcı).
3. İstenen **date** için bu kullanıcının (veya bu email’e atanacak kullanıcının) randevu sayısını hesapla:
   - `status IN ('pending_verification', 'confirmed')`
   - `date = requested_date`
4. Eğer sayı **>= 3** ise:
   - **400** dön: `"Bir gün içinde en fazla 3 randevu alabilirsiniz."` / DE karşılığı.

### 1.3 Slot Müsaitliği
1. İstenen `date` + `time` için `appointments` tablosunda `status IN ('pending_verification', 'confirmed')` kayıt var mı?
2. Varsa: **400** – `"Bu saat için randevu alınamıyor."`

### 1.4 Kullanıcı Bul veya Oluştur
1. `SELECT * FROM users WHERE email = ?`
2. **Kullanıcı yoksa:**
   - `users`: `id` (UUID), `email`, `name`, `phone`, `email_verified_at = NULL`, `created_at`, `updated_at`.
   - Kullanıcıyı “email doğrulanmamış” olarak oluştur.

### 1.5 Randevu ve (Gerekirse) Doğrulama Token’ı
1. **manage_token** üret: kriptografik rastgele (örn. 32 byte hex veya `crypto.randomUUID()` + ek entropy). Benzersiz olmalı.
2. **Mevcut kullanıcı** (email daha önce kayıtlı **ve** `email_verified_at IS NOT NULL`):
   - `appointments`: `user_id`, `date`, `time`, `service`, `note`, `status = 'confirmed'`, `manage_token`, `lang`.
   - İsteğe bağlı: onay emaili (link içermeyebilir).
   - Yanıt: **201** + `manage_url` + `requires_verification: false`.
3. **Yeni kullanıcı** (email ilk kez **veya** `email_verified_at IS NULL`):
   - `appointments`: aynı alanlar, `status = 'pending_verification'`.
   - `email_verification_tokens`: `id`, `token` (benzersiz, tahmin edilemez), `user_id`, `appointment_id`, `expires_at = NOW() + INTERVAL 24 HOUR`, `used_at = NULL`.
   - Doğrulama emaili gönder: link = `https://site.com/verify-email?token=TOKEN`.
   - Yanıt: **201** + `requires_verification: true` + mesaj: "Doğrulama emaili gönderildi."

### 1.6 Transaction
- Kullanıcı oluşturma + randevu + token oluşturma (ve varsa email kuyruğu) tek transaction’da veya tutarlı sırada yapılmalı; race condition (aynı email ile aynı anda iki istek) önlenmeli (örn. email unique + lock veya idempotency key).

---

## 2. Email Doğrulama (GET /verify-email?token=...)

### 2.1 Token Kontrolü
1. `SELECT * FROM email_verification_tokens WHERE token = ? AND used_at IS NULL`
2. Kayıt yok: **Geçersiz veya zaten kullanılmış** → hata sayfası / redirect.
3. `expires_at < NOW()`: **Süresi dolmuş** → hata sayfası (örn. `verify-error.html?reason=expired`).

### 2.2 Onaylama
1. Transaction başlat.
2. `UPDATE email_verification_tokens SET used_at = NOW() WHERE id = ?`
3. `UPDATE users SET email_verified_at = NOW() WHERE id = ?` (token’daki user_id).
4. `UPDATE appointments SET status = 'confirmed' WHERE id = ?` (token’daki appointment_id).
5. Commit.
6. Redirect: başarı sayfası (örn. `verify-success.html`).

### 2.3 Güvenlik
- Token tek kullanımlık: `used_at` set edildikten sonra tekrar kullanılamaz.
- Token 24 saat sonra geçersiz: sadece `expires_at > NOW()` kontrolü.
- Token tahmin edilemez: en az 128 bit rastgele (örn. 32 byte hex = 64 karakter).

---

## 3. Randevu Limiti – Detay

- **Bir gün** = takvim günü (date alanı). Saat dilimi: işletme saatleri (örn. Europe/Berlin).
- Sayılan randevular: `status IN ('pending_verification', 'confirmed')`. İptal edilenler (`cancelled`) sayılmaz.
- Yeni randevu oluşturulurken: mevcut + 1 ≤ 3 olmalı.

---

## 4. Hata Mesajları ve Edge-Case Kontrolleri

| Durum | HTTP | error (code) | TR mesaj | DE mesaj |
|-------|------|--------------|----------|----------|
| Günlük limit (≥3) | 400 | daily_limit_exceeded | Bir gün içinde en fazla 3 randevu alabilirsiniz. | Sie können maximal 3 Termine pro Tag buchen. |
| Slot dolu | 400 | slot_not_available | Bu saat için randevu alınamıyor. | Dieser Termin ist nicht mehr verfügbar. |
| Geçersiz tarih/saat | 400 | invalid_datetime | Geçersiz tarih veya saat. | Ungültiges Datum oder Uhrzeit. |
| Email zorunlu | 400 | validation_error | Email adresi gerekli. | E-Mail-Adresse ist erforderlich. |
| Email format | 400 | validation_error | Geçerli bir email adresi girin. | Bitte gültige E-Mail-Adresse eingeben. |
| Doğrulama token geçersiz | 400 | invalid_token | Link geçersiz veya zaten kullanıldı. | Link ungültig oder bereits verwendet. |
| Doğrulama token süresi dolmuş | 400 | token_expired | Doğrulama linkinin süresi doldu. Lütfen yeni randevu alın. | Der Bestätigungslink ist abgelaufen. Bitte buchen Sie einen neuen Termin. |
| Rate limit | 429 | rate_limit_exceeded | Çok fazla istek. Lütfen daha sonra tekrar deneyin. | Zu viele Anfragen. Bitte später erneut versuchen. |
| Sunucu hatası | 500 | internal_error | Bir hata oluştu. Lütfen daha sonra tekrar deneyin. | Ein Fehler ist aufgetreten. Bitte später erneut versuchen. |

### Edge-Case’ler
1. **Aynı anda aynı email ile iki randevu:** DB unique/constraint ve transaction ile tek kullanıcı; günlük sayı tekrar kontrol edilmeli.
2. **Doğrulama linkine iki kez tıklama:** `used_at` set edildiği için ikinci istekte token bulunamaz veya “zaten kullanıldı” dön.
3. **Süresi dolan token:** Sadece `expires_at` kontrolü; güncelleme yapma, hata sayfası göster.
4. **Kullanıcı silinirse:** FK ile randevu/token silinmemeli veya CASCADE tanımlıysa dokümante edilmeli; genelde randevu kalır, kullanıcı soft-delete tercih edilebilir.
5. **Email değişikliği:** Production’da email değişimi ayrı akış (yeniden doğrulama) olabilir; bu akışta sadece “aynı email = mevcut kullanıcı” kuralı uygulanır.

---

## 5. Token Üretimi (Güvenli)

```text
Email doğrulama token: 32 byte cryptographically random → hex = 64 karakter.
Manage token: 32 byte cryptographically random → hex = 64 karakter.
```

Örnek (pseudo):
- `token = crypto.randomBytes(32).toString('hex')`
- DB’de `token` UNIQUE; çakışma ihtimali yok sayılır.

Süre:
- Email doğrulama: `expires_at = created_at + 24 hours`.
- Manage token: süresiz (iptal/değiştir için); istenirse son kullanım tarihi eklenebilir.
