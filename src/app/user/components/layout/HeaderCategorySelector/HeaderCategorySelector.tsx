"use client";

import React, { useEffect, useRef, useState } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';
import { useSocket } from '@/lib/socket/SocketContext';
import { useRouter } from 'next/navigation';

// Add fetcher for SWR
const fetcher = (url: string) => fetch(url).then(res => res.json());

const HeaderCategorySelector = () => {
  const { isConnected, socket, socketError } = useSocket();
  
  const { data: categories } = useSWR('/user/api/categories', fetcher);

  // Dropdown open state
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Listen for real-time category updates
  useEffect(() => {
    if (!socket || !socket.connected) return;
    socket.emit('join', 'categories');
    const handleCategoriesUpdate = () => {
      globalMutate((key) => typeof key === 'string' && key.includes('/categories'));
    };
    socket.on('categories_updated', handleCategoriesUpdate);
    return () => {
      socket.off('categories_updated', handleCategoriesUpdate);
    };
  }, [socket, socket?.connected]);

  // Log categories for debugging
  useEffect(() => {
    if (categories && categories.length > 0) {
      console.log('HeaderCategorySelector categories:', categories);
    }
  }, [categories]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className='relative inline-block' ref={dropdownRef}>
      <button
        className='text-gray-700 hover:text-gray-900 text-sm font-medium flex items-center gap-1'
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        Categories
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
          strokeLinecap="round" 
          strokeLinejoin="round"
          className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </button>
      {open && (
        <div className='absolute top-full left-0 pt-2 z-50'>
          <div className='w-64 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden'>
            <div className='py-2'>
              {categories.length === 0 ? (
                <div className='px-4 py-3 text-sm text-gray-500'>No categories available</div>
              ) : (
                categories.map((category: { id: number; slug: string; name: string }) => (
                  <button
                    key={category.id}
                    className='block w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors duration-100'
                    onClick={() => {
                      setOpen(false);
                      router.push(`/user/category/${category.slug}`);
                      router.refresh();
                    }}
                  >
                    {category.name} <span className="text-xs text-gray-400">[{category.slug}]</span>
                  </button>
                ))
              )}
              {!isConnected && (
                <div className='px-4 py-2 text-xs text-yellow-600 border-t border-gray-100'>
                  {socketError ? `Connection error: ${socketError}` : 'Real-time updates disabled'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HeaderCategorySelector;
