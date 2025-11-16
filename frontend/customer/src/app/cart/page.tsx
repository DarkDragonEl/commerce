'use client';

import { useCartStore } from '@/store/cart';
import { formatPrice } from '@/lib/utils';
import Image from 'next/image';
import Link from 'next/link';
import { Trash2, Minus, Plus } from 'lucide-react';

export default function CartPage() {
  const { items, removeItem, updateQuantity, getTotalPrice } = useCartStore();

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Your Cart is Empty</h1>
          <p className="text-gray-600 mb-8">Add some products to get started!</p>
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

  const total = getTotalPrice();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div
              key={item.productId}
              className="bg-white rounded-lg shadow-sm p-4 flex items-center space-x-4"
            >
              <div className="relative w-24 h-24 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
                <Image
                  src={item.product.images?.[0] || '/placeholder-product.jpg'}
                  alt={item.product.name}
                  fill
                  className="object-cover"
                  sizes="96px"
                />
              </div>

              <div className="flex-1">
                <Link
                  href={`/products/${item.productId}`}
                  className="font-semibold hover:text-primary-600 transition-colors"
                >
                  {item.product.name}
                </Link>
                <p className="text-sm text-gray-600">{item.product.sku}</p>
                <p className="text-lg font-bold text-primary-600 mt-1">
                  {formatPrice(item.price, item.product.currency)}
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                  className="p-1 border border-gray-300 rounded hover:bg-gray-50"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-12 text-center font-medium">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                  className="p-1 border border-gray-300 rounded hover:bg-gray-50"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <div className="text-right">
                <p className="font-bold text-lg">
                  {formatPrice(item.price * item.quantity, item.product.currency)}
                </p>
              </div>

              <button
                onClick={() => removeItem(item.productId)}
                className="text-red-500 hover:text-red-700 transition-colors"
                title="Remove item"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm p-6 sticky top-20">
            <h2 className="text-xl font-bold mb-4">Order Summary</h2>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">{formatPrice(total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping</span>
                <span className="font-medium">
                  {total > 50 ? 'Free' : formatPrice(9.99)}
                </span>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="text-lg font-bold">Total</span>
                  <span className="text-lg font-bold text-primary-600">
                    {formatPrice(total + (total > 50 ? 0 : 9.99))}
                  </span>
                </div>
              </div>
            </div>

            <Link
              href="/checkout"
              className="block w-full bg-primary-600 text-white text-center py-3 px-6 rounded-md font-semibold hover:bg-primary-700 transition-colors"
            >
              Proceed to Checkout
            </Link>

            <Link
              href="/products"
              className="block w-full text-center text-primary-600 py-2 mt-4 hover:text-primary-700 transition-colors"
            >
              Continue Shopping
            </Link>

            {total < 50 && (
              <p className="text-sm text-gray-600 mt-4 text-center">
                Add {formatPrice(50 - total)} more for free shipping!
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
