# Deploy Jama Go Security to Hostinger VPS (jamago.qa)
# Usage: npm run deploy

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$dist = Join-Path $root "dist\jamago-security\browser"
$remote = "root@76.13.133.53:/var/www/jamago.qa/"

Set-Location $root
Write-Host "Building production bundle..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if (-not (Test-Path (Join-Path $dist "index.html"))) {
  Write-Error "Build output not found at $dist"
}

Write-Host ""
Write-Host "Uploading to $remote" -ForegroundColor Cyan
Write-Host "Enter your VPS root password when prompted." -ForegroundColor Yellow
Write-Host ""

scp -o StrictHostKeyChecking=accept-new -r "$dist\*" $remote
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "Upload complete. Fixing permissions on server..." -ForegroundColor Cyan
ssh root@76.13.133.53 "chown -R www-data:www-data /var/www/jamago.qa && chmod -R 755 /var/www/jamago.qa && ls -la /var/www/jamago.qa"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "Deployed! Open https://jamago.qa and hard-refresh (Ctrl+Shift+R)." -ForegroundColor Green
