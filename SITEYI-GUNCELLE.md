# Canlı Siteyi Güncelleme

Yaptığımız tüm değişikliklerin canlı sitede görünmesi için aşağıdaki dosyaları **sunucuna / hosting’ine** yüklemen (veya Git ile çekmen) gerekiyor.

## 1. Frontend (site sayfaları) – hepsini yükle

Bu dosyalar ziyaretçilerin gördüğü site. Hepsi **proje kökünde** (backend klasörünün dışında):

| Dosya | Açıklama |
|-------|----------|
| `index.html` | Ana sayfa |
| `script.js` | Randevu, dil, içerik |
| `styles.css` | Tüm stiller |
| `admin.html` | Admin panel sayfası |
| `admin.js` | Admin panel mantığı |
| `manage.html` | Randevu yönetim sayfası |
| `manage.js` | Randevu yönetim mantığı |
| `manage-list.html` | Randevu listesi (e‑posta linki) |
| `verify-success.html` | Doğrulama başarı (varsa) |
| `verify-error.html` | Doğrulama hata (varsa) |

**Yap:** Bu dosyaları FTP / hosting dosya yöneticisi / Git ile canlı sitedeki aynı yerlere kopyala (üzerine yaz).

---

## 2. Backend (API sunucusu)

Backend’i **Node.js çalışan sunucuda** güncellemen lazım. Örneğin VPS veya Node destekleyen hosting.

**Yüklenecek / güncellenecek dosyalar (backend klasöründe):**

| Dosya | Açıklama |
|-------|----------|
| `server.js` | Ana API (slot 15 dk, doğrulama maili, BASE_PATH, vb.) |
| `package.json` | Bağımlılıklar (değişmediyse atlayabilirsin) |
| `.env.example` | Örnek ayar (sadece referans; .env’i elle ayarla) |
| `test-email.js` | E‑posta test scripti (isteğe bağlı) |

**Önemli:**  
- Sunucudaki **`.env`** dosyasını **silme**. İçinde canlı ortam şifreleri ve domain ayarları var.  
- Sadece **server.js** ve diğer kod dosyalarını güncelle.  
- Domain’e geçtiysen `.env` içinde `BASE_URL`, `FRONTEND_URL`, `BASE_PATH` değerlerini canlı adreslere göre ayarla (DOMAIN.md’e bak).

**Backend güncelledikten sonra sunucuda:**
```bash
cd backend
npm install
node server.js
```
(veya `pm2 restart` / hosting’in “restart app” butonu)

---

## 3. Kısa kontrol listesi

- [ ] Tüm frontend dosyalarını (yukarıdaki liste) canlı sitede aynı yapıya göre yükledim.
- [ ] Backend’te `server.js` (ve gerekirse diğer dosyalar) güncellendi.
- [ ] Sunucuda `.env` silinmedi, sadece gerekirse BASE_URL / FRONTEND_URL / BASE_PATH güncellendi.
- [ ] Backend yeniden başlatıldı (`node server.js` veya pm2 restart).
- [ ] Tarayıcıda canlı siteyi açıp dil değiştirme, randevu, admin paneli denedim.

Bu adımları uyguladığında canlı site, yaptığımız değişikliklerle (dil, 15 dk slot, doğrulama maili, hero fotoğrafı, Songül fotoğrafı alanı, domain desteği vb.) güncel hale gelir.

---

## FileZilla ile yükleme

1. **Bağlan:** FileZilla’da hosting’in verdiği FTP bilgileriyle bağlan (adres, kullanıcı, şifre).
2. **Sol taraf (bilgisayarın):** Proje klasörüne git: `C:\Users\Mehmet\browdesing-songul`
3. **Sağ taraf (sunucu):** Sitenin kök klasörüne git (genelde `public_html`, `www`, `htdocs` veya `web`).

### Site dosyalarını at (sol → sağ)

Sol taraftan **şu dosyaları** seç, sağ tarafta **sitenin köküne** sürükleyip bırak (varsa üzerine yaz de):

- `index.html`
- `script.js`
- `styles.css`
- `admin.html`
- `admin.js`
- `manage.html`
- `manage.js`
- `manage-list.html`
- Varsa: `verify-success.html`, `verify-error.html`

Hepsi sunucuda da **aynı isimle, kök dizinde** olmalı (alt klasör yok).

### Backend (API) ayrı bir yerdeyse

Node backend’i sunucuda ayrı bir klasörde çalışıyorsa:

- Sol tarafta `backend` klasörünü aç.
- **server.js**, **package.json**, **test-email.js** dosyalarını seç.
- Sağ tarafta sunucudaki backend klasörüne at (örn. `backend` veya `api`).
- **Sunucudaki `.env` dosyasına dokunma** (silme, üzerine yazma). Sadece bu kod dosyalarını güncelle.
- Backend’i sunucuda yeniden başlat (SSH ile `node server.js` veya panelden restart).

### Kısa not

- Sadece **değişen / eklenen** dosyaları atman yeterli; FileZilla’da “üzerine yaz” dersen sadece güncellediğin dosyalar değişir.
- İlk seferde tüm listeyi at, sonra sadece değiştirdiğin dosyayı atabilirsin.

---

## “Her şeyi attım ama site değişmedi” diyorsan

1. **Doğru klasör mü?** Çoğu hosting’de gerçek web kökü `public_html` veya `www` olur. “public” bazen sadece bir alt klasördür. Bir üst klasöre çıkıp `public_html` veya `www` varsa **dosyaları oraya** at.
2. **Klasörün içine mi attın?** Eğer bilgisayarındaki **browdesing-songul** klasörünü olduğu gibi attıysan, site `siteadresi.com/browdesing-songul/` adresinde açılır. Ana adresin (`siteadresi.com`) güncellenmesi için **index.html, script.js, styles.css** vb. dosyalar doğrudan **public_html** (veya www) içinde olmalı, alt klasör içinde değil. Yani public_html içinde index.html görmelisin.
3. **Önbellek:** Tarayıcıda **Ctrl+F5** (zorunlu yenileme) yap veya gizli pencerede siteyi aç.
4. **Backend:** Sadece HTML/JS/CSS atıyorsan randevu, admin paneli gibi özellikler çalışmaz; sunucuda Node.js backend’in de çalışıyor olması gerekir. Görünümün değişmemesi ise çoğu zaman 1 veya 2’den kaynaklanır.

---

## Canlı sunucuda admin şifresini sıfırlama (SSH yoksa)

Backend canlı sunucuda çalışıyor ama admin panele giremiyorsan:

1. **Sunucudaki backend klasöründe** `.env` dosyasına şu satırı ekle (kendin bir kelime seç, en az 8 karakter):
   ```
   RESET_SECRET=canlisifresifirla2025
   ```

2. **Güncel server.js** dosyasını sunucuya at (bu sürümde reset endpoint’i var). Backend’i yeniden başlat.

3. Tarayıcıda şu adresi aç (site adresini ve secret’ı kendininkilerle değiştir):
   ```
   https://SITENIZ.com/api/admin/reset-password?secret=canlisifresifirla2025&password=admin123
   ```
   (API aynı domain’de `/api` altındaysa böyle. API farklı adresteyse, örn. `https://api.SITENIZ.com/admin/reset-password?secret=...&password=admin123`)

4. Sayfada `"Şifre güncellendi"` gibi bir mesaj görürsen tamam. **Güvenlik için** sunucudaki `.env` dosyasından **RESET_SECRET** satırını sil.

5. Admin panele **admin** / **admin123** ile giriş yap.
