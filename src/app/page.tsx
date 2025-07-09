import { getCurrentSession } from '@/actions/auth';
import { getAllCategories } from '@/actions/category';

import React from 'react';

const Home = async () => {
  const { user } = await getCurrentSession();

  const categories = await getAllCategories();

  return (
    <div>
      {/* {JSON.stringify(user)}
   
      {JSON.stringify(categories)} */}
      <p>Hello</p>
    </div>
  );
};

export default Home;
