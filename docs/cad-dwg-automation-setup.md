# NEDVI CAD Studio — DWG a DXF editable (pendiente de activar)

## Estado real
El visor DWG utiliza Autodesk APS Model Derivative (SVF2), que **no** transforma el plano en entidades DXF editables. El editor actual acepta **DXF ASCII** y solo convierte LINE y LWPOLYLINE a segmentos visuales reescalados: no conserva cotas, bloques, textos ni coordenadas de obra. No publicitar este editor como CAD profesional.

## Integración prevista para supervisores
1. Restringir subida y procesamiento a personal interno activo de perfiles `administracion` y `obra`. Clientes sin endpoints de escritura.
2. Configurar Autodesk AutoCAD Automation API en el proyecto APS de NEDVI, incluyendo plan de consumo, AppBundle propio, Activity y alias específico versionado. Ver documentación: https://get-started.aps-dev.autodesk.com/tutorials/design-automation/
3. El AppBundle debe abrir un DWG en AutoCAD Engine, exportar una **copia DXF ASCII** y dejar trazabilidad de advertencias. Probar primero con archivo sin datos de clientes.
4. Subir DWG fuente a almacenamiento privado, crear un WorkItem bajo control del servidor, almacenar resultado DXF privado con caducidad de URLs y límite de costo/tiempo/tamaño.
5. Escanear salida y entidades compatibles; bloquear acceso al editor cuando la conversión falle, evitando interpretar geometría incompleta como fiel.
6. Mejorar parser/editor para preservar unidades, ejes, capas, arcos, bloques, textos y referencia de espacio modelo/papel antes de editar archivos de proyecto. Nunca sobrescribir originales.
7. Vincular documentos y versiones a proyectos reales y aplicar RLS de acceso por asignación; únicamente una versión aprobada se publica al cliente en lectura.

## Pendiente antes de iniciar trabajos facturables
- Confirmación explícita del administrador sobre habilitación de facturación y límites de presupuesto APS Automation.
- AppBundle y Activity verificados y publicados en Autodesk APS; actualmente no están configurados.
- Diseño de permisos por proyecto y almacenamiento persistente de resultados; el objeto Autodesk actual es transitorio y solo para vista.

## Criterios mínimos de aceptación
- Original DWG inmutable, versión nueva descargable.
- Revisiones independientes por proyecto, trazabilidad de usuario y aprobación.
- Usuario cliente nunca puede subir/editar y no ve borradores.
- Cualquier fallo de conversión o elemento ignorado se muestra como advertencia, no como edición DWG confirmada.
