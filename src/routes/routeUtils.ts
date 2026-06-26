export function getSafeRedirectPath(request: Request) {
  const url = new URL(request.url);
  const from = url.searchParams.get('from');

  if (!from || !from.startsWith('/') || from.startsWith('//')) {
    return '/admin';
  }

  return from;
}
