# Render Kurulumu – Adım Adım (neocaes/site)

GitHub’a kod atıldı. Şimdi Render’da Web Service oluştur.

---

## 1. Render’a gir

- https://dashboard.render.com adresine git.
- GitHub ile giriş yap (yoksa hesap aç).

---

## 2. Yeni Web Service

- **"New +"** (mavi buton) → **"Web Service"** seç.

---

## 3. Repo bağla

- **"Connect a repository"** bölümünde **GitHub**’ı seç.
- Gerekirse **"Configure account"** ile GitHub’ı yetkilendir.
- Repo listesinden **site** (neocaes/site) reposunu seç.
- **"Connect"** tıkla.

---

## 4. Ayarları doldur (ilk ekranda)

| Alan | Yazılacak |
|------|------------|
| **Name** | `browdesing-api` (veya istediğin isim; URL’de görünür) |
| **Region** | Frankfurt |
| **Branch** | `main` |
| **Runtime** | Node |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance Type** | **Free** |

**Root Directory burada yok** – servisi oluşturduktan sonra ayarlanacak (adım 4b).

---

## 4b. Root Directory nerede? (servis oluşturduktan sonra)

**Root Directory** yeni servis formunda yok; **Settings** sayfasında.

1. **Create Web Service** ile servisi oluştur (Environment değişkenlerini ekledikten sonra).
2. **Hemen** servis sayfasında solda **"Settings"** sekmesine tıkla (ilk build hata verirse sorun değil).
3. Sayfada aşağı kaydır → **"Build & Deploy"** bölümünü bul.
4. **"Root Directory"** satırı var → sağındaki **"Edit"** tıkla.
5. Açılan kutuya sadece **`backend`** yaz → **"Save Changes"** / **"Update Fields"** tıkla.
6. Üstte **"Manual Deploy"** menüsüne gir → **"Clear build cache & deploy"** veya **"Deploy latest commit"** seç (yeniden build alır).

---

## 5. Environment Variables (ortam değişkenleri)

**"Advanced"** veya **"Environment"** bölümüne gir. **"Add Environment Variable"** ile tek tek ekle:

| Key | Value |
|-----|--------|
| `PORT` | `3000` |
| `FRONTEND_URL` | `https://browdesignsongul.com` |
| `BASE_URL` | `https://site-bztf.onrender.com` *(önce böyle bırak; deploy sonrası Render’ın verdiği URL ile değiştirirsin)* |
| `SITE_EMAIL` | `info@browdesignsongul.com` |
| `ADMIN_EMAIL` | `info@browdesignsongul.com` |
| `SMTP_HOST` | `smtp.ionos.de` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | `info@browdesignsongul.com` |
| `SMTP_PASS` | *(e‑posta şifren veya IONOS uygulama şifresi)* |
| `ADMIN_USER` | `admin` |
| `ADMIN_PASS` | *(güçlü bir şifre – canlıda bunu kullanacaksın)* |
| `RESET_SECRET` | `canlisifresifirla2025` |
| **NODE_VERSION** | **`18`** *(better-sqlite3 derlemesi için – mutlaka ekle)* |

**Not:** `SMTP_PASS` ve `ADMIN_PASS` gerçek değerlerini sen yazacaksın; burada sadece hangi key’lerin ekleneceği yazıyor.

---

## 6. Deploy’u başlat

- **"Create Web Service"** tıkla.
- Render otomatik build alır (`npm install`), sonra `npm start` ile ayağa kalkar.
- İlk deploy 2–3 dakika sürebilir.

---

## 7. URL’i al ve BASE_URL’i güncelle

- Deploy bittikten sonra üstte **yeşil "Live"** ve bir link görünür (örn. `https://site-bztf.onrender.com`).
- Bu adresi kopyala.
- Render’da: **Environment** sekmesine git → **BASE_URL** değişkeninin değerini bu adres yap (örn. `https://site-bztf.onrender.com`) → kaydet.

---

## 8. Canlı sitede API adresini güncelle

Bilgisayarındaki projede şu dosyalarda **api-base** meta etiketini Render URL’i yap:

- `index.html`
- `admin.html`
- `manage.html` (varsa)
- `manage-list.html` (varsa)

Örnek (Render’ın verdiği URL’i yaz):

```html
<meta name="api-base" content="https://site-bztf.onrender.com" id="api-base-meta">
```

Sonra bu HTML dosyalarını IONOS’a (FileZilla ile) tekrar yükle. Böylece canlı site Render’daki API’yi kullanır.

---

## Kısa kontrol listesi

- [ ] Render’da Web Service oluşturuldu, repo: **site** (neocaes/site)
- [ ] **Root Directory: backend** yazıldı
- [ ] Build: `npm install`, Start: `npm start`
- [ ] Environment değişkenleri eklendi (PORT, FRONTEND_URL, BASE_URL, SMTP_*, ADMIN_*, vb.)
- [ ] Deploy bitti, URL kopyalandı
- [ ] BASE_URL = Render URL yapıldı
- [ ] Canlı sitedeki HTML’lerde api-base = Render URL yapıldı, dosyalar sunucuya atıldı

Bu adımlardan hangisinde takılıyorsan söyle, oradan devam edelim.
