# Payment Service

Payment Processing microservice with Stripe integration for the e-commerce platform.

## 🎯 Features

### Stripe Integration
- **Payment Intents** - Secure payment processing
- **Webhooks** - Real-time payment status updates
- **Refunds** - Full and partial refund support
- **Payment Methods** - Credit/debit cards support
- **3D Secure** - SCA compliance

### Core Payment Features
- **Create Payment** - Initialize payment intent
- **Confirm Payment** - Complete payment with 3D Secure
- **Cancel Payment** - Cancel pending payments
- **Refund Payment** - Full or partial refunds
- **Payment Tracking** - Complete transaction history
- **Webhook Processing** - Automated status updates

## 🏗️ Architecture

### Database Models
- **Payment** - Main payment entity with Stripe references
- **Refund** - Refund tracking
- **Transaction** - Complete audit log
- **SavedPaymentMethod** - Stored payment methods
- **WebhookEvent** - Webhook event tracking

### Payment Flow
```
1. Create Payment → Payment Intent (pending)
2. Confirm Payment → 3D Secure (if required)
3. Stripe processes → Webhook updates status
4. Status: SUCCEEDED or FAILED
5. Optional: Refund (full/partial)
```

### Payment States
- **PENDING** - Payment initiated
- **PROCESSING** - Being processed
- **REQUIRES_ACTION** - 3D Secure required
- **SUCCEEDED** - Payment successful
- **FAILED** - Payment failed
- **CANCELLED** - Payment cancelled
- **REFUNDED** - Fully refunded
- **PARTIALLY_REFUNDED** - Partially refunded

## 🚀 Getting Started

### Prerequisites
- Stripe account
- Stripe API keys (test mode)
- PostgreSQL, Redis, RabbitMQ running

### Installation
```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

### Environment Variables
```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Database
DATABASE_URL=postgresql://paymentuser:paymentpass@localhost:5435/payment_db
```

## 📡 API Endpoints

### Create Payment
```http
POST /api/v1/payments
Content-Type: application/json

{
  "orderId": "uuid",
  "userId": "uuid",
  "userEmail": "john@example.com",
  "amount": 99.99,
  "currency": "USD",
  "paymentMethod": "CARD",
  "description": "Order payment"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "payment": {
      "id": "uuid",
      "status": "PENDING",
      "clientSecret": "pi_xxx_secret_xxx",
      "amount": 99.99
    }
  }
}
```

### Confirm Payment
```http
POST /api/v1/payments/:id/confirm
Content-Type: application/json

{
  "paymentMethodId": "pm_card_xxx"
}
```

### Refund Payment
```http
POST /api/v1/payments/:id/refund
Content-Type: application/json

{
  "amount": 49.99,
  "reason": "requested_by_customer"
}
```

### Webhooks
```http
POST /api/v1/payments/webhooks/stripe
Stripe-Signature: xxx

# Stripe sends webhook events here
# Events: payment_intent.succeeded, payment_intent.payment_failed, etc.
```

## 🔐 Webhook Setup

1. **Stripe Dashboard** → Developers → Webhooks
2. Add endpoint: `https://your-domain.com/api/v1/payments/webhooks/stripe`
3. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`
   - `charge.refunded`
4. Copy webhook signing secret to `.env`

## 📊 Events Published

- `payment.succeeded` - Payment successful
- `payment.failed` - Payment failed
- `payment.refunded` - Payment refunded
- `payment.cancelled` - Payment cancelled

## 🔗 Integration

### Frontend Integration
```typescript
// 1. Create payment on backend
const response = await fetch('/api/v1/payments', {
  method: 'POST',
  body: JSON.stringify({
    orderId,
    amount,
    // ...
  })
});

const { payment } = await response.json();

// 2. Confirm with Stripe.js
const stripe = Stripe('pk_test_...');
const { error } = await stripe.confirmCardPayment(payment.clientSecret, {
  payment_method: {
    card: cardElement,
    billing_details: { name: 'John Doe' }
  }
});

// 3. Webhook updates payment status automatically
```

## 🐳 Docker

```bash
docker build -t payment-service:latest .
docker run -p 3004:3004 payment-service:latest
```

## 📝 Testing with Stripe

Use Stripe test cards:
- Success: `4242 4242 4242 4242`
- 3D Secure: `4000 0027 6000 3184`
- Decline: `4000 0000 0000 0002`

## 📄 License

MIT
