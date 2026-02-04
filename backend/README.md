# Browdesing Songül – Randevu Backend

Bu klasör, randevu sisteminin **veritabanı şeması**, **API dokümantasyonu**, **backend mantığı**, **email doğrulama akışı** ve **örnek Node.js API** içerir.

---

## Dosyalar

| Dosya | Açıklama |
|-------|----------|
| `schema.sql` | MySQL/MariaDB uyumlu veritabanı şeması (users, appointments, email_verification_tokens) |
| `API.md` | REST API endpoint örnekleri ve yanıtlar |
| `BACKEND_LOGIC.md` | Randevu oluşturma, limit, doğrulama adımları |
| `EMAIL_VERIFICATION_FLOW.md` | Email doğrulama akışı ve güvenlik |
| `server.js` | Örnek Node.js (Express + SQLite) API |
| `package.json` | Node bağımlılıkları |

---

## Kurallar (Özet)

- **Email** zorunlu, **telefon** opsiyonel.
- Aynı email + isim veritabanında birlikte saklanır; aynı email = mevcut kullanıcı.
- **İlk kez kullanılan email:** Randevu `pending_verification`, doğrulama emaili gönderilir; linke tıklanınca `confirmed`.
- **Mevcut (doğrulanmış) email:** Randevu doğrudan `confirmed`.
- **Günlük limit:** Aynı kullanıcı (email) bir günde en fazla 3 randevu (hata: "Bir gün içinde en fazla 3 randevu alabilirsiniz.").
- **Doğrulama token:** 24 saat geçerli, tek kullanımlık, tahmin edilemez.

---

## Örnek API’yi Çalıştırma (Node.js)

```bash
cd backend
npm install
# SQLite otomatik oluşturulur (browdesing.db)
PORT=3000 BASE_URL=http://localhost:3000 FRONTEND_URL=http://localhost:5500 node server.js
```

- **POST** `http://localhost:3000/appointments` – Randevu oluştur (body: email, name, phone?, date, time, service, note?).
- **GET** `http://localhost:3000/verify-email?token=XXX` – Email doğrulama (redirect).
- **GET** `http://localhost:3000/availability?date=YYYY-MM-DD` – Müsait slotlar.
- **GET** `http://localhost:3000/health` – Health check.

**Otomatik e-posta:** Doğrulama maili, randevu onayı veya randevu değişikliği bildirimi gibi mailler, backend’te Nodemailer (veya SendGrid/Mailgun) ile gönderilir. `server.js` içinde `sendVerificationEmail` fonksiyonunu gerçek SMTP ile doldurmanız gerekir; randevu değişikliği / iptal bildirimi için ek endpoint ve mail şablonları ekleyebilirsiniz.

Production’da:
- Veritabanı olarak MySQL/Postgres kullanın; `schema.sql` ile tabloları oluşturun.
- `BASE_URL` ve `FRONTEND_URL` ortam değişkenlerini canlı adreslere ayarlayın.
- Nodemailer ile gerçek SMTP veya SendGrid/Mailgun kullanın.
- HTTPS ve rate limiting ekleyin.
