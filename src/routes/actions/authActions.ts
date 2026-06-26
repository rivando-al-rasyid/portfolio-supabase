import { redirect, type ActionFunctionArgs } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { getSafeRedirectPath } from '../routeUtils';

export interface LoginActionData {
  error?: string;
}

export async function loginAction({ request }: ActionFunctionArgs): Promise<Response | LoginActionData> {
  const formData = await request.formData();
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message || 'Login failed. Check your email and password.' };
  }

  throw redirect(getSafeRedirectPath(request));
}
