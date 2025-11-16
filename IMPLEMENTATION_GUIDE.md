# E-Commerce Microservices - Complete Implementation Guide

Este documento contiene todas las instrucciones, código y pasos necesarios para completar la implementación del proyecto de e-commerce con microservicios para OpenShift.

## 📋 Estado Actual del Proyecto

### ✅ Completado

1. **Estructura Base del Proyecto**
   - Directorios creados para todos los servicios
   - Configuración raíz del proyecto
   - `.gitignore` y `.env.example`
   - `Makefile` con comandos útiles
   - `README.md` principal

2. **Shared Libraries** (`/shared`)
   - Types comunes (`common.types.ts`, `events.types.ts`)
   - Utilidades (`logger.ts`, `errors.ts`, `pagination.ts`, `validation.ts`)
   - Clientes (`rabbitmq.client.ts`, `redis.client.ts`)
   - Monitoring (`metrics.ts`)
   - Configuración de package.json y tsconfig.json

3. **Docker Compose** (`docker-compose.yaml`)
   - Configuración completa de todos los servicios
   - Bases de datos (PostgreSQL para cada servicio)
   - Redis, RabbitMQ, MinIO, Keycloak, Kong
   - Todos los microservicios
   - Frontend y Admin Panel

4. **Product Service - Parcialmente Completado**
   - `package.json` y `tsconfig.json`
   - Schema de Prisma completo
   - Configuración (`env.ts`, `database.ts`)
   - Validators (`product.validator.ts`)

### 🚧 Por Completar

1. **Product Service** - Código faltante
2. **Todos los demás microservicios** (Auth, Order, Payment, Content, Media, Email, Inventory, Analytics)
3. **Frontend** (Next.js)
4. **Admin Panel** (React + Vite)
5. **Kong API Gateway** - Configuración
6. **OpenShift Manifests** - Todos
7. **Tekton Pipelines**
8. **Scripts de Deployment**
9. **Monitoring Stack** (Prometheus, Grafana, Jaeger)
10. **Documentación completa**
11. **Guía de validación y testing**

---

## 🎯 PLAN DE ACCIÓN RECOMENDADO

Dado el tamaño del proyecto, te recomiendo el siguiente enfoque:

### Opción A: Implementación Modular (RECOMENDADA)

Implementar el proyecto en fases manejables, validando cada una antes de continuar:

#### **Fase 1: Microservicio Base Completo (Product Service)**
- ✅ Configuración (completado)
- ✅ Schema Prisma (completado)
- ✅ Validators (completado)
- ⬜ Repository pattern
- ⬜ Business services
- ⬜ API controllers y routes
- ⬜ Middleware (auth, error handling)
- ⬜ Server setup con Fastify
- ⬜ Dockerfile
- ⬜ Tests básicos

**Tiempo estimado**: Este es el servicio de referencia más completo.

#### **Fase 2: Infraestructura Base**
- ⬜ OpenShift manifests para PostgreSQL, Redis, RabbitMQ
- ⬜ Scripts de deployment básicos
- ⬜ Validar que Product Service se pueda deployar

#### **Fase 3: Servicios Críticos**
Implementar servicios en este orden (reutilizando estructura de Product Service):

1. **Auth Service** (crítico para todo lo demás)
   - Integración con Keycloak
   - Gestión de usuarios
   - JWT tokens

2. **Order Service**
   - Dependende de Product y Auth
   - State machine de órdenes
   - Integración con eventos

3. **Payment Service**
   - Stripe integration
   - Webhooks

#### **Fase 4: Servicios Complementarios**
4. Inventory Service
5. Content Service
6. Media Service
7. Email Service
8. Analytics Service

#### **Fase 5: Frontend**
- Customer Frontend (Next.js)
- Admin Panel (React)

#### **Fase 6: DevOps Completo**
- Tekton Pipelines
- Monitoring completo
- Documentación final

---

## 💡 RECOMENDACIÓN ESTRATÉGICA

