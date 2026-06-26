import Link from 'next/link';
import { Button } from '../components/ui/button';

export default function NotFound() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-20">
      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">404</p>
      <h1 className="mt-3 text-4xl font-bold">Page not found</h1>
      <p className="mt-3 text-muted-foreground">The page you opened does not exist or has been moved.</p>
      <Button asChild className="mt-6">
        <Link href="/">Back home</Link>
      </Button>
    </section>
  );
}
