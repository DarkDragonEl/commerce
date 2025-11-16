'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCartStore } from '@/store/cart';
import { formatPrice } from '@/lib/utils';
import type { Product } from '@/types';
import { ShoppingCart } from 'lucide-react';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCartStore();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product);
  };

  const imageUrl = product.images?.[0] || '/placeholder-product.jpg';

  return (
    <Link href={`/products/${product.id}`} className="group">
      <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-gray-200">
        <div className="relative aspect-square bg-gray-100">
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
          />
          {!product.isActive && (
            <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
              Unavailable
            </div>
          )}
        </div>

        <div className="p-4">
          <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors">
            {product.name}
          </h3>

          {product.description && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
              {product.description}
            </p>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xl font-bold text-primary-600">
              {formatPrice(product.price, product.currency)}
            </span>

            <button
              onClick={handleAddToCart}
              disabled={!product.isActive}
              className="bg-primary-600 text-white p-2 rounded-md hover:bg-primary-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              title="Add to cart"
            >
              <ShoppingCart className="h-5 w-5" />
            </button>
          </div>

          {product.stock !== undefined && product.stock < 10 && (
            <p className="text-xs text-orange-600 mt-2">
              Only {product.stock} left in stock
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
