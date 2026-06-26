import { redirect, type LoaderFunctionArgs } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { getSafeRedirectPath } from '../routeUtils';

export async function loginLoader({ request }: LoaderFunctionArgs) {
  const { data } = await supabase.auth.getSession();

  if (data.session) {
    throw redirect(getSafeRedirectPath(request));
  }

  return null;
}

export async function adminLoader({ request }: LoaderFunctionArgs) {
  const { data } = await supabase.auth.getSession();

  if (!data.session) {
    const url = new URL(request.url);
    throw redirect(`/login?from=${encodeURIComponent(url.pathname)}`);
  }

  return { user: data.session.user };
}
