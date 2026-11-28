# CAUSA — revisión legal, privacidad y seguridad (borrador de implementación)

## Estado
Este documento es un checklist de ingeniería y revisión legal, no una certificación de cumplimiento. No lanzar a usuarios reales hasta completar los campos de identidad del responsable, contactos, proveedores, transferencias, retención y revisión jurídica ecuatoriana.

## Alcance funcional declarado
Causa ayuda a preparar y organizar información de establecimientos, croquis ilustrativos, checklists y expedientes; facilita correcciones/revisión; y podrá generar certificados/verificadores cuando el emisor tenga autorización. No es autoridad pública ni garantiza permisos.

## Documentos legales publicados
- Página `/legal.html`: términos de uso, privacidad, tratamiento, derechos, cookies/almacenamiento, blockchain, seguridad, reclamaciones.
- Identidad legal, RUC, domicilio, contacto de privacidad, canal de derechos y fecha de vigencia están marcados como pendientes. Deben completarse antes del lanzamiento.
- El usuario debe aceptar los términos mediante acción afirmativa y recibir aviso de privacidad. Consentimientos opcionales separados y revocables.
- Guardar evidencia de aceptación: user/account ID, versión, fecha/hora, texto/versión, método y registro de revocación cuando aplique.

## Requisitos de producción (bloqueantes)
1. Backend con autenticación real y autorización por objeto (owner/issuer/admin); no confiar en permisos de interfaz.
2. Supabase RLS en todas las tablas; probar políticas con usuarios anon, autenticados, emisores y administradores. Denegar por defecto.
3. Storage privado; URLs firmadas de corta duración; límites de tamaño y MIME + validación de contenido; escaneo antimalware si se cargan documentos.
4. Claves secretas solo en servidor/secret manager. Nunca exponer service-role, wallet privada, RPC secrets o claves de administrador en variables `VITE_*`.
5. Contrato y emisor: wallet/rol autorizados, control de acceso, eventos mínimos, proceso de revocación/corrección, manejo de transacción pendiente/fallida y revisión independiente del contrato.
6. No guardar PII, PDF ni datos de negocio identificables on-chain. El hash puede ser dato personal si se relaciona con una persona; realizar evaluación de impacto y base legal.
7. Verificador QR: token aleatorio/opaque; rate limiting; no filtrar datos de expediente; evitar enumeración; verificar hash del archivo exacto y estado/revocación.
8. Registro de auditoría append-only en backend: actor, acción, expediente, hora, resultado; minimizar datos sensibles en logs.
9. Seguridad web: CSP, HTTPS, HSTS al confirmar HTTPS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, protección contra clickjacking, dependencias revisadas.
10. Gestión de incidentes, backup/restore probado, plan de continuidad, retención/eliminación y contratos con encargados.
11. Pruebas: permisos cruzados (A no lee B), carga de archivos maliciosos, XSS, CSRF si aplica, abuso de endpoints, filtrado de secretos, validación de estados y QR.
12. Legal: revisión de LOPDP y Reglamento, comercio electrónico, consumidor, propiedad intelectual, normativa sectorial/municipal; contratos de encargado, transferencias internacionales y delegado cuando sea obligatorio.

## Hallazgos visibles en el prototipo actual
- La demo utiliza localStorage y no tiene backend multiusuario; solo datos ficticios.
- El PIN de entidad demo está incluido en el JavaScript público y NO es autenticación. Nunca usarlo en producción.
- El flujo demo permite simular aprobación y genera constancias no oficiales. Mantener marca DEMO en pantallas, PDFs y QR.
- El almacenamiento cifrado local de otro flujo no protege frente a XSS mientras la bóveda está desbloqueada; CSP y revisión XSS son necesarias.
- Los datos del prototipo no deben tratarse como expedientes reales ni como sistema institucional.

## Criterio de salida a producción
No habilitar cuentas/expedientes reales hasta completar los requisitos bloqueantes, realizar revisión de seguridad independiente y aprobación legal del titular. Registrar evidencia de pruebas y responsable de cada control.
