# Medidor

Ruta `/medidor`, menú Operaciones / Obra. Usa el permiso existente `operations` y el control de acceso de AppShell. No agrega APIs ni acceso a datos de clientes.

- Cámara: WebXR immersive-ar con hit-test y DOM overlay obligatorios. Requiere HTTPS, permiso del usuario y soporte del dispositivo/navegador; la detección inicial no garantiza que todas las funciones estén disponibles. No emula medidas con píxeles.
- Dos puntos del espacio local producen una distancia en metros. Solo se aceptan objetivos recientes (250 ms). Se cancela al reiniciar el espacio de referencia y se libera la sesión al salir.
- Medidas aproximadas; no se garantiza tolerancia. Validar con cinta/láser antes de usar en obra.
- Captura manual: distancia en metros o superficie rectangular largo × ancho.
- Resultados en memoria de la sesión del módulo; exportación CSV con protección contra fórmulas. No hay sincronización ni almacenamiento de fotos o proyectos.

## Validación física pendiente

En teléfono compatible, abrir `/medidor` por HTTPS. Permitir AR, detectar una superficie, marcar extremos de una longitud conocida y comparar contra cinta. Revisar permiso denegado, superficie perdida, interrupción, cerrar/reabrir cámara y volver a otra ruta. En dispositivo sin AR, verificar aviso y captura manual. Probar en modos claro y oscuro y en orientación vertical/horizontal. No declarar precisión validada hasta realizar estas pruebas.

Referencias: https://developer.mozilla.org/en-US/docs/Web/API/XRSession/requestHitTestSource y https://developer.mozilla.org/en-US/docs/Web/API/XRSession/requestAnimationFrame
