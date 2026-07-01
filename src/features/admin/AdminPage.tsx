'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock3, ExternalLink, Loader2, LogOut, RefreshCw } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { getQueueShareItems } from '../../lib/contentService';
import { formatDate } from '../../lib/utils';
import { useAuth } from '../auth/AuthProvider';
import type { QueueShareItem } from '../../types/content';

function contentHref(item: QueueShareItem) {
  if (!item.slug) return '';
  return item.content_type === 'blog' ? `/blog/${item.slug}` : `/projects/${item.slug}`;
}

function QueueRow({ item }: { item: QueueShareItem }) {
  const href = contentHref(item);

  return (
    <div className="grid gap-4 border-b px-4 py-4 last:border-b-0 md:grid-cols-[1fr_0.7fr_0.7fr_0.45fr] md:items-center">
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-medium leading-snug">{item.title ?? 'Deleted content'}</h3>
          <Badge variant="outline">{item.content_type === 'blog' ? 'Blog post' : 'Project'}</Badge>
          {item.is_posted ? (
            <Badge variant="secondary" className="gap-1">
              <CheckCircle2 className="h-3 w-3" /> Posted
            </Badge>
          ) : (
            <Badge className="gap-1">
              <Clock3 className="h-3 w-3" /> Waiting
            </Badge>
          )}
        </div>
        <p className="break-all text-xs text-muted-foreground">queue_share.id: {item.id}</p>
        <p className="break-all text-xs text-muted-foreground">
          {item.content_type === 'blog' ? 'blog_post_id' : 'project_id'}: {item.content_id}
        </p>
      </div>

      <div className="text-sm text-muted-foreground">
        <span className="md:hidden">Created: </span>
        {formatDate(item.created_at)}
      </div>

      <div className="text-sm text-muted-foreground">
        <span className="md:hidden">Status: </span>
        {item.status ?? 'unknown'}
      </div>

      <div className="flex md:justify-end">
        {href ? (
          <Button asChild size="sm" variant="outline">
            <Link href={href}>
              Open <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function AdminPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: queueItems = [], isFetching } = useQuery<QueueShareItem[]>({
    queryKey: ['admin', 'queue-share'],
    queryFn: getQueueShareItems
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, router, user]);

  async function handleLogout() {
    await signOut();
    router.push('/login');
  }

  const waitingItems = queueItems.filter((item) => !item.is_posted);
  const postedItems = queueItems.filter((item) => item.is_posted);

  if (authLoading) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-10">
        <Card>
          <CardContent className="flex items-center gap-2 pt-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading admin session...
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">Admin CMS</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight">queue_share</h1>
          <p className="mt-2 text-muted-foreground">Logged in as {user?.email}</p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['admin', 'queue-share'] })}
            disabled={isFetching}
          >
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
          <Button type="button" variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4" /> Logout
          </Button>
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{queueItems.length}</CardTitle>
            <CardDescription>Total rows</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{waitingItems.length}</CardTitle>
            <CardDescription>Waiting</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{postedItems.length}</CardTitle>
            <CardDescription>Posted</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Queue rows</CardTitle>
          <CardDescription>
            This page only reads from queue_share. Each row links to either a blog post or a project and uses is_posted to track posting state.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isFetching ? <p className="text-sm text-muted-foreground">Loading queue_share...</p> : null}
          {!isFetching && queueItems.length === 0 ? <p className="text-sm text-muted-foreground">No queue_share rows yet.</p> : null}
          {queueItems.length > 0 ? (
            <div className="overflow-hidden rounded-lg border">
              <div className="hidden border-b bg-muted/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:grid md:grid-cols-[1fr_0.7fr_0.7fr_0.45fr]">
                <span>Content</span>
                <span>Created</span>
                <span>Status</span>
                <span className="text-right">Link</span>
              </div>
              {queueItems.map((item) => (
                <QueueRow key={item.id} item={item} />
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
