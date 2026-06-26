import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Badge } from './ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { formatDate, truncateText } from '../lib/utils';
import type { BlogPost, Project } from '../types/content';

interface ContentCardProps {
  item: BlogPost | Project;
  type: 'blog' | 'project';
}

export function ContentCard({ item, type }: ContentCardProps) {
  const description = 'excerpt' in item ? item.excerpt : item.summary;
  const imageUrl = 'cover_image' in item ? item.cover_image : item.image_url;
  const href = type === 'blog' ? `/blog/${item.slug}` : `/projects/${item.slug}`;

  return (
    <Card className="group flex h-full flex-col overflow-hidden transition hover:-translate-y-1 hover:shadow-lg">
      {imageUrl ? (
        <Link href={href} className="block overflow-hidden border-b bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt={item.title} loading="lazy" className="h-48 w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
        </Link>
      ) : null}
      <CardHeader>
        <div className="mb-3 flex items-center justify-between gap-2">
          <Badge variant={type === 'blog' ? 'default' : 'secondary'}>{type}</Badge>
          <span className="text-xs text-muted-foreground">{formatDate('published_at' in item ? item.published_at : item.updated_at)}</span>
        </div>
        <CardTitle className="text-xl leading-tight">
          <Link href={href} className="hover:underline">
            {item.title}
          </Link>
        </CardTitle>
        <CardDescription>{truncateText(description, 140)}</CardDescription>
      </CardHeader>
      <CardContent className="mt-auto">
        <div className="mb-5 flex flex-wrap gap-2">
          {item.categories?.slice(0, 3).map((category) => (
            <Badge key={category.id} variant="outline">
              {category.name}
            </Badge>
          ))}
        </div>
        <Link href={href} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          Read more <ArrowUpRight className="h-4 w-4" />
        </Link>
      </CardContent>
    </Card>
  );
}
