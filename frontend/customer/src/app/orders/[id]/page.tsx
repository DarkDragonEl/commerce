'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/lib/api';
import { formatPrice, formatDate } from '@/lib/utils';
import type { Order } from '@/types';
import { CheckCircle } from 'lucide-react';

export default function OrderDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const success = searchParams.get('success') === 'true';

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const data = await api.getOrder(params.id as string);
        setOrder(data);
      } catch (error) {
        console.error('Failed to fetch order:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [params.id]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-gray-200 rounded-lg h-96 animate-pulse" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-gray-500">Order not found</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'CONFIRMED':
      case 'PROCESSING':
        return 'bg-blue-100 text-blue-800';
      case 'SHIPPED':
        return 'bg-purple-100 text-purple-800';
      case 'DELIVERED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
      case 'REFUNDED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-6 py-4 rounded-lg mb-6 flex items-center">
          <CheckCircle className="h-6 w-6 mr-2" />
          <div>
            <p className="font-semibold">Order placed successfully!</p>
            <p className="text-sm">Thank you for your purchase. We'll send you updates via email.</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Order #{order.id.slice(0, 8).toUpperCase()}</h1>
            <p className="text-gray-600">{formatDate(order.createdAt)}</p>
          </div>
          <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
            {order.status}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h2 className="font-semibold mb-2">Shipping Address</h2>
            <p className="text-gray-700">
              {order.shippingAddress.street}<br />
              {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}<br />
              {order.shippingAddress.country}
            </p>
          </div>

          {order.billingAddress && (
            <div>
              <h2 className="font-semibold mb-2">Billing Address</h2>
              <p className="text-gray-700">
                {order.billingAddress.street}<br />
                {order.billingAddress.city}, {order.billingAddress.state} {order.billingAddress.zipCode}<br />
                {order.billingAddress.country}
              </p>
            </div>
          )}
        </div>

        {order.trackingNumber && (
          <div className="mb-6">
            <h2 className="font-semibold mb-2">Tracking Information</h2>
            <p className="text-gray-700">Tracking Number: <span className="font-medium">{order.trackingNumber}</span></p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold mb-4">Order Items</h2>

        <div className="space-y-4 mb-6">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center space-x-4 pb-4 border-b last:border-b-0">
              {item.product && (
                <div className="relative w-20 h-20 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
                  <Image
                    src={item.product.images?.[0] || '/placeholder-product.jpg'}
                    alt={item.product.name}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                </div>
              )}

              <div className="flex-1">
                {item.product ? (
                  <Link
                    href={`/products/${item.productId}`}
                    className="font-semibold hover:text-primary-600 transition-colors"
                  >
                    {item.product.name}
                  </Link>
                ) : (
                  <p className="font-semibold">Product #{item.productId.slice(0, 8)}</p>
                )}
                <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                <p className="text-sm text-gray-600">Price: {formatPrice(item.price)}</p>
              </div>

              <div className="text-right">
                <p className="font-bold text-lg">{formatPrice(item.total)}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t pt-4">
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span className="text-primary-600">{formatPrice(order.total, order.currency)}</span>
          </div>
        </div>
      </div>

      <div className="mt-6 text-center">
        <Link
          href="/products"
          className="inline-block bg-primary-600 text-white px-8 py-3 rounded-md font-semibold hover:bg-primary-700 transition-colors"
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
