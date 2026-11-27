# LOCALIA — Business Setup & Compliance Assistant

LOCALIA ayuda a emprendedores a preparar la apertura de un negocio: organiza datos del establecimiento, crea un checklist orientativo, permite armar un croquis preliminar y conduce un expediente por revisión, correcciones y aprobación.

## Flujo de la demostración

1. El usuario crea una bóveda con contraseña.
2. Ingresa la información del negocio y guarda un expediente cifrado localmente.
3. Ajusta el croquis ilustrativo y agrega archivos de respaldo (máximo 1 MB por archivo en esta demo).
4. Envía el expediente al panel de la entidad de prueba.
5. La entidad demo puede emitir un documento de corrección o aprobar. LOCALIA no aprueba permisos por sí sola.
6. Tras la aprobación de la entidad demo, se genera una constancia de demostración imprimible con QR y hash SHA-256.

## Entidad de prueba

- Nombre: **Entidad demostrativa LOCALIA (no oficial)**.
- Código de acceso demo: `LOCALIA-DEMO-2026`.
- Solo sirve para mostrar el flujo en el mismo navegador/dispositivo.
- No es una entidad pública, no representa una autoridad de Ecuador y no emite permisos legales.
- La aprobación y constancia son simuladas; no deben presentarse como un certificado oficial.

## Privacidad en esta versión

- Los datos del expediente y el contenido de archivos adjuntos se cifran con AES-GCM en el navegador.
- La clave se deriva de una contraseña con PBKDF2; la contraseña no se guarda.
- El expediente cifrado se guarda en el almacenamiento local del navegador, no en un servidor ni en ME Network.
- El usuario debe recordar la contraseña. Si la pierde, este prototipo no puede recuperar los datos.
- La entidad demo solo puede revisar el expediente desbloqueado en el mismo navegador. Esto es una simulación, no un control de acceso institucional seguro.
- No ingreses datos reales sensibles ni documentos reales en la demo pública.

## Importante: seguridad y producción

El almacenamiento local cifrado es solo una solución demostrativa. Para que una entidad real revise expedientes desde otro equipo, LOCALIA necesitará un backend seguro con:
- autenticación de usuario y de entidad;
- autorización por expediente, acceso mínimo y registro de auditoría;
- cifrado en tránsito y cifrado de archivos en almacenamiento con gestión de claves;
- compartir solo los datos necesarios con la entidad durante la revisión;
- política de conservación, revocación de acceso y eliminación;
- revisión de seguridad y cumplimiento de la normativa de protección de datos aplicable.

No es posible ocultar los datos necesarios a la entidad que debe revisarlos y, al mismo tiempo, pedirle que certifique su veracidad. La privacidad correcta es mantenerlos privados del público y permitir acceso limitado, justificado y auditado a la entidad autorizada.

## ME Network

La blockchain se usa únicamente después de la aprobación de la entidad autorizada:
- registrar un identificador opaco y hash del certificado final;
- no registrar nombres, identificación, dirección, archivos ni información personal;
- el QR de la demo contiene un identificador y hash de demostración, no una verificación blockchain activa.

El contrato Solidity de registro de credenciales está en `contracts/LocaliaCredentialRegistry.sol`. Antes de usarlo se debe confirmar el RPC HTTPS y chain ID oficial vigente, desplegar en testnet, autorizar al emisor real y auditar el contrato.

## Desarrollo

- Frontend: JavaScript + Vite
- EVM: ethers.js
- Contrato: Solidity
- QR: paquete qrcode

```bash
npm install
npm run dev
npm run build
```

Build Netlify:
- Build command: `npm run build`
- Publish directory: `dist`

## Estado

Prototipo de hackathon. Los requisitos son orientativos y deben contrastarse con las fuentes oficiales de cada municipio y organismo. No sustituye planos técnicos, inspecciones, asesoría profesional ni aprobación de autoridad competente.
