# GitHub Personal Access Token (Şifre Yerine)

Push yaparken şifre kabul etmiyor; token oluşturup onu kullanacaksın.

---

## 1. Token oluştur

1. **GitHub’a giriş yap** → https://github.com
2. Sağ üstte **profil fotoğrafına** tıkla → **Settings**.
3. Sol menüde en alta in → **Developer settings**.
4. Sol menüden **Personal access tokens** → **Tokens (classic)**.
   - "Fine-grained tokens" değil, **"Tokens (classic)"** seç.
5. **Generate new token** → **Generate new token (classic)**.
6. **Note:** İsim ver (örn. `browdesing-push`).
7. **Expiration:** 90 days veya No expiration (istersen).
8. **Select scopes:** Sadece **repo** kutusunu işaretle (tüm repo yetkileri açılır).
9. En altta **Generate token** tıkla.
10. **Oluşan token’ı hemen kopyala** (örn. `ghp_xxxxxxxxxxxx`). Bir daha gösterilmez.

---

## 2. Push’ta token kullan

1. **github-push.bat** dosyasına tekrar çift tıkla.
2. İsterse:
   - **Username:** `neocaes`
   - **Password:** Buraya **GitHub şifreni değil**, az önce kopyaladığın **token’ı** yapıştır.
3. Enter’a bas.

Bazen Windows “Credentials” penceresi açar; orada da Password kısmına **token’ı** yaz.

---

## 3. Token’ı bir kez kaydetmek (isteğe bağlı)

İlk push’ta token’ı yazdıktan sonra Windows “Credential Manager” bunu kaydedebilir; sonraki push’larda tekrar sormayabilir.

---

## Kısa özet

1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic).
2. Generate new token (classic) → **repo** işaretle → Generate token.
3. Token’ı kopyala (ghp_...).
4. github-push.bat veya **github-push.ps1** (yapıştır çalışmıyorsa .ps1 kullan – sağ tık > PowerShell ile Çalıştır; orada Ctrl+V çalışır). Çalıştır → Password istenince **token’ı** yapıştır (şifre değil).
