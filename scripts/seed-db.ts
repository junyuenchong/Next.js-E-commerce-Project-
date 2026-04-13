import { PrismaClient } from "@prisma/client";
import { encodeHexLowerCase } from "@oslojs/encoding";
import { sha256 } from "@oslojs/crypto/sha2";
import { resolveDatabaseUrlForPrisma } from "../src/backend/shared/db/resolve-database-url";
import { seedAdminPermissionData } from "./lib/seed-admin-rbac";

const dbUrl = resolveDatabaseUrlForPrisma();
const prisma = new PrismaClient({
  ...(dbUrl ? { datasources: { db: { url: dbUrl } } } : {}),
});

/**
 * Super admin (`UserRole.SUPER_ADMIN`) is intentionally **not** creatable from the admin UI or
 * user APIs — only this seed (or a migration / SQL) should set that role.
 */

/** Same algorithm as `hashPasswordUserService` (credentials login). */
function hashPasswordForSeed(password: string): string {
  return encodeHexLowerCase(sha256(new TextEncoder().encode(password)));
}

/** Inventory for demo / checkout (PayPal validates stock vs cart quantity). */
const DEFAULT_PRODUCT_STOCK = 100;

const categories = [
  { name: "Electronics", slug: "electronics" },
  { name: "Clothing", slug: "clothing" },
  { name: "Home & Garden", slug: "home-garden" },
  { name: "Sports", slug: "sports" },
  { name: "Books", slug: "books" },
];

async function getCategoryId(slug: string): Promise<number> {
  const category = await prisma.category.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!category) {
    throw new Error(`Category "${slug}" was not found after upsert.`);
  }
  return category.id;
}

