# LOCALIA + ME Network: integración técnica

## Decisión de arquitectura (noviembre de 2026)

La documentación oficial de Meta Earth indica que ME Network mainnet es compatible con EVM desde el 15 de septiembre de 2026. Meta Earth también publica el paquete oficial `meta-earth-js-sdk`, que funciona en navegador y Node.js y documenta operaciones de contratos EVM.

LOCALIA usará este camino para el prototipo:

- **Web UI:** JavaScript (Vite actualmente). JavaScript/TypeScript es válido para la aplicación cliente y puede usar el SDK oficial.
- **Smart contract:** Solidity para la EVM de ME Network.
- **Interacción actual:** `ethers.js` + wallet EVM inyectada (EIP-1193) para que el usuario firme desde su wallet; es compatible con la EVM de ME Network. El SDK oficial `meta-earth-js-sdk` también existe, pero las operaciones EVM mainnet requieren `evmRpcUrl` y `evmChainId` explícitos.
- **Documentos:** archivos y datos personales fuera de la blockchain. Guardar solo hashes, IDs opacos y metadatos mínimos.
- **Objetivo HARBOR:** registrar las constancias demo aprobadas en ME Network mainnet, después de confirmar el endpoint EVM oficial y chain ID numérico. No usar Polygon ni otra cadena.

## Contrato inicial

`contracts/LocaliaCredentialRegistry.sol` permite:
1. Autorizar direcciones de emisores.
2. Registrar un ID opaco y el hash de un documento.
3. Verificar hash, emisor, fecha y estado.
4. Revocar credenciales.

El contrato NO convierte un documento en permiso oficial. Solo registra integridad y estado de una credencial. La validez institucional depende de la entidad emisora y su autorización.

## Configuración de red

La documentación oficial de ME indica que mainnet es EVM-compatible (anuncio del 15-09-2026). La guía oficial de ME Hub documenta el chain ID Hub como `me-chain`, pero ese valor es el identificador Cosmos/Hub y **no debe colocarse como chain ID numérico EVM**. Además, el anuncio de actualización V2.0.16 indicó que el EVM Chain ID se ajustó.

La documentación pública consultada no permite confirmar de forma segura el RPC EVM mainnet ni el chain ID numérico actual. Solicitar ambos al equipo oficial (devsupport@mec.me) o al canal técnico de HARBOR. El SDK oficial señala expresamente que las operaciones EVM mainnet requieren configurar `evmRpcUrl` y `evmChainId`.

La app no activa el registro hasta que `VITE_ME_EVM_CHAIN_ID` y `VITE_LOCALIA_REGISTRY_ADDRESS` estén configurados. El deploy local requiere `ME_EVM_RPC_URL`, `ME_EVM_CHAIN_ID` y una clave de despliegue guardada únicamente en `.env`. Un sitio HTTPS necesita RPC HTTPS si se consulta directamente desde el navegador.

## Flujo implementado en LOCALIA\n\nCuando el expediente demo pasa a `issued`, el panel permite conectar la wallet y registrar cada constancia. La app crea un ID opaco, envía `registerCredential(id, hash)` al contrato y guarda tx hash, chain ID y address emisora dentro del expediente cifrado. El QR se actualiza con esos datos. Cada transacción requiere aprobación de la wallet y gas. El contrato autoriza al deployer; otra wallet debe ser autorizada por el owner.\n\n## Seguridad

- Nunca guardar frases semilla ni claves privadas en el frontend, repositorio, Netlify variables públicas o localStorage.
- No subir certificados completos, nombres, números de identificación, direcciones ni otros datos personales a la blockchain.
- Calcular el hash de un archivo normalizado fuera de la cadena y verificarlo localmente al consultar.
- Usar wallet del usuario o un backend seguro para firmar; no incrustar claves de administrador.
- Probar el contrato, revisar permisos y confirmar el procedimiento de revocación antes de producción.

## Fuentes oficiales

- ME Developer Center: https://www.mec.me/en-US/developer-center\n- ME EVM compatibility: https://www.mec.me/en-US/developer-blog/me-network-goes-evm-compatible-embracing-the-ethereum-ecosys\n- ME SDK official repository: https://github.com/openmetaearth/meta-earth-js-sdk\n- Contacto técnico: devsupport@mec.me
- EVM compatibility announcement (2026-09-15): https://www.mec.me/en-US/developer-blog/me-network-goes-evm-compatible-embracing-the-ethereum-ecosys
- Meta Earth JS SDK: https://github.com/openmetaearth/meta-earth-js-sdk
