# LOCALIA — Business Setup & Compliance Assistant

LOCALIA ayuda a emprendedores a preparar la apertura de un negocio: organiza datos del establecimiento, crea un checklist orientativo, permite distribuir cocina, baño, bodega, atención, entrada y salida en un plano editable, muestra señalética y circulación, prepara documentos de trabajo y conduce un expediente por revisión, correcciones y aprobación.

## Prueba rápida de certificados (sin blockchain)

La página independiente `/demo.html` permite abrir los tres certificados ficticios desde el inicio, ver sus QR y hashes de ejemplo, imprimir cada certificado por separado y simular el flujo de envío, correcciones, reenvío y aprobación de la entidad demo. No requiere crear bóveda ni conectar wallet. No usa ME Network ni guarda datos del usuario.

Para abrirla en desarrollo: ejecuta `npm run dev` y entra a `/demo.html`. La página principal también incluye un acceso directo a esta prueba. La página demo no reemplaza el flujo privado completo del expediente.

## Flujo de la demostración

1. El usuario crea una bóveda con contraseña.
2. Ingresa la información del negocio y guarda un expediente cifrado localmente.
3. Coloca las áreas del local en un plano de 10×8 celdas, revisa el flujo y la señalética, descarga el plano como PNG o lo adjunta cifrado al expediente. La distribución es personalizada, no un plano técnico.
4. Envía el expediente al panel de la entidad de prueba.
5. La entidad demo puede emitir un documento de corrección o aprobar. LOCALIA no aprueba permisos por sí sola.
6. La entidad debe verificar cada documento generado, revisar el plano y confirmar que estén adjuntos los respaldos requeridos por el tipo de negocio.
7. Tras la aprobación demo, se generan tres constancias separadas, cada una con QR e identificador y hash SHA-256.

## Documentos previos y certificados demo

Al elegir actividad, LOCALIA prepara borradores y vistas previas de la solicitud, declaración del responsable, croquis/señalética, checklist y fichas de preparación de seguridad y, cuando corresponde, sanitaria o comercial. También permite ver modelos de tres constancias que la entidad demo emitiría después de aprobar. Son plantillas de preparación, no permisos ni certificados oficiales.

## Entidad de prueba

- Nombre: **Entidad demostrativa LOCALIA (no oficial)**.
- Código de acceso demo: `LOCALIA-DEMO-2026`.
- Solo sirve para mostrar el flujo en el mismo navegador/dispositivo.
- No es una entidad pública, no representa una autoridad de Ecuador y no emite permisos legales.
- La entidad demo exige adjuntar los tipos de archivo requeridos para la actividad y marcar como revisados todos los documentos generados. Si algo falta, emite correcciones. Después de aprobar, se generan tres constancias de demostración no oficiales.

## Límites de archivos en la demo

Hasta 8 archivos adjuntos de máximo 180 KB cada uno. El plano generado puede adjuntarse directamente al expediente cifrado.

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

## Registro real de constancias demo en ME Network

Después de que la entidad demo aprueba y se generan las constancias, el panel muestra **“Conectar wallet y registrar constancias demo en ME Network”**. Al pulsarlo:

1. La app solicita conectar una wallet EVM compatible con ME Network.
2. Verifica que la wallet esté en el chain ID configurado.
3. Envía una transacción por cada constancia aún no registrada.
4. Guarda en la bóveda cifrada el hash de transacción, chain ID, dirección emisora e ID opaco.
5. Actualiza el QR para incluir la transacción on-chain.

Esto es un registro blockchain real cuando la transacción se confirma. La aprobación sigue siendo simulada y cada documento se marca **DEMO · NO OFICIAL**.

### Configuración obligatoria antes de activar mainnet

La documentación oficial confirma que ME Network mainnet es compatible con EVM, pero el SDK oficial indica que las operaciones EVM de mainnet necesitan un RPC y un EVM chain ID explícitos. La guía pública que revisamos no proporciona de forma verificable el endpoint EVM mainnet ni el chain ID numérico actual; el chain ID Hub `me-chain` no es un número EVM. No inventes esos valores.

Solicita al equipo de Meta Earth los datos oficiales de EVM mainnet y configura localmente:

- `ME_EVM_RPC_URL`: RPC HTTPS EVM mainnet oficial para desplegar.
- `ME_EVM_CHAIN_ID`: chain ID numérico EVM mainnet confirmado.
- `ME_DEPLOYER_PRIVATE_KEY`: clave de una wallet de despliegue, solo en tu archivo local `.env`; nunca la compartas ni la subas a GitHub.
- `VITE_ME_EVM_CHAIN_ID`: el mismo chain ID numérico, para validar la wallet en el navegador.
- `VITE_LOCALIA_REGISTRY_ADDRESS`: dirección del contrato después de desplegarlo en mainnet.

El registro requiere una wallet con fondos para gas y una dirección autorizada en el contrato. El deployer es el primer emisor autorizado. Si usarás otra wallet, el owner debe autorizarla.

El contrato Solidity está en `contracts/LocaliaCredentialRegistry.sol`. Registra solo IDs opacos y hashes; nunca nombres, números de identificación, direcciones del local ni archivos personales.

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
