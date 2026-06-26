import type { Metadata } from 'next';
import { AdminPage } from '../../features/admin/AdminPage';

export const metadata: Metadata = {
  title: 'CMS Dashboard',
  description: 'Manage portfolio content.'
};

export default function Page() {
  return <AdminPage />;
}
