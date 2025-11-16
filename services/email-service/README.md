# Email Service

Email notification service with template rendering and queue processing.

## Features

- **Template Rendering** - Handlebars templates with CSS inlining
- **Queue Processing** - Automatic retry on failure
- **Event-Driven** - Listens to RabbitMQ events
- **SMTP Support** - Nodemailer integration
- **Status Tracking** - Email delivery status

## Templates

- `order-confirmation` - Order confirmed
- `payment-success` - Payment successful
- `shipment-notification` - Order shipped
- `welcome` - New user welcome

## API

### Send Email
```http
POST /api/v1/emails
{
  "to": "user@example.com",
  "subject": "Order Confirmed",
  "template": "order-confirmation",
  "variables": {
    "customerName": "John",
    "orderNumber": "ORD-123",
    "total": "99.99"
  }
}
```

### Get Email Status
```http
GET /api/v1/emails/:id
```

## Events

Automatically sends emails for:
- `user.registered` → Welcome email
- `order.confirmed` → Order confirmation
- `payment.succeeded` → Payment success
- `order.shipped` → Shipment notification

## Configuration

Configure SMTP in `.env`:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## License

MIT
