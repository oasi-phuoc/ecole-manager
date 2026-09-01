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

  if (-not $env:SUPABASE_URL -or -not $env:SUPABASE_SERVICE_ROLE_KEY) {
  Write-Error "Remplir SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans backend\.env.supabase"
  exit 1
}
if (-not $env:DATABASE_URL -and -not $env:SUPABASE_DB_PASSWORD) {
  Write-Error "Remplir DATABASE_URL ou SUPABASE_DB_PASSWORD dans backend\.env.supabase"
  exit 1
}

Set-Location (Join-Path $root "backend")
node (Join-Path $root "scripts\migrate-auth-users.js")
exit $LASTEXITCODE
