# Order Service

Order Management microservice with State Machine pattern for the e-commerce platform.

## 🎯 Features

### Core Order Management
- **Order Creation** - Create orders from cart or directly
- **State Machine** - Proper order lifecycle management with XState
- **Order Tracking** - Track order status transitions
- **Order History** - Complete audit trail of all status changes
- **Order Validation** - Validate state transitions before applying

### State Machine Flow
```
DRAFT → PENDING → PAYMENT_PENDING → PAID → CONFIRMED →
PROCESSING → SHIPPED → DELIVERED → COMPLETED

Cancellation: Any state (except DELIVERED/COMPLETED) → CANCELLED
Refund: PAID/CONFIRMED/DELIVERED → REFUNDED
```

### Order States
- **DRAFT** - Cart not yet submitted
- **PENDING** - Order created, awaiting payment
- **PAYMENT_PENDING** - Payment being processed
- **PAID** - Payment confirmed
- **CONFIRMED** - Order confirmed, ready for fulfillment
- **PROCESSING** - Being prepared/packed
- **SHIPPED** - Shipped to customer
- **DELIVERED** - Delivered to customer
- **COMPLETED** - Order completed (final state)
- **CANCELLED** - Order cancelled (final state)
- **REFUNDED** - Payment refunded (final state)
- **FAILED** - Order failed (final state)

## 🏗️ Architecture

### Clean Architecture with State Machine
```
src/
├── api/
│   ├── controllers/      # HTTP request handlers
│   ├── routes/          # Route definitions
│   ├── middleware/      # Custom middleware
│   └── validators/      # Request validation
├── services/            # Business logic with state machine
├── repositories/        # Data access layer
├── state-machine/       # XState machine definition
│   └── order-machine.ts
├── config/              # Configuration
└── server.ts           # Application entry point
```

### Database Schema
- **Order** - Main order entity with status tracking
- **OrderItem** - Products in the order
- **OrderAddress** - Shipping and billing addresses
- **OrderPayment** - Payment information
- **OrderHistory** - State transition audit log
- **Cart** - Pre-order shopping cart
- **CartItem** - Items in cart

## 🚀 Getting Started

### Installation
```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

### Environment Variables
See `.env.example` for required configuration.

## 📡 API Endpoints

### Orders

#### Create Order
```http
POST /api/v1/orders
Content-Type: application/json

{
  "userId": "uuid",
  "userEmail": "john@example.com",
  "items": [
    {
      "productId": "uuid",
      "productSku": "SKU-001",
      "productName": "Product Name",
      "quantity": 2,
      "unitPrice": 49.99
    }
  ],
  "shippingAddress": {
    "firstName": "John",
    "lastName": "Doe",
    "addressLine1": "123 Main St",
    "city": "New York",
    "state": "NY",
    "postalCode": "10001",
    "country": "US"
  }
}
```

#### List Orders
```http
GET /api/v1/orders?page=1&limit=20&status=PENDING
```

#### Get Order
```http
GET /api/v1/orders/:id
GET /api/v1/orders/number/:orderNumber
```

#### Update Order Status
```http
PATCH /api/v1/orders/:id/status
Content-Type: application/json

{
  "status": "CONFIRMED",
  "reason": "Payment verified"
}
```

#### Cancel Order
```http
POST /api/v1/orders/:id/cancel
Content-Type: application/json

{
  "reason": "Customer requested cancellation"
}
```

#### Get Valid Transitions
```http
GET /api/v1/orders/:id/transitions
```

Response:
```json
{
  "success": true,
  "data": {
    "transitions": ["CONFIRMED", "REFUNDED", "CANCELLED"]
  }
}
```

## 🔧 State Machine

### Transition Validation
The state machine automatically validates all state transitions:

```typescript
import { isValidTransition, getValidTransitions } from './state-machine/order-machine';

// Check if transition is valid
const isValid = isValidTransition(OrderStatus.PAID, OrderStatus.CONFIRMED); // true
const isInvalid = isValidTransition(OrderStatus.PENDING, OrderStatus.SHIPPED); // false

// Get all valid transitions from current state
const transitions = getValidTransitions(OrderStatus.PAID);
// Returns: [CONFIRMED, REFUNDED, CANCELLED]
```

### State Transition Events
```typescript
// Events that trigger state transitions
type OrderEvent =
  | { type: 'SUBMIT' }              // DRAFT → PENDING
  | { type: 'PAYMENT_INITIATED' }   // PENDING → PAYMENT_PENDING
  | { type: 'PAYMENT_SUCCEEDED' }   // PAYMENT_PENDING → PAID
  | { type: 'PAYMENT_FAILED' }      // PAYMENT_PENDING → FAILED
  | { type: 'CONFIRM' }             // PAID → CONFIRMED
  | { type: 'START_PROCESSING' }    // CONFIRMED → PROCESSING
  | { type: 'SHIP' }                // PROCESSING → SHIPPED
  | { type: 'DELIVER' }             // SHIPPED → DELIVERED
  | { type: 'COMPLETE' }            // DELIVERED → COMPLETED
  | { type: 'CANCEL' }              // Any → CANCELLED
  | { type: 'REFUND' }              // PAID/CONFIRMED/DELIVERED → REFUNDED
```

## 📊 Events Published

The service publishes events to RabbitMQ:
- `order.created` - New order created
- `order.confirmed` - Order confirmed
- `order.paid` - Payment successful
- `order.processing` - Order being processed
- `order.shipped` - Order shipped
- `order.delivered` - Order delivered
- `order.cancelled` - Order cancelled
- `order.refunded` - Order refunded

## 🔗 Integration

### With Product Service
- Validates product availability
- Fetches product prices

### With Payment Service
- Initiates payment processing
- Receives payment status updates

### With Inventory Service
- Reserves inventory on order creation
- Commits inventory on payment success
- Releases inventory on cancellation

## 📝 API Documentation

Interactive API documentation:
```
http://localhost:3003/api-docs
```

## 🐳 Docker

```bash
docker build -t order-service:latest .
docker run -p 3003:3003 order-service:latest
```

## 📄 License

MIT
