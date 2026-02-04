@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo Yapistirma penceresi kapaniyorsa: github-push.ps1 dosyasina sag tik ^> "PowerShell ile Calistir" kullanin (orada Ctrl+V calisir).
echo.

where git >nul 2>nul
if errorlevel 1 (
    echo Git yuklu degil. https://git-scm.com indir.
    pause
    exit /b 1
)

if not exist .git (
    git init
    git add .
    git commit -m "ilk yukleme" 2>nul || git commit --allow-empty -m "ilk yukleme"
    git branch -M main
    git remote add origin https://github.com/neocaes/site.git
)

echo.
echo GitHub token gerekli (ghp_ ile baslar).
echo Token yoksa: GitHub ^> Settings ^> Developer settings ^> Personal access tokens
echo.
echo CMD'de Ctrl+V calismaz - SAG TIK ile yapistirin. Pencere kapaniyorsa github-push.ps1 kullanin.
set /p TOKEN="Token buraya (sag tik yapistir) sonra Enter: "

git remote remove origin 2>nul
git remote add origin https://neocaes:%TOKEN%@github.com/neocaes/site.git

echo.
echo Push gonderiliyor...
git add .
git commit -m "guncelleme" 2>nul || git commit --allow-empty -m "guncelleme"
git branch -M main
git push -u origin main

echo.
if errorlevel 1 (echo Hata olustu.) else (echo Tamamlandi. https://github.com/neocaes/site)
echo.
pause
