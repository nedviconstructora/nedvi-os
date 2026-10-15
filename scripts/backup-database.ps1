# Respaldo local de PostgreSQL/Supabase: requiere pg_dump instalado.
# Nunca subir DATABASE_URL ni los archivos resultantes a un repositorio publico.
$ErrorActionPreference = "Stop"
if ([string]::IsNullOrWhiteSpace($env:DATABASE_URL)) {
  throw "Configura DATABASE_URL de forma privada con la URI de conexion de Supabase. No la pongas en el repositorio."
}
if (-not (Get-Command pg_dump -ErrorAction SilentlyContinue)) {
  throw "No se encontro pg_dump. Instala las herramientas de cliente PostgreSQL."
}
$dir = Join-Path $HOME "NEDVI-OS-Backups"
New-Item -ItemType Directory -Path $dir -Force | Out-Null
$stamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$out = Join-Path $dir "nedvi-os-db-$stamp.dump"
& pg_dump --dbname="$env:DATABASE_URL" --format=custom --no-owner --no-acl --file="$out"
if ($LASTEXITCODE -ne 0) { throw "Falló pg_dump (código $LASTEXITCODE). Revisa conexión y permisos." }
Write-Host "Respaldo PostgreSQL creado: $out"
Write-Host "IMPORTANTE: este archivo NO incluye el contenido binario de Supabase Storage ni datos del navegador."
