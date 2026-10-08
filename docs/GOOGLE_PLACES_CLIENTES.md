# Google Places en CRM — NEDVI OS

## Función
Crear y editar cliente comparten `CustomerForm`. El nuevo componente permite buscar direcciones mediante Place Autocomplete (New), seleccionar y copiar la dirección formateada al campo editable `address` existente. El guardado continúa en el flujo habitual de Supabase. Si Google falla o la clave no existe, el campo manual sigue funcionando.

## Activación segura
1. En Google Cloud Console crea o selecciona un proyecto con facturación activa.
2. Habilita **Maps JavaScript API** y **Places API (New)**.
3. Crea una API key de navegador. Restringe por sitios web HTTP referrers a la URL real de producción (y a localhost solo si se usa en desarrollo) y restringe APIs a las anteriores.
4. Configura presupuestos, alertas y cuota para controlar consumo.
5. En Vercel configura `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` para el entorno adecuado. El prefijo NEXT_PUBLIC indica que la clave será visible en el navegador; la seguridad depende de restricciones correctas. No subir claves al repositorio.
6. Realiza un nuevo deploy de la rama de prueba y verifica selección de direcciones, edición manual y guardado en Supabase en Crear/Editar cliente.
7. Solo después de las pruebas fusiona a main.

## Limitaciones
- Guarda texto de domicilio; no agrega nuevas columnas de latitud/longitud o código postal.
- Las sugerencias están limitadas a México.
- Debe probarse con factura/clave real; sin clave se mantiene entrada manual.
