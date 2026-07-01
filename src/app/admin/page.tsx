import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AdminPage } from '../../features/admin/AdminPage';
import { createClient } from '../../utils/supabase/server';

export const metadata: Metadata = {
  title: 'CMS Dashboard',
  description: 'Manage portfolio content.'
};

export default async function Page() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect('/login');
  }

  return <AdminPage />;
}
