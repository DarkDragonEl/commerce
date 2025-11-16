# 🚀 Quick Start - E-Commerce Microservices

Guía rápida para levantar y probar el proyecto en menos de 10 minutos.

## ⚡ Inicio Rápido (Método Automático)

```bash
# 1. Clonar o navegar al proyecto
cd commerce

# 2. Iniciar todo con un solo comando
make quick-start
```

Este comando automáticamente:
- ✅ Instala todas las dependencias
- ✅ Inicia infraestructura (PostgreSQL, Redis, RabbitMQ, etc.)
- ✅ Espera a que los servicios estén listos
- ✅ Ejecuta migraciones de base de datos
- ✅ Seed de datos de prueba
- ✅ Muestra URLs de acceso

**Tiempo estimado**: 3-5 minutos

---

## 🔧 Inicio Manual (Paso a Paso)

Si prefieres hacerlo paso a paso o algo falla con el método automático:

### 1. Instalar Dependencias

```bash
# Shared libraries
cd shared
npm install
npm run build
cd ..

# Product Service
cd services/product-service
npm install
cd ../..
```

### 2. Iniciar Infraestructura

```bash
# Opción A: Con Make
make dev-detached

# Opción B: Con Docker Compose
docker-compose up -d
```

### 3. Esperar a que los Servicios Estén Listos

```bash
# Verificar que todo está corriendo
docker ps

# Deberías ver ~12 contenedores corriendo
```

### 4. Configurar Base de Datos

```bash
cd services/product-service

# Generar Prisma client
npx prisma generate

# Ejecutar migraciones
npx prisma migrate dev --name init

# Seed datos de prueba
npx prisma db seed
```

### 5. Iniciar Product Service

```bash
# Aún en services/product-service
npm run dev

# Deberías ver:
# ✅ Database connected successfully
# ✅ Redis initialized
# ✅ RabbitMQ connected
# ✅ Server listening on port 3001
```

---

## ✅ Verificación Rápida

### 1. Health Check

```bash
curl http://localhost:3001/health | jq
```

**Respuesta esperada**:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "checks": {
    "database": { "status": "up" },
    "redis": { "status": "up" }
  }
}
```

### 2. Listar Productos

```bash
curl http://localhost:3001/api/v1/products | jq
```

**Respuesta esperada**: Lista de productos con paginación

### 3. Producto Específico

```bash
curl http://localhost:3001/api/v1/products/slug/macbook-pro-16 | jq
```

**Respuesta esperada**: Detalles del MacBook Pro

### 4. Productos Destacados

```bash
curl http://localhost:3001/api/v1/products/featured | jq
```

**Respuesta esperada**: Lista de productos destacados

---

## 🎯 URLs de Acceso

Una vez que todo esté corriendo:

| Servicio | URL | Credenciales |
|----------|-----|--------------|
| **Product Service API** | http://localhost:3001/api/v1/products | - |
| **API Documentation** | http://localhost:3001/api-docs | - |
| **RabbitMQ Management** | http://localhost:15672 | ecommerce / ecommerce123 |
| **MinIO Console** | http://localhost:9001 | minioadmin / minioadmin123 |
| **Keycloak Admin** | http://localhost:8180 | admin / admin |
| **Kong Admin API** | http://localhost:8001 | - |
| **Prisma Studio** | http://localhost:5555 | (run `npx prisma studio`) |

---

## 🧪 Testing Rápido

### Crear un Producto

```bash
curl -X POST http://localhost:3001/api/v1/products \
  -H "Content-Type: application/json" \
  -d '{
    "sku": "QUICK-001",
    "name": "Quick Test Product",
    "description": "Product created from quick start guide",
    "price": 49.99,
    "stockQuantity": 100
  }' | jq
```

### Buscar Productos

```bash
curl "http://localhost:3001/api/v1/products?search=quick" | jq
```

### Filtrar por Precio

```bash
curl "http://localhost:3001/api/v1/products?priceMin=10&priceMax=100" | jq
```

---

## 🐛 Troubleshooting Rápido

### "Port already in use"

```bash
# Encontrar proceso
lsof -i :3001

# Matar proceso
kill -9 <PID>
```

### "Database connection failed"

```bash
# Reiniciar PostgreSQL
docker restart ecommerce-product-db

# Verificar que está corriendo
docker ps | grep postgres-product
```

### "Redis connection failed"

```bash
# Reiniciar Redis
docker restart ecommerce-redis

# Test de conexión
redis-cli -h localhost -p 6379 ping
```

### "RabbitMQ connection failed"

```bash
# Reiniciar RabbitMQ
docker restart ecommerce-rabbitmq

