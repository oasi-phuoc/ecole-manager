# Lit backend\.env.supabase et configure les secrets Edge Functions
$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root "backend\.env.supabase"
if (-not (Test-Path $envFile)) { Write-Error "backend\.env.supabase manquant"; exit 1 }

Get-Content $envFile | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
  $parts = $_ -split '=', 2
  if ($parts.Count -eq 2) { Set-Item -Path "Env:$($parts[0].Trim())" -Value $parts[1].Trim() }
}

$dbUrl = "postgresql://$($env:SUPABASE_DB_USER):$($env:SUPABASE_DB_PASSWORD)@$($env:SUPABASE_DB_HOST):$($env:SUPABASE_DB_PORT)/postgres"
$jwt = $env:JWT_SECRET
if (-not $jwt) { $jwt = "ecole_manager_jwt_secret_local_2024" }

Set-Location $root
# Supabase refuse les secrets préfixés SUPABASE_ — utiliser DATABASE_URL
npx supabase secrets set "DATABASE_URL=$dbUrl" "JWT_SECRET=$jwt" "MFA_BACKUP_PEPPER=$jwt"
exit $LASTEXITCODE
