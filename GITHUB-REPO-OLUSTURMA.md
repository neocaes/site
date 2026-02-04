# GitHub'da Repo Oluşturma (Adım Adım)

## 1. GitHub hesabı

- https://github.com adresine git.
- Hesabın yoksa **Sign up** ile kayıt ol.
- Varsa **Sign in** ile giriş yap.

---

## 2. Yeni repo oluştur

1. Sağ üstte **"+"** (veya profil fotoğrafının yanındaki ok) → **"New repository"** tıkla.
2. Şu alanları doldur:

   | Alan | Ne yazacaksın |
   |------|-------------------------------|
   | **Repository name** | `browdesing-songul` (veya istediğin isim, boşluksuz) |
   | **Description** | (İsteğe bağlı) Örn: Browdesing Songül randevu sitesi |
   | **Public** | İşaretli kalsın |
   | **Add a README file** | İşaretleme (projede zaten dosyalar var) |
   | **Add .gitignore** | İsteğe bağlı – işaretleme |
   | **Choose a license** | None |

3. **"Create repository"** butonuna tıkla.

---

## 3. Repo adresi

Repo oluşunca bir sayfa açılır. Üstte şöyle bir adres görürsün:

```
https://github.com/KULLANICI_ADIN/browdesing-songul.git
```

**KULLANICI_ADIN** = GitHub kullanıcı adın. Bu adresi kopyala; bir sonraki adımda kullanacaksın.

---

## 4. Bilgisayarındaki projeyi bu repo’ya bağla

Bilgisayarında **proje klasörünü** aç:  
`C:\Users\Mehmet\browdesing-songul`

### A) Git yüklü mü kontrol et

- **CMD** veya **PowerShell** aç.
- Şunu yaz: `git --version`
- Sürüm numarası çıkıyorsa Git kurulu. Çıkmıyorsa https://git-scm.com adresinden indirip kur.

### B) Proje klasöründe komutları çalıştır

PowerShell veya CMD’de:

```bash
cd C:\Users\Mehmet\browdesing-songul
```

Sonra sırayla:

```bash
git init
```

```bash
git add .
```

```bash
git commit -m "ilk yukleme"
```

```bash
git branch -M main
```

```bash
git remote add origin https://github.com/KULLANICI_ADIN/browdesing-songul.git
```

**(KULLANICI_ADIN** yerine kendi GitHub kullanıcı adını yaz. Repo adını değiştirdiysen **browdesing-songul** kısmını da ona göre yaz.)

```bash
git push -u origin main
```

- İlk `git push`’ta GitHub kullanıcı adı ve şifre (veya **Personal Access Token**) isteyebilir. Token kullanman gerekebilir: GitHub → Settings → Developer settings → Personal access tokens → yeni token oluştur, yetki ver, bu token’ı şifre yerine yapıştır.

---

## 5. Kontrol

- https://github.com/KULLANICI_ADIN/browdesing-songul adresine git.
- Proje dosyaların (index.html, backend klasörü vb.) orada görünüyorsa repo hazır; Render’da bu repo’yu bağlayabilirsin.

---

## Kısa özet

1. github.com → New repository → isim ver (browdesing-songul) → Create repository.
2. Proje klasöründe: `git init` → `git add .` → `git commit -m "ilk yukleme"` → `git branch -M main` → `git remote add origin https://github.com/KULLANICI_ADIN/browdesing-songul.git` → `git push -u origin main`.
3. GitHub’da dosyalar görününce tamamdır.
