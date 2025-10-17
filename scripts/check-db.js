const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('Checking database contents...\n');
    
    // Check categories
    const categories = await prisma.category.findMany();
    console.log(`Categories found: ${categories.length}`);
    categories.forEach(cat => {
      console.log(`- ${cat.name} (${cat.slug})`);
    });
    
    console.log('\n');
    
    // Check products
    const products = await prisma.product.findMany({
      include: { category: true }
    });
    console.log(`Products found: ${products.length}`);
    products.forEach(product => {
      console.log(`- ${product.title} (${product.price}) - Category: ${product.category?.name || 'No category'}`);
    });
    
  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase(); 