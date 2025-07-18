import { getCart, addToCart, removeFromCart, updateCartItem, clearCart } from '@/actions/cart-actions';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import type { Product } from '@prisma/client';

// --- Type Definitions ---
type CartItem = {
  productId: number;
  quantity: number;
};

type Cart = {
  id: string;
  items: CartItem[];
};

type CartItemWithLiveProduct = CartItem & {
  liveProduct: Product | null;
};

// --- GET: Fetch the cart with live product data ---
export async function GET() {
  try {
    const cart = await getCart() as Cart | null;

    if (!cart || !Array.isArray(cart.items)) {
      return NextResponse.json(null, { status: 200 });
    }

    const productIds = cart.items.map((item) => item.productId);

    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    const itemsWithLiveProduct: CartItemWithLiveProduct[] = cart.items.map((item) => ({
      ...item,
      liveProduct: products.find((p) => p.id === item.productId) || null,
    }));

    return NextResponse.json(
      { ...cart, items: itemsWithLiveProduct },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('GET cart error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// --- POST: Handle cart actions ---
export async function POST(req: Request) {
  try {
    const { action, productId, quantity } = await req.json() as {
      action: 'add' | 'remove' | 'update' | 'clear';
      productId?: number;
      quantity?: number;
    };

    let cart: Cart | null = null;

    switch (action) {
      case 'add':
        if (typeof productId !== 'number') {
          return NextResponse.json({ error: 'Missing productId' }, { status: 400 });
        }
        cart = await addToCart(productId, quantity || 1);
        break;

      case 'remove':
        if (typeof productId !== 'number') {
          return NextResponse.json({ error: 'Missing productId' }, { status: 400 });
        }
        cart = await removeFromCart(productId);
        break;

      case 'update':
        if (typeof productId !== 'number') {
          return NextResponse.json({ error: 'Missing productId' }, { status: 400 });
        }
        cart = await updateCartItem(productId, quantity || 1);
        break;

      case 'clear':
        cart = await clearCart();
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Emit WebSocket event
    const io = (global as unknown as { io?: { to: (room: string) => { emit: (event: string) => void } } }).io;
    if (io && cart?.id) {
      io.to(`cart:${cart.id}`).emit('cart_updated');
      console.log(`🔔 Emitted cart_updated event to cart:${cart.id}`);
    }

    return NextResponse.json(cart, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('POST cart error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
