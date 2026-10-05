$ErrorActionPreference = 'Stop'

$projectUrl = 'https://auiiobawsmvzcrlhwnnq.supabase.co'
$envPath = Join-Path (Get-Location) '.env.local'

Write-Host ''
Write-Host 'NEDVI OS - Configuracion de Supabase' -ForegroundColor Cyan
Write-Host 'Proyecto:' $projectUrl
Write-Host ''
Write-Host 'Copia desde Supabase > Settings > API Keys > Legacy anon, service_role API keys' -ForegroundColor Yellow
Write-Host 'UNICAMENTE la clave anon/public. Nunca uses service_role.' -ForegroundColor Yellow
Write-Host ''

$anonKey = (Read-Host 'Pega aqui la Legacy anon key (debe comenzar con eyJ)').Trim()

if (-not $anonKey.StartsWith('eyJ')) {
  Write-Host ''
  Write-Host 'La clave no parece una Legacy anon key. No se realizaron cambios.' -ForegroundColor Red
  exit 1
}

$existing = @()
if (Test-Path $envPath) {
  $existing = Get-Content $envPath | Where-Object {
    $_ -notmatch '^NEXT_PUBLIC_SUPABASE_URL=' -and
    $_ -notmatch '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' -and
    $_ -notmatch '^NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='
  }
}

$newLines = @()
$newLines += $existing
$newLines += "NEXT_PUBLIC_SUPABASE_URL=$projectUrl"
$newLines += "NEXT_PUBLIC_SUPABASE_ANON_KEY=$anonKey"

$newLines | Set-Content -Path $envPath -Encoding utf8

Write-Host ''
Write-Host '.env.local actualizado correctamente.' -ForegroundColor Green
Write-Host 'Se configuro:' -ForegroundColor Green
Write-Host "  NEXT_PUBLIC_SUPABASE_URL=$projectUrl"
Write-Host ('  NEXT_PUBLIC_SUPABASE_ANON_KEY=' + $anonKey.Substring(0,[Math]::Min(12,$anonKey.Length)) + '...' + $anonKey.Substring([Math]::Max(0,$anonKey.Length-6)))
Write-Host ''
Write-Host 'Ahora ejecuta:' -ForegroundColor Cyan
Write-Host '  Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue'
Write-Host '  npm run dev'
Write-Host ''
Write-Host 'Y revisa: http://localhost:3000/supabase-check' -ForegroundColor Cyan
