import { getCurrentSession } from '@/actions/auth'
import { getAllCategories } from '@/actions/category';
import { getAllProducts } from '@/sanity/lib/client';
import React from 'react'

const Home = async () => {
  
  // Get current logged-in user
  const { user } = await getCurrentSession();
const products = await getAllProducts();
const categories = await getAllCategories();
  return (
    <div>
      {JSON.stringify(user)}
      {/* {JSON.stringify(products)} */}
      {JSON.stringify(categories)}
    </div>
  )
}

export default Home
