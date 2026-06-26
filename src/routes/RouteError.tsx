import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom';
import { Button } from '../components/ui/button';

export function RouteError() {
  const error = useRouteError();
  const title = isRouteErrorResponse(error) ? `${error.status} ${error.statusText}` : 'Unexpected application error';
  const message = error instanceof Error ? error.message : isRouteErrorResponse(error) ? error.data : 'Something went wrong while loading this route.';

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-4 py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">Route error</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">{title}</h1>
      {message ? <p className="mt-4 text-muted-foreground">{String(message)}</p> : null}
      <Button asChild className="mt-8 w-fit" variant="outline">
        <Link to="/">Back home</Link>
      </Button>
    </main>
  );
}
