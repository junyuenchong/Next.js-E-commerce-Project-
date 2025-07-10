import { redirect } from 'next/navigation';

export default function RootRedirect() {
  // First Page
  redirect('/admin/categories'); 
}
