# Installe esbuild pour le script bundle-api-proxy (plus de copie vendor Express).
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location (Join-Path $root "supabase\functions\api-proxy")
npm install
exit $LASTEXITCODE
