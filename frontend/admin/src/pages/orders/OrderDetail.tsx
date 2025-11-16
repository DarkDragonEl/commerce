import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { formatPrice, formatDate } from '../../lib/utils';
import type { Order, OrderStatus } from '../../types';
import { ArrowLeft } from 'lucide-react';

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    try {
      const data = await api.getOrder(id!);
      setOrder(data);
    } catch (error) {
      console.error('Failed to fetch order:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!order) return;

    setUpdating(true);
    try {
      await api.updateOrderStatus(order.id, newStatus);
      setOrder({ ...order, status: newStatus as OrderStatus });
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update order status');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (!order) {
    return <div className="text-center py-8">Order not found</div>;
  }

  return (
    <div>
      <button
        onClick={() => navigate('/orders')}
        className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Orders
      </button>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">
          Order #{order.id.slice(0, 8).toUpperCase()}
        </h1>
        <select
          value={order.status}
          onChange={(e) => handleStatusChange(e.target.value)}
          disabled={updating}
          className="px-4 py-2 border rounded-md focus:ring-2 focus:ring-primary-500"
        >
          <option value="PENDING">Pending</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="PROCESSING">Processing</option>
          <option value="SHIPPED">Shipped</option>
          <option value="DELIVERED">Delivered</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="REFUNDED">Refunded</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold mb-4">Order Items</h2>
            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between pb-4 border-b last:border-0">
                  <div className="flex-1">
                    <p className="font-medium">{item.product?.name || `Product ${item.productId.slice(0, 8)}`}</p>
                    <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                    <p className="text-sm text-gray-600">Price: {formatPrice(item.price)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatPrice(item.total)}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-primary-600">{formatPrice(order.total, order.currency)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Order Info */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold mb-4">Order Information</h2>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-gray-600">Date</dt>
                <dd className="font-medium">{formatDate(order.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-gray-600">Status</dt>
                <dd className="font-medium">{order.status}</dd>
              </div>
              {order.trackingNumber && (
                <div>
                  <dt className="text-gray-600">Tracking Number</dt>
                  <dd className="font-medium">{order.trackingNumber}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Shipping Address */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold mb-4">Shipping Address</h2>
            <address className="text-sm not-italic">
              {order.shippingAddress.street}<br />
              {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}<br />
              {order.shippingAddress.country}
            </address>
          </div>
        </div>
      </div>
    </div>
  );
}
