# Render'da Backend Kurulumu (Web Service)

## Önce: Kodu GitHub'a at

1. https://github.com adresinde hesap aç (yoksa).
2. "New repository" → isim ver (örn. browdesing-songul) → Create.
3. Bilgisayarında proje klasöründe (C:\Users\Mehmet\browdesing-songul) Git açıp şunları yaz:

```bash
git init
git add .
git commit -m "ilk"
git branch -M main
git remote add origin https://github.com/KULLANICI_ADIN/repo-adi.git
git push -u origin main
```

(KULLANICI_ADIN ve repo-adi kendi GitHub bilgilerinle değiştir.)

---

## Render'da Web Service oluştur

1. Render dashboard'da **"New +"** → **"Web Service"**.
2. **"Connect a repository"** → GitHub'ı bağla (authorize) → **browdesing-songul** (veya repo adın) reposunu seç.
3. **Ayarlar:**

   | Alan | Değer |
   |------|--------|
   | **Name** | browdesing-api (veya istediğin isim) |
   | **Region** | Frankfurt (veya en yakın) |
   | **Branch** | main |
   | **Root Directory** | **backend** (önemli – backend klasörü) |
   | **Runtime** | Node |
   | **Build Command** | `npm install` |
   | **Start Command** | `npm start` veya `node server.js` |
   | **Instance Type** | Free |

4. **Environment** (Environment Variables) sekmesine git, şu değişkenleri ekle:

   | Key | Value |
   |----|--------|
   | **PORT** | 3000 (Render kendi PORT verir, ama bazen 3000 yazılır) |
   | **FRONTEND_URL** | https://browdesignsongul.com (canlı site adresin) |
   | **BASE_URL** | https://browdesing-api.onrender.com (Render’ın vereceği adres – oluşturduktan sonra buraya yaz) |
   | **SITE_EMAIL** | info@browdesignsongul.com |
   | **ADMIN_EMAIL** | info@browdesignsongul.com |
   | **SMTP_HOST** | smtp.ionos.de |
   | **SMTP_PORT** | 587 |
   | **SMTP_USER** | info@browdesignsongul.com |
   | **SMTP_PASS** | (e-posta şifren veya uygulama şifresi) |
   | **ADMIN_USER** | admin |
   | **ADMIN_PASS** | admin123 |
   | **RESET_SECRET** | canlisifresifirla2025 (şifre sıfırlamak için, sonra silebilirsin) |

5. **Create Web Service** de.

6. Deploy bitince Render sana bir URL verir (örn. `https://browdesing-api.onrender.com`). Bu adres = API adresin.

7. **Environment**’ta **BASE_URL**’i bu adresle güncelle: `https://browdesing-api.onrender.com`

---

## Canlı sitede API adresini güncelle

IONOS’taki site dosyalarında (index.html, admin.html, manage.html, manage-list.html) **api-base** meta etiketini Render URL’ine çevir:

```html
<meta name="api-base" content="https://browdesing-api.onrender.com" id="api-base-meta">
```

(Render’ın verdiği adresi yaz. Örnek: `https://browdesing-api.onrender.com`)

Bu dosyaları güncelleyip tekrar sunucuya (FileZilla ile) at.

---

## Özet

1. Kodu GitHub’a at.
2. Render’da Web Service oluştur, repo’yu bağla, Root Directory = **backend**.
3. Build: `npm install`, Start: `npm start`.
4. Environment değişkenlerini ekle (yukarıdaki tablo).
5. Deploy bitince çıkan URL’i al.
6. Canlı sitedeki HTML’lerde api-base’i bu URL yap, dosyaları sunucuya tekrar at.

Bundan sonra randevu ve admin paneli Render’daki API’yi kullanır; PC kapalı olsa da çalışır.
