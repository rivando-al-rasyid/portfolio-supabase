import { ChangeEvent, FormEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ImageIcon, Loader2, LogOut, Pencil, Plus, RefreshCw, Save, Settings, Trash2, Upload } from 'lucide-react';
import { CmsRichTextEditor } from '../../components/CmsRichTextEditor';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { Separator } from '../../components/ui/separator';
import { Textarea } from '../../components/ui/textarea';
import {
  createBlogPost,
  createProject,
  createTopic,
  deleteBlogPost,
  deleteProject,
  deleteTopic,
  enqueueShareJobs,
  getAllBlogPosts,
  getAllProjects,
  getShareSettings,
  getSiteSettings,
  getTopics,
  replaceBlogPostTopics,
  replaceProjectTopics,
  updateBlogPost,
  updateProject,
  updateShareSettings,
  updateSiteSettings,
  updateTopic
} from '../../lib/contentService';
import { formatBytes } from '../../lib/imageCompression';
import { compressAndUploadImage } from '../../lib/mediaService';
import { generateSeoDescription, generateSeoTitle, getCanonicalUrl, makeUniqueSlug, toSlug, truncateText } from '../../lib/utils';
import { useAuth } from '../auth/AuthProvider';
import { SEO } from '../seo/SEO';
import type { BlogPost, EntityType, Project, SharePlatform, SiteSettings, Topic } from '../../types/content';

type EditableType = Extract<EntityType, 'blog' | 'project' | 'topic'>;
type Tab = 'content' | 'site' | 'settings';

interface EditorState {
  id: string;
  type: EditableType;
  title: string;
  slug: string;
  description: string;
  content: string;
  status: 'draft' | 'published';
  isFeatured: boolean;
  sortOrder: number;
  imageUrl: string;
  demoUrl: string;
  repoUrl: string;
  metaTitle: string;
  metaDescription: string;
  topicIds: string[];
}

const emptyEditor: EditorState = {
  id: '',
  type: 'blog',
  title: '',
  slug: '',
  description: '',
  content: '',
  status: 'draft',
  isFeatured: false,
  sortOrder: 100,
  imageUrl: '',
  demoUrl: '',
  repoUrl: '',
  metaTitle: '',
  metaDescription: '',
  topicIds: []
};

const platforms: SharePlatform[] = ['linkedin', 'x', 'facebook', 'whatsapp', 'telegram', 'email'];

function editorFromItem(type: EditableType, item: BlogPost | Project | Topic): EditorState {
  if (type === 'topic') {
    const topic = item as Topic;
    return {
      ...emptyEditor,
      id: topic.id,
      type,
      title: topic.name,
      slug: topic.slug,
      description: topic.description ?? '',
      content: topic.aliases?.join(', ') ?? '',
      topicIds: []
    };
  }

  if (type === 'blog') {
    const post = item as BlogPost;
    return {
      ...emptyEditor,
      id: post.id,
      type,
      title: post.title,
      slug: post.slug,
      description: post.excerpt ?? '',
      content: post.content,
      status: post.status,
      isFeatured: post.is_featured ?? false,
      sortOrder: post.sort_order ?? 100,
      imageUrl: post.cover_image ?? '',
      metaTitle: post.meta_title ?? '',
      metaDescription: post.meta_description ?? '',
      topicIds: post.topics?.map((topic) => topic.id) ?? []
    };
  }

  const project = item as Project;
  return {
    ...emptyEditor,
    id: project.id,
    type,
    title: project.title,
    slug: project.slug,
    description: project.summary ?? '',
    content: project.content,
    status: project.status,
    isFeatured: project.is_featured ?? false,
    sortOrder: project.sort_order ?? 100,
    imageUrl: project.image_url ?? '',
    demoUrl: project.demo_url ?? '',
    repoUrl: project.repo_url ?? '',
    metaTitle: project.meta_title ?? '',
    metaDescription: project.meta_description ?? '',
    topicIds: project.topics?.map((topic) => topic.id) ?? []
  };
}

