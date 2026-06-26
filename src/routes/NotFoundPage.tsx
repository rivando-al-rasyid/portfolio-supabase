import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { SEO } from '../features/seo/SEO';

export function NotFoundPage() {
  return (
    <>
      <SEO title="Page not found" description="The requested page does not exist." />
      <section className="mx-auto flex min-h-[70vh] max-w-3xl flex-col justify-center px-4 py-16">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">404</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">Page not found</h1>
        <p className="mt-4 text-muted-foreground">The page may have been moved, deleted, or typed incorrectly.</p>
        <Button asChild className="mt-8 w-fit" variant="outline">
          <Link to="/">Back home</Link>
        </Button>
      </section>
    </>
  );
}
