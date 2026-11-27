# LOCALIA — flujo de expediente, revisión y certificado

## Proceso propuesto

`Borrador → Enviado → Revisión de entidad → Corrección requerida (si aplica) → Reenvío → Aprobación de entidad → Certificado final → Registro de hash en ME Network`

### Responsabilidades

- LOCALIA puede completar campos derivados, ajustar el esquema según medidas, generar checklists y producir una lista de correcciones a partir de observaciones.
- LOCALIA no decide si un permiso es válido ni aprueba expedientes.
- La entidad autorizada verifica la documentación y toma la decisión.
- Si falta información o un documento no cumple, la entidad emite una corrección. La app la muestra, permite modificar los datos y volver a enviar.
- Después de aprobación, el sistema prepara el certificado final y calcula su hash.
- Solo el hash, un ID opaco y metadatos mínimos se registran en ME Network; el documento y datos personales permanecen fuera de la cadena.

## Entidad de prueba integrada

La interfaz incluye una entidad ficticia para una demostración. Para esta prueba el panel detecta campos vacíos y exige al menos dos archivos de respaldo adjuntos antes de aprobar; esa regla es solo de demo, no una lista oficial de requisitos. La entidad puede solicitar correcciones y el usuario debe corregir y reenviar:

- **Entidad:** Entidad demostrativa LOCALIA (no oficial)
- **PIN de demo:** `LOCALIA-DEMO-2026`
- **Alcance:** mismo navegador y dispositivo con el expediente desbloqueado.
- **Acciones:** ver datos de expediente, solicitar correcciones, aprobar demo.
- **Resultado:** constancia de demostración con QR y hash.

Este panel no tiene autenticación segura ni autoridad legal. El PIN está incluido en el código público; no usarlo como credencial real. La aprobación no se escribe a la blockchain ni representa una autorización municipal.

## Cifrado local del prototipo

La app cifra el JSON del expediente con AES-GCM. La clave se deriva mediante PBKDF2 (SHA-256, 250 000 iteraciones) de la contraseña introducida por el usuario. El registro cifrado se guarda en localStorage. Los adjuntos se codifican dentro del expediente y, por tanto, quedan cifrados junto con él.

Limitaciones:
- localStorage tiene capacidad limitada; esta demo limita cada archivo a 1 MB.
- una vulnerabilidad XSS en el sitio podría acceder a datos cuando el usuario desbloquea la bóveda; se requiere CSP y revisión de seguridad.
- la entidad no puede acceder desde otro dispositivo porque no existe backend.
- el usuario debe conservar la contraseña; no hay recuperación.
- para producción, migrar a backend seguro, almacenamiento de archivos cifrado, control de acceso por roles, KMS, auditoría, retención y eliminación.

## Protección de datos y acceso de la entidad

La información no debe ser pública. Sin embargo, la entidad que revisa un expediente necesita ver los datos y documentos relevantes para evaluar la solicitud. En producción, el usuario debe autorizar una divulgación limitada al organismo y expediente concretos, con acceso temporal, permisos mínimos y auditoría. No se debe revelar el expediente completo si la entidad solo necesita algunos campos.

## QR y blockchain

El QR de la constancia demo codifica un identificador y un hash. En esta fase no existe una página pública de verificación ni una transacción en ME Network. Para producción:
1. completar la revisión legal y técnica;
2. emitir el certificado desde el backend autorizado;
3. calcular hash del documento final;
4. registrar hash e ID opaco en el contrato desde la wallet de la entidad autorizada;
5. generar QR que apunte a un verificador público que consulte el registro;
6. no incluir información personal en el QR ni en eventos on-chain.

## Requisitos oficiales

La lista actual es un checklist de orientación para la demo, no una base normativa oficial. Antes de vender o presentar como herramienta de cumplimiento, cada requisito debe tener organismo responsable, jurisdicción, enlace fuente, fecha de verificación y condiciones por actividad. El contenido debe revisarse con la entidad participante.
