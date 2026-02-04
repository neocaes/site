# Mail Gelmiyor – Ne Yapmalı?

Randevu doğrulama veya yönetim linki e-postası gelmiyorsa aşağıdakileri kontrol et.

---

## 1. Render’da SMTP değişkenleri

Render Dashboard → **site-bztf** (veya servis adın) → **Environment**.

Şunlar **mutlaka** tanımlı olmalı:

| Key        | Örnek değer                    |
|-----------|---------------------------------|
| SMTP_HOST | `smtp.ionos.de`                |
| SMTP_PORT | `587`                          |
| SMTP_USER | `info@browdesignsongul.com`    |
| SMTP_PASS | *(e-posta şifren veya uygulama şifresi)* |
| SITE_EMAIL | `info@browdesignsongul.com`   |
| ADMIN_EMAIL | `info@browdesignsongul.com`  |

**SMTP_PASS** boş veya yanlışsa mail hiç gönderilmez. Değiştirdikten sonra **Save** → gerekirse **Manual Deploy** → **Deploy latest commit**.

---

## 2. Test maili gönder

Tarayıcıda şu adresi aç (kendi e-postanı ve `RESET_SECRET` değerini yaz):

```
https://site-bztf.onrender.com/api/test-email?secret=CANLISIFRESIFIRLA2025&to=gozekse60@gmail.com
```

- **secret** = Render’da tanımlı `RESET_SECRET` (örn. `canlisifresifirla2025`).
- **to** = Test mailinin gideceği adres.

Sayfada ne görünüyor?

- **`"ok": true`** → SMTP çalışıyor; mail gidiyor (spam klasörüne de bak).
- **`"error": "SMTP ayarlı değil"`** → Environment’ta SMTP_HOST, SMTP_USER, SMTP_PASS ekle/güncelle.
- **`"error": "Invalid login"` veya "535"** → Şifre yanlış; aşağıdaki IONOS adımlarına geç.

---

## 3. IONOS 535 / “Authentication failed”

IONOS SMTP kullanıcı adı/şifreyi kabul etmiyorsa:

**Seçenek A – E-posta şifresini sıfırla (çoğu zaman yeterli)**  
1. IONOS Kontrolpanel → **E-Mail** → ilgili adres (örn. info@browdesignsongul.com).  
2. **Passwort ändern** (şifre değiştir) → yeni şifreyi belirle.  
3. Render’da **SMTP_PASS** değişkenini bu yeni şifre yap → Save → tekrar deploy veya restart.  
4. Test linkini tekrar dene.

**Seçenek B – Uygulama şifresi (App-Passwort)**  
Bazı IONOS hesaplarında normal şifre SMTP’de kabul edilmez; “Anwendungspasswort” gerekir.  
1. IONOS Webmail’e gir (Roundcube / OX).  
2. **Einstellungen** → **Sicherheit** → **Anwendungspasswörter**.  
3. Yeni uygulama şifresi oluştur, kopyala.  
4. Render’da **SMTP_PASS** = bu uygulama şifresi → Save → deploy/restart.  
5. Test linkini tekrar dene.

**Host / Port:**  
- Almanya: `SMTP_HOST=smtp.ionos.de`, `SMTP_PORT=587`.  
- Başka bölge: `smtp.ionos.com` deneyebilirsin; port yine **587**.

---

## 4. Render logları

Render’da servis sayfası → **Logs**.  
Randevu alındığında veya test-email çağrıldığında `[EMAIL]` veya hata mesajı var mı bak.  
“535” veya “EAUTH” görüyorsan şifre/host/port (yukarıdaki adımlar) doğru mu tekrar kontrol et.

---

## Özet

1. Render Environment’ta SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SITE_EMAIL, ADMIN_EMAIL doğru ve dolu mu?  
2. Test: `https://site-bztf.onrender.com/api/test-email?secret=...&to=...` → `ok: true` geliyor mu?  
3. Gelmiyorsa: IONOS’ta şifre sıfırla veya uygulama şifresi kullan, SMTP_PASS’i güncelle.  
4. Hâlâ olmuyorsa: Render Logs’taki `[EMAIL]` hatalarını kontrol et.