### Para Maximizar Eficiencia

Te sugiero que continuemos con **UNO de los siguientes enfoques**:

### **Enfoque 1: Product Service Completo (MICRO-PASO)**

Completamos SOLO el Product Service al 100% con:
- Todo el código fuente
- Tests
- Dockerfile
- OpenShift manifests
- Documentación específica

**Ventaja**: Tienes un microservicio completo y funcional que sirve de plantilla para los demás.

### **Enfoque 2: Código Skeleton para Todos los Servicios (MACRO-PASO)**

Creo la estructura básica (package.json, schema, configuración, estructura de carpetas) para TODOS los servicios, sin implementar la lógica completa.

**Ventaja**: Tienes el proyecto completo "armado" y puedes ir implementando la lógica de cada servicio según necesites.

### **Enfoque 3: Guía de Auto-Implementación (DOCUMENTACIÓN)**

Te proporciono:
- Plantillas de código reutilizables
- Patrones y estructuras
- Guías paso a paso
- Scripts generadores

**Ventaja**: Puedes implementar los servicios que necesites, cuando los necesites, siguiendo patrones claros.

---

## 📝 CÓDIGO DE REFERENCIA - Product Service

### Repository Pattern

```typescript
// src/repositories/product.repository.ts
import { Prisma, Product, ProductStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { QueryProductsInput } from '../api/validators/product.validator';

export class ProductRepository {
  async create(data: Prisma.ProductCreateInput): Promise<Product> {
    return await prisma.product.create({ data });
  }

  async findById(id: string): Promise<Product | null> {
    return await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        images: { orderBy: { sortOrder: 'asc' } },
        variants: { where: { isActive: true } },
        attributes: true,
      },
    });
  }

  async findBySlug(slug: string): Promise<Product | null> {
    return await prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        images: { orderBy: { sortOrder: 'asc' } },
        variants: { where: { isActive: true } },
        attributes: true,
      },
    });
  }

  async findMany(params: QueryProductsInput) {
    const where: Prisma.ProductWhereInput = {
      ...(params.search && {
        OR: [
          { name: { contains: params.search, mode: 'insensitive' } },
          { description: { contains: params.search, mode: 'insensitive' } },
          { sku: { contains: params.search, mode: 'insensitive' } },
        ],
      }),
      ...(params.categoryId && { categoryId: params.categoryId }),
      ...(params.status && { status: params.status }),
      ...(params.isActive !== undefined && { isActive: params.isActive }),
      ...(params.isFeatured !== undefined && { isFeatured: params.isFeatured }),
      ...(params.isNew !== undefined && { isNew: params.isNew }),
      ...(params.onSale !== undefined && { onSale: params.onSale }),
      ...(params.priceMin || params.priceMax) && {
        price: {
          ...(params.priceMin && { gte: params.priceMin }),
          ...(params.priceMax && { lte: params.priceMax }),
        },
      },
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          images: { take: 1, orderBy: { sortOrder: 'asc' } },
        },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { [params.sortBy]: params.sortOrder },
      }),
      prisma.product.count({ where }),
    ]);

    return { products, total };
  }

  async update(id: string, data: Prisma.ProductUpdateInput): Promise<Product> {
    return await prisma.product.update({
      where: { id },
      data,
      include: {
        category: true,
        images: true,
        variants: true,
      },
    });
  }

  async delete(id: string): Promise<Product> {
    return await prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async incrementViewCount(id: string): Promise<void> {
    await prisma.product.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });
  }
}
```

### Service Layer