# Verificar logs
docker logs ecommerce-rabbitmq
```

### Limpiar Todo y Empezar de Nuevo

```bash
# Detener todos los contenedores
docker-compose down

# Eliminar volúmenes (⚠️ DESTRUYE DATOS)
docker-compose down -v

# Limpiar todo Docker
make clean

# Empezar de nuevo
make quick-start
```

---

## 📚 Siguientes Pasos

Una vez que tengas todo funcionando:

1. **Explorar la API**
   - Abrir http://localhost:3001/api-docs
   - Probar endpoints en Swagger UI
   - Ver ejemplos de requests/responses

2. **Ver los Datos**
   - Ejecutar `npx prisma studio` en services/product-service
   - Explorar las tablas y datos
   - Editar productos desde la UI

3. **Monitorear Eventos**
   - Abrir http://localhost:15672 (RabbitMQ)
   - Ver la queue "product-service.events"
   - Observar eventos cuando crees/actualices productos

4. **Ver Métricas**
   - Curl http://localhost:3001/metrics
   - Ver métricas de Prometheus
   - Contar requests, ver latencias, etc.

5. **Leer la Guía Completa**
   - Abrir `VALIDATION_GUIDE.md`
   - Seguir todos los tests
   - Validar funcionalidad completa

---

## 🎓 Comandos Útiles

```bash
# Ver logs de todos los servicios
docker-compose logs -f

# Ver logs de un servicio específico
docker logs -f ecommerce-product-service

# Ver qué puertos están en uso
lsof -i -P | grep LISTEN

# Ver estado de todos los contenedores
docker ps -a

# Reiniciar un servicio
docker restart ecommerce-product-service

# Entrar a un contenedor
docker exec -it ecommerce-product-db bash

# Ver uso de recursos
docker stats

# Limpiar recursos no usados
docker system prune -a
```

---

## 📊 Cheat Sheet

### Comandos Make

```bash
make help              # Ver todos los comandos disponibles
make dev               # Iniciar en modo desarrollo
make dev-detached      # Iniciar en background
make stop              # Detener todos los servicios
make logs              # Ver logs
make logs-service service=product-service  # Logs de un servicio
make clean             # Limpiar todo
make migrate           # Ejecutar migraciones
make seed              # Seed databases
make test              # Ejecutar tests
make health-check      # Verificar health de servicios
```

### Docker Compose

```bash
docker-compose up                    # Iniciar todo
docker-compose up -d                 # Iniciar en background
docker-compose down                  # Detener todo
docker-compose down -v               # Detener y eliminar volúmenes
docker-compose ps                    # Ver servicios corriendo
docker-compose logs -f [service]     # Ver logs
docker-compose restart [service]     # Reiniciar servicio
docker-compose build [service]       # Rebuild servicio
```

### Prisma

```bash
npx prisma generate              # Generar client
npx prisma migrate dev           # Crear y aplicar migración
npx prisma migrate deploy        # Aplicar migraciones (prod)
npx prisma migrate reset         # Reset DB (⚠️ DESTRUYE DATOS)
npx prisma db push               # Push schema sin migración
npx prisma db seed               # Ejecutar seed
npx prisma studio                # Abrir UI de datos
npx prisma format                # Formatear schema
```

---

## ✅ Checklist de Verificación

Marca cada item cuando lo completes:

- [ ] Infraestructura levantada (docker ps muestra ~12 contenedores)
- [ ] Product Service corriendo (logs sin errores)
- [ ] Health check responde OK
- [ ] Puedo listar productos
- [ ] Puedo ver un producto específico
- [ ] Puedo crear un producto
- [ ] Puedo actualizar un producto
- [ ] Puedo eliminar un producto
- [ ] Swagger UI accesible
- [ ] RabbitMQ Management accesible
- [ ] Eventos se publican a RabbitMQ
- [ ] Redis responde a PING
- [ ] Métricas disponibles en /metrics

---

## 🆘 Ayuda

Si algo no funciona:

1. **Revisar logs**:
   ```bash
   docker-compose logs -f
   ```

2. **Verificar health de infraestructura**:
   ```bash
   docker ps
   # Todos los contenedores deberían estar "Up"
   ```

3. **Consultar troubleshooting**:
   - Ver `VALIDATION_GUIDE.md` sección Troubleshooting
   - Ver documentación de cada servicio

4. **Limpiar y empezar de nuevo**:
   ```bash
   make clean
   make quick-start
   ```

---

**¡Listo! Ahora tienes el Product Service funcionando completamente. 🎉**

Para continuar, consulta:
- `VALIDATION_GUIDE.md` - Testing completo
- `IMPLEMENTATION_GUIDE.md` - Cómo continuar el desarrollo
- `STATUS.md` - Estado del proyecto y próximos pasos
