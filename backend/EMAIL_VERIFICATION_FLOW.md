# Email Doğrulama Akışı

---

## 1. Akış Özeti

```
[Kullanıcı formu doldurur: email, name, date, time, service, ...]
           │
           ▼
[Backend: Email zorunlu, telefon opsiyonel. Validasyon.]
           │
           ▼
[Backend: Aynı gün (date) bu email için randevu sayısı >= 3?]
           │
      Evet │ Hayır
           │
           ▼
[Backend: Slot (date+time) müsait mi?]
           │
      Hayır│ Evet
           │
           ▼
[Backend: Bu email veritabanında var mı?]
           │
     ┌─────┴─────┐
     │           │
   Hayır        Evet
     │           │
     │     [email_verified_at dolu mu?]
     │           │
     │      Hayır│ Evet  ──────────────────┐
     │           │                         │
     ▼           ▼                         ▼
[Yeni user] [Mevcut ama  [Mevcut, doğrulanmış kullanıcı]
 email_verified_at       │
 NULL – ilk doğrulama]   │
     │           │                         │
     └─────┬─────┘                         │
           ▼                               ▼
[Appointment: status = pending_verification]  [Appointment: status = confirmed]
[Email verification token oluştur (24h)]      [Manage URL üret]
[Doğrulama emaili gönder]                     [201 + manage_url]
           │
           ▼
[201 + "Doğrulama emaili gönderildi"]
           │
           ▼
[Kullanıcı emaildeki linke tıklar: /verify-email?token=XXX]
           │
           ▼
[Backend: Token geçerli mi? (var, used_at NULL, expires_at > NOW)]
           │
     Hayır │ Evet
           │
           ▼
[Token used_at = NOW; user email_verified_at = NOW; appointment status = confirmed]
           │
           ▼
[Redirect: verify-success.html]
```

---

## 2. İlk Kez Kullanan (Yeni Email)

1. Form gönderilir → backend kullanıcıyı email ile bulamaz.
2. Yeni `users` kaydı: `email`, `name`, `phone`, `email_verified_at = NULL`.
3. Yeni `appointments` kaydı: `status = 'pending_verification'`.
4. Yeni `email_verification_tokens` kaydı: `token` (64 char hex), `expires_at = NOW() + 24h`.
5. Email gönderilir:
   - Konu (TR): "Randevunuzu doğrulayın"
   - Konu (DE): "Bestätigen Sie Ihren Termin"
   - İçerik: Şirket logosu, kısa teşekkür, doğrulama linki: `https://site.com/verify-email?token=TOKEN`
6. API yanıtı: **201**, `requires_verification: true`, mesaj: "Doğrulama emaili gönderildi. Lütfen emailinizi kontrol edin."
7. Randevu **doğrulanana kadar** slot’ta sayılır (pending_verification da günlük 3 limitine ve müsaitlik kontrolüne dahil).

---

## 3. Link Tıklanınca (Doğrulama)

1. **GET** `/verify-email?token=TOKEN`
2. Token bulunur, `used_at IS NULL` ve `expires_at > NOW()` kontrol edilir.
3. Geçersiz veya süresi dolmuş → hata sayfası (örn. `verify-error.html?reason=expired` veya `invalid`).
4. Geçerli ise:
   - `email_verification_tokens.used_at = NOW()`
   - `users.email_verified_at = NOW()` (ilgili user)
   - `appointments.status = 'confirmed'`
5. Redirect: `verify-success.html` (ve istenirse manage linki veya randevu özeti).

---

## 4. Aynı Email Tekrar Kullanıldığında (Mevcut Kullanıcı)

1. Email veritabanında var ve `email_verified_at IS NOT NULL`.
2. Yeni randevu doğrudan `status = 'confirmed'` oluşturulur.
3. Doğrulama emaili **gönderilmez**.
4. Yanıt: **201**, `requires_verification: false`, `manage_url` döner.

---

## 5. Zaman Aşımı (24 Saat)

- Token oluşturulurken: `expires_at = created_at + 24 hours`.
- Doğrulama isteğinde: `expires_at <= NOW()` ise **token_expired** hatası.
- Kullanıcıya: "Doğrulama linkinin süresi doldu. Lütfen yeni randevu alın." / DE karşılığı.
- Eski randevu `pending_verification` kalır; istenirse cron ile süresi dolan token’lar ve X gün önceki pending randevular temizlenebilir veya “iptal” sayılabilir.

---

## 6. Güvenlik Özeti

| Konu | Uygulama |
|------|----------|
| Token üretimi | `crypto.randomBytes(32).toString('hex')` veya eşdeğer |
| Token süresi | 24 saat, `expires_at` kontrolü |
| Tek kullanım | `used_at` set edilince tekrar kullanılamaz |
| Scope | Bir token sadece bir appointment’ı doğrular |
| Rate limit | Aynı IP/email için doğrulama denemesi sınırlanabilir |
