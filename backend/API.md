# API Endpoint Örnekleri

Base URL örnek: `https://api.example.com/v1`

---

## 1. Randevu Oluştur

**POST** `/appointments`

### Request Headers
```
Content-Type: application/json
Accept-Language: de | tr
```

### Request Body
```json
{
  "email": "kunde@example.com",
  "name": "Max Mustermann",
  "phone": "+49 621 123456",
  "date": "2025-02-15",
  "time": "10:00",
  "service": "kas-alma",
  "note": "Ersttermin"
}
```

### Validasyon
| Alan    | Zorunlu | Açıklama                    |
|---------|---------|-----------------------------|
| email   | Evet    | Geçerli email formatı       |
| name    | Evet    | Boş olmamalı, max 255       |
| phone   | Hayır   | İsteğe bağlı                |
| date    | Evet    | YYYY-MM-DD, iş günü         |
| time    | Evet    | HH:mm, çalışma saatleri     |
| service | Evet    | İzin verilen service key    |
| note    | Hayır   | Metin                       |

### Başarı Yanıtları

**A) Yeni kullanıcı – doğrulama emaili gönderildi**  
HTTP `201 Created`
```json
{
  "success": true,
  "requires_verification": true,
  "message": "Doğrulama emaili gönderildi. Lütfen emailinizi kontrol edin.",
  "message_de": "Bestätigungs-E-Mail wurde gesendet. Bitte prüfen Sie Ihr Postfach."
}
```

**B) Mevcut kullanıcı – randevu onaylı**  
HTTP `201 Created`
```json
{
  "success": true,
  "requires_verification": false,
  "appointment": {
    "id": "uuid",
    "date": "2025-02-15",
    "time": "10:00",
    "service": "kas-alma",
    "status": "confirmed"
  },
  "manage_url": "https://site.com/manage.html?token=MANAGE_TOKEN"
}
```

### Hata Yanıtları

**400 Bad Request** – Validasyon / iş kuralı
```json
{
  "success": false,
  "error": "daily_limit_exceeded",
  "message": "Bir gün içinde en fazla 3 randevu alabilirsiniz.",
  "message_de": "Sie können maximal 3 Termine pro Tag buchen."
}
```

**400** – Slot dolu
```json
{
  "success": false,
  "error": "slot_not_available",
  "message": "Bu saat için randevu alınamıyor."
}
```

**400** – Geçersiz tarih/saat
```json
{
  "success": false,
  "error": "invalid_datetime",
  "message": "Geçersiz tarih veya saat."
}
```

**429 Too Many Requests** – Rate limit (opsiyonel)
```json
{
  "success": false,
  "error": "rate_limit_exceeded",
  "retry_after": 60
}
```

---

## 2. Email Doğrulama (Link Tıklama)

**GET** `/verify-email?token=TOKEN`

- Token geçerli ve süresi dolmamışsa: randevu `confirmed` yapılır, kullanıcı `email_verified_at` set edilir, token `used_at` set edilir.
- Yanıt: HTML sayfası (başarı / hata) veya redirect.

**Örnek başarı redirect:**
```
302 Found
Location: https://site.com/verify-success.html
```

**Örnek hata (token geçersiz/süresi dolmuş):**
```
302 Found
Location: https://site.com/verify-error.html?reason=expired
```

---

## 3. Müsait Slotları Listele

**GET** `/appointments/availability?date=2025-02-15`

### Response
```json
{
  "date": "2025-02-15",
  "slots": ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"],
  "booked": ["10:00", "14:00"]
}
```

- Frontend: `slots` içinden `booked` olmayanları müsait gösterir.

---

## 4. Randevu Yönetimi (Magic Link)

**GET** `/appointments/manage?token=MANAGE_TOKEN`

- Token ile randevu bulunur (sadece o randevu).
- Yanıt: randevu detayı (JSON veya HTML).

**PATCH** `/appointments/manage`  
Body: `{ "token": "MANAGE_TOKEN", "action": "cancel" }`  
veya  
Body: `{ "token": "MANAGE_TOKEN", "action": "reschedule", "date": "...", "time": "..." }`

- Aynı gün 3 randevu limiti reschedule için de geçerli.

---

## 5. Health Check

**GET** `/health`

```json
{
  "status": "ok",
  "database": "connected"
}
```
