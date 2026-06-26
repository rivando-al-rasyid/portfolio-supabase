import type { Metadata } from 'next';
import { LoginPage } from '../../features/auth/LoginPage';

export const metadata: Metadata = {
  title: 'Admin Login',
  description: 'Login to manage the portfolio knowledge graph.'
};

export default function Page() {
  return <LoginPage />;
}