async function seedDatabase() {
  try {
    console.log("Seeding database with sample data...\n");

    await seedAdminPermissionData(prisma);

    for (const category of categories) {
      await prisma.category.upsert({
        where: { slug: category.slug },
        update: {},
        create: { ...category, isActive: true },
      });
      console.log(`Category ready: ${category.name}`);
    }

    const electronicsId = await getCategoryId("electronics");
    const clothingId = await getCategoryId("clothing");
    const homeGardenId = await getCategoryId("home-garden");
    const sportsId = await getCategoryId("sports");
    const booksId = await getCategoryId("books");

    const products = [
      {
        title: "Wireless Bluetooth Headphones",
        slug: "wireless-bluetooth-headphones",
        description: "High-quality wireless headphones with noise cancellation",
        price: 89.99,
        imageUrl:
          "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400",
        categoryId: electronicsId,
      },
      {
        title: "Smartphone Case",
        slug: "smartphone-case",
        description: "Durable protective case for your smartphone",
        price: 19.99,
        imageUrl:
          "https://images.unsplash.com/photo-1603314585442-ee3b3c16fbcf?w=400",
        categoryId: electronicsId,
      },
      {
        title: "Cotton T-Shirt",
        slug: "cotton-tshirt",
        description: "Comfortable 100% cotton t-shirt",
        price: 24.99,
        imageUrl:
          "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400",
        categoryId: clothingId,
      },
      {
        title: "Running Shoes",
        slug: "running-shoes",
        description: "Professional running shoes for athletes",
        price: 129.99,
        imageUrl:
          "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400",
        categoryId: sportsId,
      },
      {
        title: "Garden Plant Pot",
        slug: "garden-plant-pot",
        description: "Beautiful ceramic plant pot for your garden",
        price: 34.99,
        imageUrl:
          "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400",
        categoryId: homeGardenId,
      },
      {
        title: "Programming Book",
        slug: "programming-book",
        description: "Learn modern web development techniques",
        price: 49.99,
        imageUrl:
          "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400",
        categoryId: booksId,
      },
      {
        title: "4K Ultra HD TV",
        slug: "4k-ultra-hd-tv",
        description: "Stunning 4K resolution smart TV with HDR support",
        price: 599.99,
        imageUrl:
          "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400",
        categoryId: electronicsId,
      },
      {
        title: "Wireless Mouse",
        slug: "wireless-mouse",
        description: "Ergonomic wireless mouse with long battery life",
        price: 29.99,
        imageUrl:
          "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400",
        categoryId: electronicsId,
      },
      {
        title: "Yoga Mat",
        slug: "yoga-mat",
        description: "Non-slip yoga mat for all types of exercise",
        price: 39.99,
        imageUrl:
          "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400",
        categoryId: sportsId,
      },
      {
        title: "Stainless Steel Water Bottle",
        slug: "stainless-steel-water-bottle",
        description: "Keeps your drinks cold for 24 hours",
        price: 17.99,
        imageUrl:
          "https://images.unsplash.com/photo-1503602642458-232111445657?w=400",
        categoryId: sportsId,
      },
      {
        title: "Leather Wallet",
        slug: "leather-wallet",
        description: "Premium leather wallet with RFID protection",
        price: 44.99,
        imageUrl:
          "https://images.unsplash.com/photo-1519125323398-675f0ddb6308?w=400",
        categoryId: clothingId,
      },
      {
        title: "Cookware Set",
        slug: "cookware-set",
        description: "10-piece nonstick cookware set for your kitchen",
        price: 89.99,
        imageUrl:
          "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400",
        categoryId: homeGardenId,
      },
      {
        title: "Desk Lamp",
        slug: "desk-lamp",
        description: "LED desk lamp with adjustable brightness",
        price: 25.99,
        imageUrl:
          "https://images.unsplash.com/photo-1503602642458-232111445657?w=400",
        categoryId: homeGardenId,
      },
      {
        title: "Mystery Novel",
        slug: "mystery-novel",
        description: "A thrilling mystery novel that keeps you guessing",
        price: 14.99,
        imageUrl:
          "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400",
        categoryId: booksId,
      },
      {
        title: "Children's Storybook",
        slug: "childrens-storybook",
        description: "Colorful storybook for young readers",
        price: 12.99,
        imageUrl:
          "https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=400",
        categoryId: booksId,
      },
    ];

    for (const product of products) {
      await prisma.product.upsert({
        where: { slug: product.slug },
        update: {
          title: product.title,
          description: product.description,
          price: product.price,
          imageUrl: product.imageUrl,
          categoryId: product.categoryId,
          stock: DEFAULT_PRODUCT_STOCK,
          isActive: true,
        },
        create: { ...product, stock: DEFAULT_PRODUCT_STOCK, isActive: true },
      });
      console.log(
        `Product ready: ${product.title} (stock ${DEFAULT_PRODUCT_STOCK})`,
      );
    }

    const adminEmail = process.env.ADMIN_SEED_EMAIL?.trim();
    const adminPassRaw = process.env.ADMIN_SEED_PASSWORD;
    const adminPassword =
      typeof adminPassRaw === "string" ? adminPassRaw.trim() : "";
    if (adminEmail && adminPassword.length > 0) {
      const passwordHash = hashPasswordForSeed(adminPassword);
      await prisma.user.upsert({
        where: { email: adminEmail },
        update: {
          passwordHash,
          role: "SUPER_ADMIN",
          adminPermissionRoleId: null,
          isActive: true,
        },
        create: {
          email: adminEmail,
          passwordHash,
          role: "SUPER_ADMIN",
          adminPermissionRoleId: null,
          isActive: true,
        },
      });
      console.log(
        `\nSuper admin user ready: ${adminEmail} (sign in with email + password at /modules/user/auth/sign-in)`,
      );
    } else {
      console.log(
        "\nSkipping admin user: set ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD in .env, then run db:seed again.",
      );
    }

    console.log("\nDatabase seeding completed.");
  } catch (error: unknown) {
    console.error(
      "Error seeding database:",
      error instanceof Error ? error.message : String(error),
    );
  } finally {
    await prisma.$disconnect();
  }
}

void seedDatabase();
