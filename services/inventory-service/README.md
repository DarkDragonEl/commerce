# Inventory Service

Real-time inventory management with stock reservations and tracking.

## Features

- **Stock Reservations** - Reserve stock for pending orders
- **Confirmation/Release** - Confirm reservations or release back to available
- **Stock Adjustments** - Manual stock adjustments with audit trail
- **Low Stock Alerts** - Automatic low stock notifications
- **Movement Tracking** - Complete stock movement history

## API

### Reserve Stock
```http
POST /api/v1/inventory/reserve
{
  "productId": "uuid",
  "quantity": 5,
  "orderId": "uuid"
}
```

### Confirm Reservation
```http
POST /api/v1/inventory/reservations/:id/confirm
```

### Release Reservation
```http
POST /api/v1/inventory/reservations/:id/release
```

### Adjust Stock
```http
POST /api/v1/inventory/:productId/adjust
{
  "quantity": 100,
  "reason": "Restock from supplier"
}
```

### Get Inventory
```http
GET /api/v1/inventory/:productId
```

### Check Low Stock
```http
GET /api/v1/inventory/low-stock
```

## Stock Flow

1. **Order Created** → Reserve stock (available → reserved)
2. **Payment Confirmed** → Confirm reservation (reserved → deducted from total)
3. **Order Cancelled** → Release reservation (reserved → available)

## Events

**Publishes:**
- `inventory.reserved` - Stock reserved
- `inventory.released` - Reservation released
- `inventory.low_stock` - Stock below threshold

**Subscribes:**
- `order.created` - Auto-reserve stock
- `order.cancelled` - Auto-release stock

## License

MIT
