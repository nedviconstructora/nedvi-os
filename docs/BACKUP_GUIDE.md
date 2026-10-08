# Respaldo de NEDVI OS

## Estado y alcance

- La rama `backup/2026-10-08` conserva una instantánea del código.
- El esquema `nedvi_backup_20261008` dentro del proyecto Supabase contiene copias de tablas de `public`, junto con metadatos de Storage. **No es un respaldo externo** ni una recuperación completa ante pérdida del proyecto.
- Los datos `localStorage` residen en **cada navegador y origen** (dominio). No se respaldan en Supabase por el mero hecho de tener desplegada la aplicación.
- Los objetos binarios de Supabase Storage requieren un respaldo separado.

## Exportar datos locales del navegador
1. En la computadora y perfil del navegador usado habitualmente, abre NEDVI OS, ya sea en producción o `localhost`. Cada origen puede tener datos distintos.
2. Presiona F12, abre Console e inserta el contenido de `scripts/export-browser-data.js`.
3. Verifica que aparezca el archivo `nedvi-os-navegador-AAAA-MM-DD.json` en Descargas.
4. Repite para otros navegadores, perfiles, direcciones locales y equipos donde se haya trabajado.
5. Trata los archivos como **confidenciales**: pueden contener información personal, tokens de sesión o credenciales. No los compartas por chat, correo ni los subas al repositorio público.

## Backup externo de base de datos
1. Instala el cliente PostgreSQL (`pg_dump`), de una versión compatible con el servidor.
2. Obtén **de forma privada** la URI de conexión a la base de datos desde el panel de Supabase. Usa una conexión compatible con tu red.
3. En una sesión privada de PowerShell establece `$env:DATABASE_URL` y ejecuta `./scripts/backup-database.ps1`. No guardes la URI en scripts, historial compartido o Git.
4. Verifica que se haya generado un archivo `.dump` en `$HOME/NEDVI-OS-Backups`.
5. Guarda copias cifradas fuera del equipo y prueba una restauración en entorno aislado antes de depender del backup.

## Storage
Los respaldos SQL conservan metadatos, **no** el contenido binario de fotos, planos, evidencias y documentos. Exporta por separado todos los objetos de los buckets autorizados (actualmente `profile-avatars`, `project-documents`, `project-evidence`), usando credenciales privadas y la API oficial o el panel. Conserva la estructura de carpetas y un inventario de objetos.

## Automatización
No activar copias recurrentes que escriban datos a GitHub Actions artifacts de un repositorio público: podrían divulgar información sensible. Antes de automatizar, configurar destino **privado**, cifrado y credenciales del mínimo privilegio, y validar una restauración real.

## Seguridad
No restaurar `localStorage` completo a ciegas: puede incluir sesiones vencidas, tokens o estados de autorización. Migrar solamente datos de negocio tras validar esquema, propietario y políticas RLS.
