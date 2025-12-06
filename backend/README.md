# SnowRail Backend

Backend API para el sistema de tesorería B2B SnowRail.

## Documentación

Toda la documentación se encuentra en la carpeta [`docs/`](./docs/):

- **[README Principal](./docs/README.md)** - Documentación completa del proyecto
- **[Quick Start](./docs/QUICKSTART.md)** - Guía de inicio rápido
- **[Testing](./docs/TESTING.md)** - Guía de testing
- **[Deployment](./docs/deployment/DEPLOYING_TO_TEE.md)** - Guía de despliegue
- **[Facilitator](./docs/FACILITATOR_README.md)** - Documentación del facilitator
- **[Payment Flow](./docs/PAYMENT_FLOW_EXPLANATION.md)** - Explicación del flujo de pagos
- **[RPC Configuration](./docs/RPC_CONFIGURATION.md)** - Configuración de RPC

## Inicio Rápido

```bash
# Setup inicial
./scripts/setup.sh

# Iniciar servidor
npm run dev

# Ejecutar tests
npm test
```

## Estructura del Proyecto

```
backend/
├── src/              # Código fuente
├── tests/            # Tests (unit, integration, e2e)
├── scripts/          # Scripts de utilidad
├── docs/             # Documentación
├── config/           # Archivos de configuración
└── prisma/           # Schema de base de datos
```

Para más detalles, ver [docs/README.md](./docs/README.md).