```typescript
// src/services/product.service.ts
import { Product } from '@prisma/client';
import { ProductRepository } from '../repositories/product.repository';
import { NotFoundError, ConflictError, logger } from '@ecommerce/shared';
import {
  CreateProductInput,
  UpdateProductInput,
  QueryProductsInput,
} from '../api/validators/product.validator';
import { slugify } from '@ecommerce/shared';
import { getRabbitMQ } from '@ecommerce/shared';
import { ProductEventType } from '@ecommerce/shared';

export class ProductService {
  constructor(private productRepository: ProductRepository) {}

  async createProduct(data: CreateProductInput): Promise<Product> {
    logger.info('Creating product', { sku: data.sku });

    // Generate slug from name
    const slug = slugify(data.name);

    // Check if product with SKU already exists
    const existingProduct = await this.productRepository.findBySlug(slug);
    if (existingProduct) {
      throw new ConflictError(`Product with slug ${slug} already exists`);
    }

    const product = await this.productRepository.create({
      ...data,
      slug,
    });

    // Publish product created event
    const rabbitmq = getRabbitMQ();
    await rabbitmq.publish('ecommerce.events', 'product.created', {
      id: crypto.randomUUID(),
      type: ProductEventType.CREATED,
      timestamp: new Date().toISOString(),
      source: 'product-service',
      data: {
        productId: product.id,
        sku: product.sku,
        name: product.name,
        price: Number(product.price),
        categoryId: product.categoryId || undefined,
      },
    });

    logger.info('Product created successfully', { productId: product.id });

    return product;
  }

  async getProductById(id: string): Promise<Product> {
    const product = await this.productRepository.findById(id);

    if (!product) {
      throw new NotFoundError('Product');
    }

    // Increment view count asynchronously
    this.productRepository.incrementViewCount(id).catch((err) => {
      logger.error('Failed to increment view count', err);
    });

    return product;
  }

  async getProductBySlug(slug: string): Promise<Product> {
    const product = await this.productRepository.findBySlug(slug);

    if (!product) {
      throw new NotFoundError('Product');
    }

    return product;
  }

  async listProducts(params: QueryProductsInput) {
    const { products, total } = await this.productRepository.findMany(params);

    return {
      products,
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.ceil(total / params.limit),
      },
    };
  }

  async updateProduct(id: string, data: UpdateProductInput): Promise<Product> {
    const existingProduct = await this.getProductById(id);

    // Update slug if name changed
    const updateData: any = { ...data };
    if (data.name && data.name !== existingProduct.name) {
      updateData.slug = slugify(data.name);
    }

    const updatedProduct = await this.productRepository.update(id, updateData);

    logger.info('Product updated', { productId: id });

    return updatedProduct;
  }

  async deleteProduct(id: string): Promise<void> {
    await this.getProductById(id); // Verify exists

    await this.productRepository.delete(id);

    logger.info('Product deleted', { productId: id });
  }
}
```

---

## 🤔 PREGUNTA PARA TI

¿Cuál enfoque prefieres que sigamos?

1. **✅ Completar Product Service al 100%** (código completo, tests, Dockerfile, deploy)
2. **📦 Estructura skeleton de todos los servicios** (sin lógica completa)
3. **📚 Guías y plantillas para auto-implementación**
4. **🎯 Otro enfoque que prefieras**

También puedo crear un **script generador** que cree automáticamente la estructura de código para cada servicio basándose en templates.

Por favor, indícame cómo prefieres proceder y continuaré inmediatamente con el enfoque que elijas.

---

## 📊 Estimación de Archivos Totales

- **Product Service**: ~50 archivos
- **Auth Service**: ~40 archivos
- **Order Service**: ~45 archivos
- **Payment Service**: ~25 archivos
- **Content Service**: ~35 archivos
- **Media Service**: ~20 archivos
- **Email Service**: ~15 archivos
- **Inventory Service**: ~30 archivos
- **Analytics Service**: ~25 archivos
- **Frontend**: ~80 archivos
- **Admin Panel**: ~60 archivos
- **OpenShift Manifests**: ~100 archivos
- **Tekton Pipelines**: ~20 archivos
- **Scripts**: ~15 archivos
- **Documentación**: ~20 archivos

**TOTAL: ~580 archivos aproximadamente**

Por eso necesito saber tu preferencia para optimizar el trabajo.
