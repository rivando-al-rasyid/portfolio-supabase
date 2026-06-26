import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AdminPage } from '../../features/admin/AdminPage';
import { createClient } from '../../utils/supabase/server';

export const metadata: Metadata = {
  title: 'CMS Dashboard',
  description: 'Manage portfolio content.'
};

export default async function Page() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return <AdminPage />;
}