function ContentList({
  title,
  items,
  type,
  onEdit,
  onDelete
}: {
  title: string;
  items: Array<BlogPost | Project | Topic>;
  type: EditableType;
  onEdit: (type: EditableType, item: BlogPost | Project | Topic) => void;
  onDelete: (type: EditableType, id: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{items.length} items</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? <p className="text-sm text-muted-foreground">No items yet.</p> : null}
        {items.map((item) => {
          const itemTitle = 'name' in item ? item.name : item.title;
          const itemDescription = 'description' in item ? item.description : 'excerpt' in item ? item.excerpt : item.summary;
          const status = 'status' in item ? item.status : 'published';
          const isFeatured = 'is_featured' in item ? item.is_featured : false;
          return (
            <div key={item.id} className="rounded-lg border p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium">{itemTitle}</h3>
                    <Badge variant={status === 'published' ? 'default' : 'outline'}>{status}</Badge>
                    {isFeatured ? <Badge variant="secondary">featured</Badge> : null}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">/{item.slug}</p>
                  {itemDescription ? <p className="mt-2 text-sm text-muted-foreground">{truncateText(itemDescription, 110)}</p> : null}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button type="button" size="icon" variant="ghost" onClick={() => onEdit(type, item)} aria-label="Edit">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button type="button" size="icon" variant="ghost" onClick={() => onDelete(type, item.id)} aria-label="Delete">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export function AdminPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('content');
  const [editor, setEditor] = useState<EditorState>(emptyEditor);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const { data: posts = [] } = useQuery({ queryKey: ['admin', 'blog-posts'], queryFn: getAllBlogPosts });
  const { data: projects = [] } = useQuery({ queryKey: ['admin', 'projects'], queryFn: getAllProjects });
  const { data: topics = [] } = useQuery({ queryKey: ['admin', 'topics'], queryFn: getTopics });
  const { data: shareSettings } = useQuery({ queryKey: ['admin', 'share-settings'], queryFn: getShareSettings });
  const { data: siteSettings } = useQuery({ queryKey: ['admin', 'site-settings'], queryFn: getSiteSettings });

  const saveMutation = useMutation({
    mutationFn: async (state: EditorState) => {
      const rawSlug = state.slug || state.title;
      const existingSlugs =
        state.type === 'blog'
          ? posts.filter((post) => post.id !== state.id).map((post) => post.slug)
          : state.type === 'project'
            ? projects.filter((project) => project.id !== state.id).map((project) => project.slug)
            : topics.filter((topic) => topic.id !== state.id).map((topic) => topic.slug);
      const slug = makeUniqueSlug(rawSlug, existingSlugs);
      if (!state.title.trim() || !slug.trim()) throw new Error('Title and slug are required.');

      if (state.type === 'topic') {
        const payload = {
          name: state.title.trim(),
          slug,
          description: state.description || null,
          aliases: state.content
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean)
        };
        return state.id ? updateTopic(state.id, payload) : createTopic(payload);
      }

      if (state.type === 'blog') {
        const payload = {
          title: state.title.trim(),
          slug,
          excerpt: state.description || null,
          content: state.content || '',
          cover_image: state.imageUrl || null,
          status: state.status,
          is_featured: state.isFeatured,
          sort_order: Number.isFinite(state.sortOrder) ? state.sortOrder : 100,
          meta_title: generateSeoTitle(state.title),
          meta_description: generateSeoDescription({ description: state.description, content: state.content }),
          published_at: state.status === 'published' ? new Date().toISOString() : null
        };
        const saved = state.id ? await updateBlogPost(state.id, payload) : await createBlogPost(payload);
        await replaceBlogPostTopics(saved.id, state.topicIds);
        if (!state.id && state.status === 'published' && shareSettings?.auto_share_on_publish) {
          await enqueueShareJobs({
            entityType: 'blog',
            entityId: saved.id,
            platforms: shareSettings.active_platforms,
            payload: {
              title: saved.title,
              description: generateSeoDescription({ description: saved.excerpt, content: saved.content }),
              url: getCanonicalUrl(`/blog/${saved.slug}`),
              type: 'blog'
            }
          });
        }
        return saved;
      }

      const payload = {
        title: state.title.trim(),
        slug,
        summary: state.description || null,
        content: state.content || '',
        image_url: state.imageUrl || null,
        demo_url: state.demoUrl || null,
        repo_url: state.repoUrl || null,
        status: state.status,
        is_featured: state.isFeatured,
        sort_order: Number.isFinite(state.sortOrder) ? state.sortOrder : 100,
        meta_title: generateSeoTitle(state.title),
        meta_description: generateSeoDescription({ description: state.description, content: state.content })
      };
      const saved = state.id ? await updateProject(state.id, payload) : await createProject(payload);
      await replaceProjectTopics(saved.id, state.topicIds);
      if (!state.id && state.status === 'published' && shareSettings?.auto_share_on_publish) {
        await enqueueShareJobs({
          entityType: 'project',
          entityId: saved.id,
          platforms: shareSettings.active_platforms,
          payload: {
            title: saved.title,
            description: generateSeoDescription({ description: saved.summary, content: saved.content }),
            url: getCanonicalUrl(`/projects/${saved.slug}`),
            type: 'project'
          }
        });
      }
      return saved;
    },
    onSuccess: async () => {
      setMessage('Saved successfully.');
      setError('');
      setEditor(emptyEditor);
      await queryClient.invalidateQueries();
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Save failed.');
      setMessage('');
    }
  });

  const imageUploadMutation = useMutation({
    mutationFn: async (file: File) => compressAndUploadImage(file, editor.type === 'blog' ? 'blog' : 'projects'),
    onSuccess: (result) => {
      setEditor((current) => ({ ...current, imageUrl: result.url }));
      setMessage(`Image compressed from ${formatBytes(result.originalBytes)} to ${formatBytes(result.compressedBytes)} and uploaded.`);
      setError('');
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Image upload failed. Check that the portfolio-media bucket exists.');
      setMessage('');
    }
  });

  const siteMutation = useMutation({
    mutationFn: updateSiteSettings,
    onSuccess: async () => {
      setMessage('Site CMS settings saved.');
      setError('');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'site-settings'] });
      await queryClient.invalidateQueries({ queryKey: ['site-settings'] });
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Cannot save site settings.');
      setMessage('');
    }
  });

  const settingsMutation = useMutation({
    mutationFn: updateShareSettings,
    onSuccess: async () => {
      setMessage('Share settings saved.');
      setError('');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'share-settings'] });
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Cannot save settings.')
  });

  const totalPublished = useMemo(
    () => posts.filter((post) => post.status === 'published').length + projects.filter((project) => project.status === 'published').length,
    [posts, projects]
  );

  const seoPreview = useMemo(
    () => ({
      title: generateSeoTitle(editor.title),
      description: generateSeoDescription({ description: editor.description, content: editor.content })
    }),
    [editor.title, editor.description, editor.content]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveMutation.mutate(editor);
  }

  function handleTypeChange(type: EditableType) {
    setEditor({ ...emptyEditor, type });
  }

  function handleEdit(type: EditableType, item: BlogPost | Project | Topic) {
    setEditor(editorFromItem(type, item));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleDelete(type: EditableType, id: string) {
    if (!confirm('Delete this item?')) return;
    try {
      if (type === 'blog') await deleteBlogPost(id);
      if (type === 'project') await deleteProject(id);
      if (type === 'topic') await deleteTopic(id);
      setMessage('Deleted successfully.');
      await queryClient.invalidateQueries();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.');
    }
  }

  async function handleLogout() {
    await signOut();
    navigate('/login', { replace: true });
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    imageUploadMutation.mutate(file);
  }

  function handleSiteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    siteMutation.mutate({
      site_name: String(formData.get('site_name') || ''),
      hero_badge: String(formData.get('hero_badge') || ''),
      hero_title: String(formData.get('hero_title') || ''),
      hero_description: String(formData.get('hero_description') || ''),
      primary_cta_label: String(formData.get('primary_cta_label') || ''),
      primary_cta_href: String(formData.get('primary_cta_href') || ''),
      secondary_cta_label: String(formData.get('secondary_cta_label') || ''),
      secondary_cta_href: String(formData.get('secondary_cta_href') || '')
    });
  }

  function toggleTopic(topicId: string) {
    setEditor((current) => ({
      ...current,
      topicIds: current.topicIds.includes(topicId)
        ? current.topicIds.filter((id) => id !== topicId)
        : [...current.topicIds, topicId]
    }));
  }

  function togglePlatform(platform: SharePlatform) {
    if (!shareSettings) return;
    const active = shareSettings.active_platforms.includes(platform);
    const nextPlatforms = active
      ? shareSettings.active_platforms.filter((item) => item !== platform)
      : [...shareSettings.active_platforms, platform];
    settingsMutation.mutate({
      auto_share_on_publish: shareSettings.auto_share_on_publish,
      active_platforms: nextPlatforms,
      default_message_template: shareSettings.default_message_template
    });
  }

  return (
    <>
      <SEO title="CMS Dashboard" description="Manage portfolio content." path="/admin" />
      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">Admin CMS</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">Dashboard</h1>
            <p className="mt-3 text-muted-foreground">Logged in as {user?.email}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant={tab === 'content' ? 'default' : 'outline'} onClick={() => setTab('content')}>
              <Plus className="h-4 w-4" /> Content
            </Button>
            <Button variant={tab === 'site' ? 'default' : 'outline'} onClick={() => setTab('site')}>
              <ImageIcon className="h-4 w-4" /> Site CMS
            </Button>
            <Button variant={tab === 'settings' ? 'default' : 'outline'} onClick={() => setTab('settings')}>
              <Settings className="h-4 w-4" /> Share settings
            </Button>
            <Button variant="secondary" onClick={handleLogout}>
              <LogOut className="h-4 w-4" /> Logout
            </Button>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <Card><CardHeader><CardTitle>{posts.length}</CardTitle><CardDescription>Blog posts</CardDescription></CardHeader></Card>
          <Card><CardHeader><CardTitle>{projects.length}</CardTitle><CardDescription>Projects</CardDescription></CardHeader></Card>
          <Card><CardHeader><CardTitle>{totalPublished}</CardTitle><CardDescription>Published items</CardDescription></CardHeader></Card>
        </div>

        {message ? (
          <Alert className="mb-6 border-emerald-500/30 bg-emerald-500/10">
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        ) : null}
        {error ? (
          <Alert className="mb-6 border-destructive/30 bg-destructive/10">
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {tab === 'content' ? (
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <Card>
              <CardHeader>
                <CardTitle>{editor.id ? 'Edit content' : 'Create content'}</CardTitle>
                <CardDescription>Manage blog posts, projects, topics, SEO, featured order, rich content embeds, and compressed images from one CMS form.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Type</label>
                      <Select value={editor.type} onChange={(event) => handleTypeChange(event.target.value as EditableType)} disabled={Boolean(editor.id)}>
                        <option value="blog">Blog</option>
                        <option value="project">Project</option>
                        <option value="topic">Topic</option>
                      </Select>
                    </div>
                    {editor.type !== 'topic' ? (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Status</label>
                        <Select value={editor.status} onChange={(event) => setEditor({ ...editor, status: event.target.value as 'draft' | 'published' })}>
                          <option value="draft">Draft</option>
                          <option value="published">Published</option>
                        </Select>
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Title / name</label>
                    <Input
                      value={editor.title}
                      onChange={(event) => {
                        const nextTitle = event.target.value;
                        const previousAutoSlug = toSlug(editor.title);
                        const shouldAutoUpdateSlug = !editor.slug || editor.slug === previousAutoSlug;
                        setEditor({ ...editor, title: nextTitle, slug: shouldAutoUpdateSlug ? toSlug(nextTitle) : editor.slug });
                      }}
                      placeholder="My article title"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-sm font-medium">Slug</label>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const existingSlugs =
                            editor.type === 'blog'
                              ? posts.filter((post) => post.id !== editor.id).map((post) => post.slug)
                              : editor.type === 'project'
                                ? projects.filter((project) => project.id !== editor.id).map((project) => project.slug)
                                : topics.filter((topic) => topic.id !== editor.id).map((topic) => topic.slug);
                          setEditor({ ...editor, slug: makeUniqueSlug(editor.title, existingSlugs) });
                        }}
                      >
                        <RefreshCw className="h-3.5 w-3.5" /> Regenerate
                      </Button>
                    </div>
                    <Input value={editor.slug} onChange={(event) => setEditor({ ...editor, slug: toSlug(event.target.value) })} placeholder="my-article-title" />
                    {editor.slug ? (
                      <p className="text-xs text-muted-foreground">
                        {editor.type === 'topic' ? 'Internal topic slug' : 'Public URL'}: /{editor.type === 'blog' ? 'blog/' : editor.type === 'project' ? 'projects/' : 'topics/'}{editor.slug}
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description {editor.type === 'topic' ? '' : '/ excerpt'}</label>
                    <Textarea value={editor.description} onChange={(event) => setEditor({ ...editor, description: event.target.value })} />
                  </div>
                  {editor.type === 'topic' ? (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Aliases, comma separated</label>
                      <Textarea className="min-h-32" value={editor.content} onChange={(event) => setEditor({ ...editor, content: event.target.value })} />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div>
                        <label className="text-sm font-medium">CMS content</label>
                        <p className="text-xs text-muted-foreground">
                          WordPress/Blogger-style input using Markdown and embeds. Use toolbar buttons for bold text, links, images, YouTube, and audio.
                        </p>
                      </div>
                      <CmsRichTextEditor
                        value={editor.content}
                        onChange={(content) => setEditor({ ...editor, content })}
                        uploadFolder={editor.type === 'blog' ? 'blog-content' : 'project-content'}
                        onMessage={(nextMessage) => {
                          setMessage(nextMessage);
                          setError('');
                        }}
                        onError={(nextError) => {
                          setError(nextError);
                          setMessage('');
                        }}
                      />
                    </div>
                  )}

                  {editor.type !== 'topic' ? (
                    <div className="grid gap-4 rounded-lg border p-3 sm:grid-cols-2">
                      <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                        <input
                          type="checkbox"
                          checked={editor.isFeatured}
                          onChange={(event) => setEditor({ ...editor, isFeatured: event.target.checked })}
                          className="h-4 w-4 accent-primary"
                        />
                        Show as featured
                      </label>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Sort order</label>
                        <Input
                          type="number"
                          value={editor.sortOrder}
                          onChange={(event) => setEditor({ ...editor, sortOrder: Number(event.target.value) })}
                        />
                      </div>
                    </div>
                  ) : null}

                  {editor.type !== 'topic' ? (
                    <div className="space-y-2 rounded-lg border p-3">
                      <label className="text-sm font-medium">Connected topics</label>
                      {topics.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Create topics first, then select them here.</p>
                      ) : (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {topics.map((topic) => (
                            <label key={topic.id} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                              <input
                                type="checkbox"
                                checked={editor.topicIds.includes(topic.id)}
                                onChange={() => toggleTopic(topic.id)}
                                className="h-4 w-4 accent-primary"
                              />
                              {topic.name}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}

                  {editor.type !== 'topic' ? (
                    <>
                      <div className="space-y-3 rounded-lg border p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <label className="text-sm font-medium">Cover image upload</label>
                            <p className="text-xs text-muted-foreground">Uploads to Supabase Storage as WebP/JPEG after browser-side compression.</p>
                          </div>
                          <Button type="button" variant="outline" disabled={imageUploadMutation.isPending} asChild>
                            <label className="cursor-pointer">
                              {imageUploadMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                              Upload
                              <input type="file" accept="image/*" onChange={handleImageChange} className="sr-only" />
                            </label>
                          </Button>
                        </div>
                        <Input value={editor.imageUrl} onChange={(event) => setEditor({ ...editor, imageUrl: event.target.value })} placeholder="Or paste image URL" />
                        {editor.imageUrl ? (
                          <div className="overflow-hidden rounded-lg border bg-muted">
                            <img src={editor.imageUrl} alt="Preview" className="max-h-52 w-full object-cover" />
                          </div>
                        ) : null}
                      </div>

                      <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
                        <div>
                          <label className="text-sm font-medium">Automatic SEO preview</label>
                          <p className="text-xs text-muted-foreground">SEO title and description are generated from the title, description/excerpt, and CMS content when you save.</p>
                        </div>
                        <div className="space-y-1 rounded-md bg-background p-3 text-sm">
                          <p className="font-semibold text-primary">{seoPreview.title}</p>
                          <p className="text-muted-foreground">{seoPreview.description}</p>
                        </div>
                      </div>

                      {editor.type === 'project' ? (
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Demo URL</label>
                            <Input value={editor.demoUrl} onChange={(event) => setEditor({ ...editor, demoUrl: event.target.value })} />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Repo URL</label>
                            <Input value={editor.repoUrl} onChange={(event) => setEditor({ ...editor, repoUrl: event.target.value })} />
                          </div>
                        </div>
                      ) : null}
                    </>
                  ) : null}

                  <div className="flex gap-2 pt-2">
                    <Button type="submit" disabled={saveMutation.isPending}>
                      <Save className="h-4 w-4" /> {saveMutation.isPending ? 'Saving...' : 'Save'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setEditor(emptyEditor)}>
                      Reset
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <div className="grid gap-6">
              <ContentList title="Blog posts" items={posts} type="blog" onEdit={handleEdit} onDelete={handleDelete} />
              <ContentList title="Projects" items={projects} type="project" onEdit={handleEdit} onDelete={handleDelete} />
              <ContentList title="Topics" items={topics} type="topic" onEdit={handleEdit} onDelete={handleDelete} />
            </div>
          </div>
        ) : null}

        {tab === 'site' && siteSettings ? (
          <SiteSettingsForm settings={siteSettings} onSubmit={handleSiteSubmit} isPending={siteMutation.isPending} />
        ) : null}

        {tab === 'settings' && shareSettings ? (
          <Card>
            <CardHeader>
              <CardTitle>Share settings</CardTitle>
              <CardDescription>Queue share jobs when content is published and see what is still required for real auto-posting.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <AlertTitle>What is needed for true auto-share?</AlertTitle>
                <AlertDescription>
                  This CMS can queue share jobs, but real automatic posting needs a backend worker or Supabase Edge Function with private API credentials.
                  Do not put LinkedIn, X, Facebook, SMTP, or Telegram secrets in Vite frontend env variables. See docs/social-auto-share-requirements.md.
                </AlertDescription>
              </Alert>
              <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
                <div>
                  <h3 className="font-medium">Auto queue share jobs on publish</h3>
                  <p className="text-sm text-muted-foreground">This creates ready-to-share rows in social_share_queue. It does not auto-post without API tokens.</p>
                </div>
                <Button
                  variant={shareSettings.auto_share_on_publish ? 'default' : 'outline'}
                  onClick={() =>
                    settingsMutation.mutate({
                      auto_share_on_publish: !shareSettings.auto_share_on_publish,
                      active_platforms: shareSettings.active_platforms,
                      default_message_template: shareSettings.default_message_template
                    })
                  }
                >
                  {shareSettings.auto_share_on_publish ? 'Enabled' : 'Disabled'}
                </Button>
              </div>

              <div>
                <h3 className="mb-3 font-medium">Active platforms</h3>
                <div className="flex flex-wrap gap-2">
                  {platforms.map((platform) => (
                    <Button key={platform} variant={shareSettings.active_platforms.includes(platform) ? 'default' : 'outline'} onClick={() => togglePlatform(platform)}>
                      {platform === 'x' ? 'X / Twitter' : platform}
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  const formData = new FormData(event.currentTarget);
                  settingsMutation.mutate({
                    auto_share_on_publish: shareSettings.auto_share_on_publish,
                    active_platforms: shareSettings.active_platforms,
                    default_message_template: String(formData.get('template') || '')
                  });
                }}
              >
                <label className="text-sm font-medium">Default message template</label>
                <Textarea name="template" defaultValue={shareSettings.default_message_template} />
                <p className="text-xs text-muted-foreground">Available variables: {'{{title}}'}, {'{{description}}'}, {'{{url}}'}, {'{{type}}'}</p>
                <Button type="submit" disabled={settingsMutation.isPending}>Save settings</Button>
              </form>
            </CardContent>
          </Card>
        ) : null}
      </section>
    </>
  );
}

function SiteSettingsForm({
  settings,
  onSubmit,
  isPending
}: {
  settings: SiteSettings;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isPending: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Site CMS</CardTitle>
        <CardDescription>Edit homepage hero copy and CTA links without touching React files.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Site name</label>
              <Input name="site_name" defaultValue={settings.site_name} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Hero badge</label>
              <Input name="hero_badge" defaultValue={settings.hero_badge} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Hero title</label>
            <Input name="hero_title" defaultValue={settings.hero_title} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Hero description</label>
            <Textarea name="hero_description" defaultValue={settings.hero_description} className="min-h-28" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Primary CTA label</label>
              <Input name="primary_cta_label" defaultValue={settings.primary_cta_label} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Primary CTA href</label>
              <Input name="primary_cta_href" defaultValue={settings.primary_cta_href} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Secondary CTA label</label>
              <Input name="secondary_cta_label" defaultValue={settings.secondary_cta_label} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Secondary CTA href</label>
              <Input name="secondary_cta_href" defaultValue={settings.secondary_cta_href} />
            </div>
          </div>
          <Button type="submit" disabled={isPending}>
            <Save className="h-4 w-4" /> {isPending ? 'Saving...' : 'Save site settings'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
