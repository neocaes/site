# Domain’e Alma (Canlı Yayın)

Siteyi kendi domain’inizde (örn. **browdesignsongul.com**) yayınlamak için:

## 1. Aynı domain’de site + API (önerilen)

Site ve API aynı domain’de, API `/api` altında:

- **Site:** `https://browdesignsongul.com` (index.html, randevu, admin)
- **API:** `https://browdesignsongul.com/api/content`, `/api/appointments`, vb.

### Backend (`backend/.env`)

```env
PORT=3000
BASE_PATH=/api
BASE_URL=https://browdesignsongul.com/api
FRONTEND_URL=https://browdesignsongul.com
```

### Sunucu (Nginx) örneği

- Site dosyalarını (index.html, script.js, vb.) domain’in kökünde servis edin.
- `/api` isteklerini Node backend’e yönlendirin:

```nginx
location /api {
  proxy_pass http://127.0.0.1:3000;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}
```

### Frontend

HTML’de `<meta name="api-base" content="http://localhost:3000">` **değiştirmenize gerek yok**. Site domain’den (localhost değil) açıldığında API adresi otomatik olarak `https://siteniz.com/api` kullanılır.

---

## 2. API ayrı subdomain’de

API’yi örn. **api.browdesignsongul.com**’da çalıştırıyorsanız:

### Backend (`backend/.env`)

```env
BASE_URL=https://api.browdesignsongul.com
FRONTEND_URL=https://browdesignsongul.com
# BASE_PATH boş bırakın
```

### Frontend

Tüm HTML sayfalarında (index.html, admin.html, manage.html, manage-list.html) meta’yı güncelleyin:

```html
<meta name="api-base" content="https://api.browdesignsongul.com" id="api-base-meta">
```

---

## Özet

| Ortam   | API_BASE (frontend)        | Backend .env                          |
|--------|----------------------------|----------------------------------------|
| Yerel  | `http://localhost:3000`    | BASE_URL=http://localhost:3000, FRONTEND_URL=http://localhost:5500 |
| Domain (aynı) | Otomatik: `https://siteniz.com/api` | BASE_PATH=/api, BASE_URL=https://siteniz.com/api, FRONTEND_URL=https://siteniz.com |
| Domain (ayrı API) | Meta: `https://api.siteniz.com` | BASE_URL=https://api.siteniz.com, FRONTEND_URL=https://siteniz.com |

E-posta linkleri (doğrulama, randevu yönetimi) `BASE_URL` ve `FRONTEND_URL` ile oluşturulur; domain’e geçerken bu değerleri mutlaka güncelleyin.
