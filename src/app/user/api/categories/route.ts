import { getAllCategories } from '@/actions/category';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const categories = await getAllCategories();
    return NextResponse.json(categories, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 