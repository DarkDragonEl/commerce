/**
 * Database seeding script
 */

import { PrismaClient, ProductStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create categories
  const electronicsCategory = await prisma.category.create({
    data: {
      name: 'Electronics',
      slug: 'electronics',
      description: 'Electronic devices and gadgets',
      isActive: true,
      sortOrder: 1,
    },
  });

  const laptopsCategory = await prisma.category.create({
    data: {
      name: 'Laptops',
      slug: 'laptops',
      description: 'Portable computers',
      parentId: electronicsCategory.id,
      isActive: true,
      sortOrder: 1,
    },
  });

  const clothingCategory = await prisma.category.create({
    data: {
      name: 'Clothing',
      slug: 'clothing',
      description: 'Apparel and fashion',
      isActive: true,
      sortOrder: 2,
    },
  });

  // Create products
  const laptop = await prisma.product.create({
    data: {
      sku: 'LAP-001',
      slug: 'macbook-pro-16',
      name: 'MacBook Pro 16"',
      description: 'Powerful laptop with M3 chip, 16GB RAM, and 512GB SSD',
      shortDesc: 'High-performance laptop for professionals',
      price: 2499.99,
      compareAtPrice: 2799.99,
      stockQuantity: 50,
      lowStockThreshold: 10,
      trackInventory: true,
      status: ProductStatus.ACTIVE,
      isActive: true,
      isFeatured: true,
      isNew: true,
      onSale: true,
      categoryId: laptopsCategory.id,
      metaTitle: 'MacBook Pro 16" - High Performance Laptop',
      metaDescription: 'Get the powerful MacBook Pro 16" with M3 chip',
      primaryImage: 'https://example.com/images/macbook-pro-16.jpg',
      images: {
        create: [
          {
            url: 'https://example.com/images/macbook-pro-16-1.jpg',
            altText: 'MacBook Pro 16" front view',
            sortOrder: 0,
          },
          {
            url: 'https://example.com/images/macbook-pro-16-2.jpg',
            altText: 'MacBook Pro 16" side view',
            sortOrder: 1,
          },
        ],
      },
      attributes: {
        create: [
          { name: 'Processor', value: 'Apple M3 Pro' },
          { name: 'RAM', value: '16GB' },
          { name: 'Storage', value: '512GB SSD' },
          { name: 'Display', value: '16.2-inch Retina' },
          { name: 'Weight', value: '2.1 kg' },
        ],
      },
      variants: {
        create: [
          {
            sku: 'LAP-001-SG-16',
            name: 'Space Gray - 16GB RAM',
            price: 2499.99,
            stockQuantity: 30,
            options: { color: 'Space Gray', ram: '16GB' },
            isActive: true,
            sortOrder: 0,
          },
          {
            sku: 'LAP-001-SG-32',
            name: 'Space Gray - 32GB RAM',
            price: 2999.99,
            stockQuantity: 20,
            options: { color: 'Space Gray', ram: '32GB' },
            isActive: true,
            sortOrder: 1,
          },
        ],
      },
    },
  });

  const tshirt = await prisma.product.create({
    data: {
      sku: 'CLO-001',
      slug: 'cotton-tshirt-blue',
      name: 'Premium Cotton T-Shirt - Blue',
      description: '100% organic cotton t-shirt with a comfortable fit',
      shortDesc: 'Comfortable organic cotton t-shirt',
      price: 29.99,
      compareAtPrice: 39.99,
      stockQuantity: 200,
      lowStockThreshold: 20,
      trackInventory: true,
      status: ProductStatus.ACTIVE,
      isActive: true,
      isFeatured: false,
      isNew: true,
      onSale: true,
      categoryId: clothingCategory.id,
      metaTitle: 'Premium Cotton T-Shirt - Comfortable & Sustainable',
      metaDescription: 'High-quality organic cotton t-shirt available in multiple sizes',
      primaryImage: 'https://example.com/images/tshirt-blue.jpg',
      images: {
        create: [
          {
            url: 'https://example.com/images/tshirt-blue-1.jpg',
            altText: 'Blue t-shirt front',
            sortOrder: 0,
          },
        ],
      },
      attributes: {
        create: [
          { name: 'Material', value: '100% Organic Cotton' },
          { name: 'Fit', value: 'Regular' },
          { name: 'Care', value: 'Machine washable' },
        ],
      },
      variants: {
        create: [
          {
            sku: 'CLO-001-S',
            name: 'Small',
            stockQuantity: 50,
            options: { size: 'S' },
            isActive: true,
            sortOrder: 0,
          },
          {
            sku: 'CLO-001-M',
            name: 'Medium',
            stockQuantity: 75,
            options: { size: 'M' },
            isActive: true,
            sortOrder: 1,
          },
          {
            sku: 'CLO-001-L',
            name: 'Large',
            stockQuantity: 50,
            options: { size: 'L' },
            isActive: true,
            sortOrder: 2,
          },
          {
            sku: 'CLO-001-XL',
            name: 'Extra Large',
            stockQuantity: 25,
            options: { size: 'XL' },
            isActive: true,
            sortOrder: 3,
          },
        ],
      },
    },
  });

  // Create product relations
  await prisma.productRelation.create({
    data: {
      productId: laptop.id,
      relatedProductId: tshirt.id,
      relationType: 'related',
    },
  });

  console.log('✅ Database seeded successfully!');
  console.log(`Created ${await prisma.category.count()} categories`);
  console.log(`Created ${await prisma.product.count()} products`);
  console.log(`Created ${await prisma.productVariant.count()} product variants`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
