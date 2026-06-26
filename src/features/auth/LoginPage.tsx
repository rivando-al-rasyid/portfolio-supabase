import { Form, useActionData, useNavigation } from 'react-router-dom';
import { LockKeyhole } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { isSupabaseConfigured } from '../../lib/supabase';
import type { LoginActionData } from '../../routes/actions/authActions';
import { SEO } from '../seo/SEO';

export function LoginPage() {
  const actionData = useActionData() as LoginActionData | undefined;
  const navigation = useNavigation();
  const loading = navigation.state === 'submitting';
  const error = actionData?.error;

  return (
    <>
      <SEO title="Admin Login" description="Login to manage the portfolio knowledge graph." path="/login" />
      <section className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-12">
        <Card className="w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <LockKeyhole className="h-6 w-6" />
            </div>
            <CardTitle>Admin login</CardTitle>
            <CardDescription>Use the admin account created in Supabase Auth.</CardDescription>
          </CardHeader>
          <CardContent>
            {!isSupabaseConfigured ? (
              <Alert className="mb-4 border-destructive/30 bg-destructive/10">
                <AlertTitle>Supabase env is missing</AlertTitle>
                <AlertDescription>Fill VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.</AlertDescription>
              </Alert>
            ) : null}

            {error ? (
              <Alert className="mb-4 border-destructive/30 bg-destructive/10">
                <AlertTitle>Cannot login</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <Form method="post" className="space-y-4" replace>
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <Input id="email" name="email" type="email" autoComplete="email" required />
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <Input id="password" name="password" type="password" autoComplete="current-password" required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing in...' : 'Login'}
              </Button>
            </Form>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
