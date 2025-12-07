# 🚀 Deploy Rápido en Vercel

Guía rápida para desplegar SnowRail (frontend + backend) en un único proyecto de Vercel.

## Pasos Rápidos

### 1. Preparar el Proyecto

El proyecto ya está configurado con:
- ✅ `vercel.json` en la raíz
- ✅ `api/index.ts` como handler de serverless functions
- ✅ Frontend configurado para rutas relativas en producción

### 2. Configurar Variables de Entorno en Vercel

Ve al dashboard de Vercel → Tu Proyecto → Settings → Environment Variables y añade:

#### Variables Mínimas Requeridas

```bash
# Database (requerida - usa PostgreSQL en la nube)
DATABASE_URL=postgresql://user:password@host:5432/snowrail

# Network
NETWORK=fuji
RPC_URL_AVALANCHE=https://api.avax-test.network/ext/bc/C/rpc

# Contract
TREASURY_CONTRACT_ADDRESS=0xTuDireccionContrato
PRIVATE_KEY=0xTuClavePrivada

# JWT
JWT_SECRET=tu_secreto_jwt_muy_seguro

# x402
PAY_TO_ADDRESS=0xTuDireccionPago
SETTLEMENT_MODE=facilitator

# AI Provider
AI_PROVIDER=openai
OPENAI_API_KEY=tu_clave_openai
```

#### Variables Opcionales

```bash
# Rail API (si las necesitas)
RAIL_API_BASE_URL=https://sandbox.layer2financial.com/api
RAIL_CLIENT_ID=tu_client_id
RAIL_CLIENT_SECRET=tu_client_secret

# Frontend (deja vacío para rutas relativas)
VITE_API_BASE_URL=
```

### 3. Deploy

#### Opción A: Desde Vercel Dashboard

1. Ve a [vercel.com](https://vercel.com)
2. Click en "Add New Project"
3. Conecta tu repositorio de GitHub/GitLab/Bitbucket
4. Vercel detectará automáticamente `vercel.json`
5. Configura las variables de entorno
6. Click en "Deploy"

#### Opción B: Desde CLI

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy (desde la raíz del proyecto)
vercel

# Deploy a producción
vercel --prod
```

### 4. Verificar el Deploy

Después del deploy, verifica:

1. **Frontend**: Visita `https://tu-proyecto.vercel.app`
2. **Backend Health**: Visita `https://tu-proyecto.vercel.app/health`
3. **API**: Prueba `https://tu-proyecto.vercel.app/api/agent/identity`

## Estructura del Deploy

```
Tu dominio de Vercel
├── / (frontend - React SPA)
├── /api/* (backend - Express serverless)
├── /auth/* (backend - autenticación)
├── /facilitator/* (backend - x402 facilitator)
└── /health (backend - health check)
```

## Solución de Problemas Rápida

### ❌ Error: "Cannot find module"
- **Solución**: Verifica que todas las dependencias estén en `package.json` y que el build compile correctamente

### ❌ Error: "Database connection failed"
- **Solución**: Usa una base de datos PostgreSQL en la nube (Railway, Supabase, Neon) y configura `DATABASE_URL`

### ❌ Error: "Function timeout"
- **Solución**: Aumenta `maxDuration` en `vercel.json` (hobby plan: máx 60s, pro: máx 300s)

### ❌ Frontend no se conecta al backend
- **Solución**: Deja `VITE_API_BASE_URL` vacío para usar rutas relativas

## Configuración de Base de Datos

Vercel serverless functions **NO** pueden usar SQLite. Necesitas PostgreSQL:

### Opciones Recomendadas:

1. **Supabase** (gratis): https://supabase.com
2. **Neon** (gratis): https://neon.tech
3. **Railway** (gratis con límites): https://railway.app

### Configurar Prisma con PostgreSQL:

```bash
# En backend/.env (local)
DATABASE_URL="postgresql://user:password@host:5432/snowrail"

# Ejecutar migraciones
cd backend
npx prisma migrate deploy
npx prisma generate
```

## Próximos Pasos

- 📖 Lee la [guía completa](./docs/VERCEL_DEPLOYMENT.md) para más detalles
- 🔧 Configura dominios personalizados en Vercel
- 📊 Monitorea los logs en Vercel Dashboard → Functions
- 🔐 Configura variables de entorno por ambiente (Development, Preview, Production)

## Notas Importantes

⚠️ **Base de Datos**: SQLite no funciona en serverless. Usa PostgreSQL.

⚠️ **Cold Starts**: La primera petición puede tardar 1-3 segundos.

⚠️ **Timeouts**: Plan hobby tiene límite de 60 segundos por función.

⚠️ **Variables de Entorno**: Todas deben estar configuradas antes del primer deploy.

---

¿Problemas? Revisa los logs en Vercel Dashboard → Functions → api/index.ts → Logs
