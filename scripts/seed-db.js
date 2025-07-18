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

    // Debug: Print category objects to ensure IDs are valid
    console.log('Category IDs:', {
      electronics,
      clothing,
      homeGarden,
      sports,
      books
    });
    
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
      },
      // --- 20 new random products below ---
      {
        title: '4K Ultra HD TV',
        slug: '4k-ultra-hd-tv',
        description: 'Stunning 4K resolution smart TV with HDR support',
        price: 599.99,
        imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400',
        categoryId: electronics.id
      },
      {
        title: 'Wireless Mouse',
        slug: 'wireless-mouse',
        description: 'Ergonomic wireless mouse with long battery life',
        price: 29.99,
        imageUrl: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400',
        categoryId: electronics.id
      },
      {
        title: 'Yoga Mat',
        slug: 'yoga-mat',
        description: 'Non-slip yoga mat for all types of exercise',
        price: 39.99,
        imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400',
        categoryId: sports.id
      },
      {
        title: 'Stainless Steel Water Bottle',
        slug: 'stainless-steel-water-bottle',
        description: 'Keeps your drinks cold for 24 hours',
        price: 17.99,
        imageUrl: 'https://images.unsplash.com/photo-1503602642458-232111445657?w=400',
        categoryId: sports.id
      },
      {
        title: 'Leather Wallet',
        slug: 'leather-wallet',
        description: 'Premium leather wallet with RFID protection',
        price: 44.99,
        imageUrl: 'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?w=400',
        categoryId: clothing.id
      },
      {
        title: 'Cookware Set',
        slug: 'cookware-set',
        description: '10-piece nonstick cookware set for your kitchen',
        price: 89.99,
        imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400',
        categoryId: homeGarden.id
      },
      {
        title: 'Desk Lamp',
        slug: 'desk-lamp',
        description: 'LED desk lamp with adjustable brightness',
        price: 25.99,
        imageUrl: 'https://images.unsplash.com/photo-1503602642458-232111445657?w=400',
        categoryId: homeGarden.id
      },
      {
        title: 'Mystery Novel',
        slug: 'mystery-novel',
        description: 'A thrilling mystery novel that keeps you guessing',
        price: 14.99,
        imageUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400',
        categoryId: books.id
      },
      {
        title: 'Children’s Storybook',
        slug: 'childrens-storybook',
        description: 'Colorful storybook for young readers',
        price: 12.99,
        imageUrl: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=400',
        categoryId: books.id
      },
      {
        title: 'Bluetooth Speaker',
        slug: 'bluetooth-speaker',
        description: 'Portable speaker with deep bass and long battery life',
        price: 59.99,
        imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400',
        categoryId: electronics.id
      },
      {
        title: 'Men’s Hoodie',
        slug: 'mens-hoodie',
        description: 'Warm and stylish hoodie for men',
        price: 39.99,
        imageUrl: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=400',
        categoryId: clothing.id
      },
      {
        title: 'Women’s Jeans',
        slug: 'womens-jeans',
        description: 'Classic fit jeans for women',
        price: 49.99,
        imageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400',
        categoryId: clothing.id
      },
      {
        title: 'Table Lamp',
        slug: 'table-lamp',
        description: 'Modern table lamp for your living room',
        price: 32.99,
        imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400',
        categoryId: homeGarden.id
      },
      {
        title: 'Basketball',
        slug: 'basketball',
        description: 'Official size basketball for indoor and outdoor play',
        price: 27.99,
        imageUrl: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400',
        categoryId: sports.id
      },
      {
        title: 'Cookbook',
        slug: 'cookbook',
        description: 'Delicious recipes from around the world',
        price: 22.99,
        imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400',
        categoryId: books.id
      },
      {
        title: 'Fitness Tracker',
        slug: 'fitness-tracker',
        description: 'Track your steps, heart rate, and sleep',
        price: 79.99,
        imageUrl: 'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?w=400',
        categoryId: electronics.id
      },
      {
        title: 'Scented Candle',
        slug: 'scented-candle',
        description: 'Relaxing scented candle for your home',
        price: 15.99,
        imageUrl: 'https://images.unsplash.com/photo-1504196606672-aef5c9cefc92?w=400',
        categoryId: homeGarden.id
      },
      {
        title: 'Soccer Ball',
        slug: 'soccer-ball',
        description: 'Durable soccer ball for all weather conditions',
        price: 21.99,
        imageUrl: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400',
        categoryId: sports.id
      },
      {
        title: 'Women’s Scarf',
        slug: 'womens-scarf',
        description: 'Elegant scarf for all seasons',
        price: 18.99,
        imageUrl: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=400',
        categoryId: clothing.id
      },
      {
        title: 'Laptop Backpack',
        slug: 'laptop-backpack',
        description: 'Spacious backpack with laptop compartment',
        price: 54.99,
        imageUrl: 'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?w=400',
        categoryId: clothing.id
      },
      {
        title: 'Fiction Bestseller',
        slug: 'fiction-bestseller',
        description: 'A must-read fiction bestseller',
        price: 16.99,
        imageUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400',
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