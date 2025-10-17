import React from 'react';

const HeaderSearchBar = () => {
    return (
        <form action='/user/search'>
           <div className='relative flex items-center'>
                <div className='absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none'>
                    <svg xmlns='http://www.w3.org/2000/svg' className='h-4 w-4 text-gray-400' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' />
                    </svg>
                </div>
                <input
                  type="text"
                  name="query"
                  placeholder="Search..."
                  className="pl-8 pr-2 py-1 w-40 sm:w-64 md:w-96 lg:w-[15rem] text-sm border border-gray-200 rounded-md focus:ring-1 focus:ring-black focus:border-transparent transition-colors"
                />

                <button type='submit' className='ml-2 px-2 py-1 text-sm bg-black text-white rounded-md hover:bg-gray-800 transition-colors'>
                  Search
                </button>
            </div>
        </form>
    );
};

export default HeaderSearchBar;