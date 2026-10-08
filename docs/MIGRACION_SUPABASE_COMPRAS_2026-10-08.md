# Migración a Supabase — Compras (8 de octubre de 2026)

## Estado realizado
- Se crearon en el proyecto Supabase `auiiobawsmvzcrlhwnnq` las tablas `public.nedvi_suppliers`, `public.nedvi_requisitions` y `public.nedvi_purchase_orders`.
- Esquema provisional de cada tabla: `id text` (PK), `owner_id uuid` (FK a auth.users), `folio text`, `payload jsonb`, `created_at` y `updated_at`.
- Se activó RLS. Se revocó explícitamente acceso de `anon` y `authenticated`; ninguna política permite todavía lectura/escritura desde el cliente.
- No se migraron registros ni se modificaron archivos usados por producción.

## Validaciones pendientes ANTES de activar el módulo
1. Exportar todos los datos del navegador de cada origen/perfil/equipo y verificar integridad.
2. Acordar modelo de propiedad y permisos para Administrador, Supervisor, empleados y Cliente. El diseño de `owner_id` es un punto de partida, no autorización terminada.
3. Crear políticas RLS con pruebas multiusuario (incluidos intentos de leer datos ajenos).
4. Implementar repositorio Supabase para proveedores, requisiciones y órdenes, con idempotencia, tratamiento de errores y control de versiones.
5. Migrar datos mediante importador explícito con vista previa y detección de duplicados. Evitar copiar contraseñas, sesiones o tokens del localStorage.
6. Probar creación, edición, lectura desde otro dispositivo, borrado, recarga, cambio de rol y restauración.
7. Solo después habilitar funcionalidades en producción. No eliminar almacenamiento local antes de confirmar todo.

## Respaldo
La copia de tablas dentro de Supabase y rama GitHub son protecciones parciales. Falta copia externa completa, binarios Storage y datos locales de navegador.
