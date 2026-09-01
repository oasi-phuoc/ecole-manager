# Copie le backend Express dans api-proxy avant deploy
$root = Split-Path -Parent $PSScriptRoot
$src = Join-Path $root "supabase\functions\_shared\ecole-backend"
$dst = Join-Path $root "supabase\functions\api-proxy\vendor\ecole-backend"
if (-not (Test-Path $src)) { Write-Error "Source introuvable: $src"; exit 1 }
New-Item -ItemType Directory -Force -Path (Split-Path $dst) | Out-Null
Copy-Item -Recurse -Force $src $dst
Write-Host "Copie vers api-proxy/vendor/ecole-backend OK"
Set-Location (Join-Path $root "supabase\functions\api-proxy")
npm install --omit=dev
exit $LASTEXITCODE
