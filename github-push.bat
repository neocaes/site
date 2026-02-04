@echo off
chcp 65001 >nul
echo ========================================
echo  GitHub'a yukleme (neocaes/site)
echo ========================================
cd /d "%~dp0"

where git >nul 2>nul
if errorlevel 1 (
    echo HATA: Git yuklu degil.
    echo https://git-scm.com adresinden indirip kur.
    pause
    exit /b 1
)

if not exist .git (
    echo Git init...
    git init
)

echo Dosyalar ekleniyor...
git add .

echo Commit...
git commit -m "ilk yukleme" 2>nul || git commit --allow-empty -m "ilk yukleme"

echo Branch main...
git branch -M main

echo Remote ekleniyor...
git remote remove origin 2>nul
git remote add origin https://github.com/neocaes/site.git

echo.
echo GitHub'a gonderiliyor...
echo.
echo --- SIFRE/TOKEN ISTENIRSE ---
echo   Kullanici adi: neocaes
echo   Sifre: GitHub token yapistir (sag tik ile yapistir - Ctrl+V calismaz)
echo   Yapistirdiktan sonra ENTER a bas.
echo   Pencereyi KAPATMA, sadece Enter bas.
echo.
git push -u origin main

if errorlevel 1 (
    echo.
    echo Push basarisiz olabilir.
    echo CMD'de yapistirmak icin: Pencereye SAG TIK yap (Ctrl+V degil).
    echo.
    pause
) else (
    echo.
    echo Tamamlandi. https://github.com/neocaes/site
)
echo.
pause
