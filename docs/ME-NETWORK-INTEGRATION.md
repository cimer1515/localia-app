# LOCALIA + ME Network: integración técnica

## Decisión de arquitectura (noviembre de 2026)

La documentación oficial de Meta Earth indica que ME Network mainnet es compatible con EVM desde el 15 de septiembre de 2026. Meta Earth también publica el paquete oficial `meta-earth-js-sdk`, que funciona en navegador y Node.js y documenta operaciones de contratos EVM.

LOCALIA usará este camino para el prototipo:

- **Web UI:** JavaScript (Vite actualmente). JavaScript/TypeScript es válido para la aplicación cliente y puede usar el SDK oficial.
- **Smart contract:** Solidity para la EVM de ME Network.
- **Interacción:** paquete oficial `meta-earth-js-sdk` para consultas y transacciones EVM cuando configuremos el RPC correcto.
- **Documentos:** archivos y datos personales fuera de la blockchain. Guardar solo hashes, IDs opacos y metadatos mínimos.
- **Red inicial:** testnet, antes de cualquier despliegue en mainnet.

## Contrato inicial

`contracts/LocaliaCredentialRegistry.sol` permite:
1. Autorizar direcciones de emisores.
2. Registrar un ID opaco y el hash de un documento.
3. Verificar hash, emisor, fecha y estado.
4. Revocar credenciales.

El contrato NO convierte un documento en permiso oficial. Solo registra integridad y estado de una credencial. La validez institucional depende de la entidad emisora y su autorización.

## Configuración de red

El SDK oficial documenta EVM testnet con valores por defecto de RPC HTTP y chain ID 400. Una app web servida por HTTPS no puede llamar a un RPC HTTP por mixed content; debemos confirmar un RPC HTTPS accesible antes de integrar desde Netlify. Para mainnet, el SDK requiere configurar explícitamente el RPC EVM y el chain ID.

No se deben copiar endpoints o chain IDs de blogs o fuentes no oficiales. Confirmar valores vigentes en documentación oficial o con el equipo de Meta Earth antes de desplegar.

## Seguridad

- Nunca guardar frases semilla ni claves privadas en el frontend, repositorio, Netlify variables públicas o localStorage.
- No subir certificados completos, nombres, números de identificación, direcciones ni otros datos personales a la blockchain.
- Calcular el hash de un archivo normalizado fuera de la cadena y verificarlo localmente al consultar.
- Usar wallet del usuario o un backend seguro para firmar; no incrustar claves de administrador.
- Probar el contrato, revisar permisos y confirmar el procedimiento de revocación antes de producción.

## Fuentes oficiales

- ME Developer Center: https://www.mec.me/en-US/developer-center
- EVM compatibility announcement (2026-09-15): https://www.mec.me/en-US/developer-blog/me-network-goes-evm-compatible-embracing-the-ethereum-ecosys
- Meta Earth JS SDK: https://github.com/openmetaearth/meta-earth-js-sdk
