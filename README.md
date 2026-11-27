# LOCALIA

**Business Setup & Compliance Assistant**

LOCALIA ayuda a emprendedores a preparar la apertura de su negocio mediante una guía de requisitos según actividad y ubicación, organización documental y un esquema visual inicial del local con señalética sugerida.

## Estado del prototipo
- Landing page responsive
- Formulario inicial para cafetería, tienda u oficina
- Checklist orientativo y esquema de local
- Panel de conexión de wallet EVM
- Contrato Solidity para registrar/verificar hash de credenciales y revocarlas
- Scripts de compilación y despliegue a un RPC EVM configurado

> Prototipo informativo. No emite permisos oficiales ni sustituye planos técnicos, inspecciones o validación de la autoridad competente.

## Stack compatible con Meta Earth
- Frontend: JavaScript con Vite
- Smart contract: Solidity para la EVM de ME Network
- Integración EVM actual: ethers.js para wallet y llamadas al contrato Solidity
- Meta Earth JS SDK oficial se mantiene como integración opcional futura; no es dependencia de la primera compilación web
- Herramienta de compilación del contrato: solc-js

Meta Earth anunció compatibilidad EVM para ME Network mainnet en septiembre de 2026. El SDK oficial documenta operaciones EVM y exige configurar explícitamente RPC y chain ID para mainnet.

## Preparación local
1. Instala Node.js 20+.
2. Clona el repositorio y ejecuta:
   ```bash
   npm install
   ```
3. Copia `.env.example` a `.env`.
4. Para compilar el contrato:
   ```bash
   npm run compile:contract
   ```
5. Para desplegar en testnet, completa el RPC oficial vigente, chain ID y una clave de prueba en `.env`, y ejecuta:
   ```bash
   npm run deploy:me-testnet
   ```
6. Copia la dirección del contrato desplegado en `VITE_LOCALIA_REGISTRY_ADDRESS` dentro de `.env`, y configura también las variables `VITE_*` necesarias para Vite.

No uses claves privadas de mainnet. Nunca subas el archivo `.env` a GitHub.

## Netlify
- Build command: `npm run build`
- Publish directory: `dist`
- Configura las variables `VITE_*` en Netlify. Estas variables se incluyen en el frontend y no deben contener secretos.

## Privacidad y seguridad
LOCALIA guarda únicamente hashes de documentos e identificadores opacos en la blockchain. Los documentos originales y datos personales deben permanecer fuera de la cadena. Un hash prueba integridad, no que una entidad haya emitido legalmente el documento.

Antes de despliegue real: confirmar RPC HTTPS y chain ID con Meta Earth, probar en testnet, revisar permisos del contrato y auditar seguridad.

## Fuentes
- [Meta Earth Developer Center](https://www.mec.me/en-US/developer-center)
- [ME Network EVM compatibility announcement](https://www.mec.me/en-US/developer-blog/me-network-goes-evm-compatible-embracing-the-ethereum-ecosys)
- [Official Meta Earth JS SDK](https://github.com/openmetaearth/meta-earth-js-sdk)
- [Integration notes](docs/ME-NETWORK-INTEGRATION.md)
