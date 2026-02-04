# GitHub'a yukleme - PowerShell (burada Ctrl+V ile yapistirma calisir)
# Kullanim: Sag tik > "PowerShell ile Calistir" veya PowerShell acip: .\github-push.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " GitHub'a yukleme (neocaes/site)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "HATA: Git yuklu degil. https://git-scm.com adresinden indirip kurun." -ForegroundColor Red
    Read-Host "Cikmak icin Enter'a basin"
    exit 1
}

# Git kimligi yoksa bu depo icin ayarla (ilk commit icin gerekli)
$gitEmail = git config user.email 2>$null
$gitName = git config user.name 2>$null
if (-not $gitEmail -or $gitEmail -match "none|example\.com") {
    git config user.email "gozekse60@gmail.com"
    git config user.name "neocaes"
    Write-Host "Bu depo icin Git kullanici adi/email ayarlandi (neocaes)." -ForegroundColor Gray
}
if (-not $gitName -or $gitName -match "Your Name") {
    git config user.name "neocaes"
}

if (-not (Test-Path .git)) {
    Write-Host "Git init..."
    git init
    git config user.email "gozekse60@gmail.com"
    git config user.name "neocaes"
    git add .
    git commit -m "ilk yukleme"
    git branch -M main
    git remote add origin https://github.com/neocaes/site.git
} else {
    # Depo var ama hic commit yoksa (onceki calistirmada hata olduysa) ilk commit'i olustur
    $hasCommit = git rev-parse -q --verify HEAD 2>$null
    if (-not $hasCommit) {
        git config user.email "gozekse60@gmail.com"
        git config user.name "neocaes"
        git add .
        git commit -m "ilk yukleme"
        git branch -M main
        Write-Host "Ilk commit olusturuldu." -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "GitHub token gerekli (ghp_ ile baslar)." -ForegroundColor Yellow
Write-Host "Token yoksa: GitHub > Settings > Developer settings > Personal access tokens" -ForegroundColor Gray
Write-Host "Bu pencerede Ctrl+V ile yapistirabilirsiniz." -ForegroundColor Green
Write-Host ""

$token = Read-Host "Token'i buraya yapistirip Enter'a basin"

if ([string]::IsNullOrWhiteSpace($token)) {
    Write-Host "Token bos birakildi. Cikiliyor." -ForegroundColor Red
    Read-Host "Cikmak icin Enter'a basin"
    exit 1
}

git remote remove origin 2>$null
git remote add origin "https://neocaes:$token@github.com/neocaes/site.git"

Write-Host ""
Write-Host "Dosyalar ekleniyor ve gonderiliyor..." -ForegroundColor Cyan
git add .
git commit -m "guncelleme" 2>$null; if ($LASTEXITCODE -ne 0) { git commit --allow-empty -m "guncelleme" }
git branch -M main
git push -u origin main

Write-Host ""
if ($LASTEXITCODE -eq 0) {
    Write-Host "Tamamlandi. https://github.com/neocaes/site" -ForegroundColor Green
} else {
    Write-Host "Push basarisiz. Token veya baglanti kontrol edin." -ForegroundColor Red
}
Write-Host ""
Read-Host "Kapatmak icin Enter'a basin"
