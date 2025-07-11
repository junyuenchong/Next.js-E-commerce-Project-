const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedDatabase() {
  try {
    console.log('Seeding database with sample data...\n');
    
    // Create categories
    const categories = [
      { name: 'Electronics', slug: 'electronics' },
      { name: 'Clothing', slug: 'clothing' },
      { name: 'Home & Garden', slug: 'home-garden' },
      { name: 'Sports', slug: 'sports' },
      { name: 'Books', slug: 'books' }
    ];
    
    for (const cat of categories) {
      try {
        await prisma.category.upsert({
          where: { slug: cat.slug },
          update: {},
          create: cat
        });
        console.log(`✓ Category created: ${cat.name}`);
      } catch (error) {
        console.log(`Category ${cat.name} already exists`);
      }
    }
    
    // Get category IDs
    const electronics = await prisma.category.findUnique({ where: { slug: 'electronics' } });
    const clothing = await prisma.category.findUnique({ where: { slug: 'clothing' } });
    const homeGarden = await prisma.category.findUnique({ where: { slug: 'home-garden' } });
    const sports = await prisma.category.findUnique({ where: { slug: 'sports' } });
    const books = await prisma.category.findUnique({ where: { slug: 'books' } });
    
    // Create sample products
    const products = [
      {
        title: 'Wireless Bluetooth Headphones',
        slug: 'wireless-bluetooth-headphones',
        description: 'High-quality wireless headphones with noise cancellation',
        price: 89.99,
        imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
        categoryId: electronics.id
      },
      {
        title: 'Smartphone Case',
        slug: 'smartphone-case',
        description: 'Durable protective case for your smartphone',
        price: 19.99,
        imageUrl: 'https://images.unsplash.com/photo-1603314585442-ee3b3c16fbcf?w=400',
        categoryId: electronics.id
      },
      {
        title: 'Cotton T-Shirt',
        slug: 'cotton-tshirt',
        description: 'Comfortable 100% cotton t-shirt',
        price: 24.99,
        imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
        categoryId: clothing.id
      },
      {
        title: 'Running Shoes',
        slug: 'running-shoes',
        description: 'Professional running shoes for athletes',
        price: 129.99,
        imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400',
        categoryId: sports.id
      },
      {
        title: 'Garden Plant Pot',
        slug: 'garden-plant-pot',
        description: 'Beautiful ceramic plant pot for your garden',
        price: 34.99,
        imageUrl: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400',
        categoryId: homeGarden.id
      },
      {
        title: 'Programming Book',
        slug: 'programming-book',
        description: 'Learn modern web development techniques',
        price: 49.99,
        imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400',
        categoryId: books.id
      }
    ];
    
    for (const product of products) {
      try {
        await prisma.product.upsert({
          where: { slug: product.slug },
          update: {},
          create: product
        });
        console.log(`✓ Product created: ${product.title}`);
      } catch (error) {
        console.log(`Product ${product.title} already exists`);
      }
    }
    
    console.log('\n✅ Database seeding completed!');
    
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedDatabase(); 