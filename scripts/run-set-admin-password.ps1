$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root "backend\.env.supabase"

if (-not (Test-Path $envFile)) {
  Write-Error "Creer backend\.env.supabase depuis .env.supabase.example"
  exit 1
}

Get-Content $envFile | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
  $parts = $_ -split '=', 2
  if ($parts.Count -eq 2) {
    Set-Item -Path "Env:$($parts[0].Trim())" -Value $parts[1].Trim()
  }
}

if (-not $env:SUPABASE_DB_PASSWORD -and -not $env:DATABASE_URL -and -not $env:SUPABASE_DB_URL) {
  Write-Error "Remplir SUPABASE_DB_PASSWORD ou DATABASE_URL dans backend\.env.supabase"
  exit 1
}

if (-not $env:ADMIN_NEW_PASSWORD) {
  $env:ADMIN_NEW_PASSWORD = "admin123"
}

Set-Location (Join-Path $root "backend")
node (Join-Path $root "scripts\set-admin-password.js")
exit $LASTEXITCODE
