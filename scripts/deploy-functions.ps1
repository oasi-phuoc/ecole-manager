# Build + deploy Edge Functions (sans Docker)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "=== Bundle api-proxy ===" -ForegroundColor Cyan
node scripts/bundle-api-proxy.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "=== Deploy api-proxy ===" -ForegroundColor Cyan
npx supabase functions deploy api-proxy --use-api
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "=== Deploy autres fonctions ===" -ForegroundColor Cyan
npx supabase functions deploy auth-legacy-login auth-mfa chatbot enclassement import-lora planning send-mail --use-api
exit $LASTEXITCODE
