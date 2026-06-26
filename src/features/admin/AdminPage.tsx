'use client';

import { ChangeEvent, FormEvent, KeyboardEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ImageIcon, Loader2, LogOut, Pencil, Plus, RefreshCw, Save, Settings, Trash2, Upload, X } from 'lucide-react';
import { CmsRichTextEditor } from '../../components/CmsRichTextEditor';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import {
  createBlogPost,
  createProject,
  deleteBlogPost,
  deleteCategory,
  deleteProject,
  enqueueShareJobs,
  getAllBlogPosts,
  getAllProjects,
  getCategories,
  getShareQueue,
  getShareSettings,
  getSiteSettings,
  getSocialApiConnections,
  replaceBlogPostCategories,
  replaceProjectCategories,
  updateBlogPost,
  updateProject,
  updateShareSettings,
  updateSiteSettings,
  upsertSocialApiConnection
} from '../../lib/contentService';
import { fetchGitHubReadmeFromRepo, readMarkdownFile, type ImportedMarkdownContent } from '../../lib/contentImport';
import { formatBytes } from '../../lib/imageCompression';
import { compressAndUploadImage } from '../../lib/mediaService';
import { generateSeoDescription, generateSeoTitle, getCanonicalUrl, makeUniqueSlug, toSlug, truncateText } from '../../lib/utils';
import { useAuth } from '../auth/AuthProvider';
import type { BlogPost, Category, ContentSource, Project, SharePlatform, SiteSettings, SocialApiConnection } from '../../types/content';

type EditableType = 'blog' | 'project';
type Tab = 'content' | 'site' | 'settings';

interface EditorState {
  id: string;
  type: EditableType;
  title: string;
  slug: string;
  description: string;
  content: string;
  contentSource: ContentSource;
  sourceUrl: string;
  status: 'draft' | 'published';
  isFeatured: boolean;
  sortOrder: number;
  imageUrl: string;
  demoUrl: string;
  repoUrl: string;
  categoryNames: string[];
}

interface ApiConnectionEditorState {
  platform: SharePlatform;
  label: string;
  isEnabled: boolean;
  apiBaseUrl: string;
  apiCode: string;
  apiToken: string;
  apiSecret: string;
  accountId: string;
}

const emptyEditor: EditorState = {
  id: '',
  type: 'blog',
  title: '',
  slug: '',
  description: '',
  content: '',
  contentSource: 'manual',
  sourceUrl: '',
  status: 'draft',
  isFeatured: false,
  sortOrder: 100,
  imageUrl: '',
  demoUrl: '',
  repoUrl: '',
  categoryNames: []
};

const platforms: SharePlatform[] = ['linkedin', 'x', 'facebook', 'whatsapp', 'telegram', 'email'];

const platformLabels: Record<SharePlatform, string> = {
  linkedin: 'LinkedIn',
  x: 'X / Twitter',
  facebook: 'Facebook',
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
  email: 'Email'
};

const platformDescriptions: Record<SharePlatform, string> = {
  linkedin: 'Use a posting webhook or approved LinkedIn API service.',
  x: 'Use a posting webhook or approved X API service.',
  facebook: 'Use a Page publishing webhook or approved Meta API service.',
  whatsapp: 'Use WhatsApp Business, n8n, Make, Zapier, or your own webhook.',
  telegram: 'Direct posting uses bot token and chat ID. No webhook endpoint is required.',
  email: 'Use an email provider webhook such as Resend, SendGrid, or your own endpoint.'
};

function getPlatformLabel(platform: SharePlatform) {
  return platformLabels[platform] ?? platform;
}

const emptyApiEditor: ApiConnectionEditorState = {
  platform: 'linkedin',
  label: '',
  isEnabled: true,
  apiBaseUrl: '',
  apiCode: '',
  apiToken: '',
  apiSecret: '',
  accountId: ''
};

function editorFromItem(type: EditableType, item: BlogPost | Project): EditorState {
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
      contentSource: post.content_source ?? 'manual',
      sourceUrl: post.source_url ?? '',
      status: post.status,
      isFeatured: post.is_featured ?? false,
      sortOrder: post.sort_order ?? 100,
      imageUrl: post.cover_image ?? '',
      categoryNames: post.categories?.map((category) => category.name) ?? []
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
    contentSource: project.content_source ?? 'manual',
    sourceUrl: project.source_url ?? '',
    status: project.status,
    isFeatured: project.is_featured ?? false,
    sortOrder: project.sort_order ?? 100,
    imageUrl: project.image_url ?? '',
    demoUrl: project.demo_url ?? '',
    repoUrl: project.repo_url ?? '',
    categoryNames: project.categories?.map((category) => category.name) ?? []
  };
}

function apiEditorFromConnection(connection: SocialApiConnection): ApiConnectionEditorState {
  return {
    platform: connection.platform,
    label: connection.label ?? '',
    isEnabled: connection.is_enabled,
    apiBaseUrl: connection.api_base_url ?? '',
    apiCode: connection.api_code ?? '',
    apiToken: connection.api_token ?? '',
    apiSecret: connection.api_secret ?? '',
    accountId: connection.account_id ?? ''
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
  items: Array<BlogPost | Project>;
  type: EditableType;
  onEdit: (type: EditableType, item: BlogPost | Project) => void;
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
          const itemDescription = 'excerpt' in item ? item.excerpt : item.summary;
          return (
            <div key={item.id} className="rounded-lg border p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium">{item.title}</h3>
                    <Badge variant={item.status === 'published' ? 'default' : 'outline'}>{item.status}</Badge>
                    {item.is_featured ? <Badge variant="secondary">featured</Badge> : null}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">/{item.slug}</p>
                  {itemDescription ? <p className="mt-2 text-sm text-muted-foreground">{truncateText(itemDescription, 110)}</p> : null}
                  {item.categories?.length ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {item.categories.map((category) => (
                        <Badge key={category.id} variant="outline">
                          {category.name}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
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

function CategoryPicker({
  categories,
  selectedNames,
  onChange
}: {
  categories: Category[];
  selectedNames: string[];
  onChange: (names: string[]) => void;
}) {
  const [search, setSearch] = useState('');
  const selectedSlugs = new Set(selectedNames.map(toSlug));
  const filteredCategories = categories
    .filter((category) => !selectedSlugs.has(category.slug))
    .filter((category) => category.name.toLowerCase().includes(search.trim().toLowerCase()))
    .slice(0, 8);

  function addCategory(name: string) {
    const trimmed = name.trim();
    const slug = toSlug(trimmed);
    if (!trimmed || selectedSlugs.has(slug)) return;
    const existing = categories.find((category) => category.slug === slug);
    onChange([...selectedNames, existing?.name ?? trimmed]);
    setSearch('');
  }

  function removeCategory(name: string) {
    const slug = toSlug(name);
    onChange(selectedNames.filter((item) => toSlug(item) !== slug));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    addCategory(search);
  }

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div>
        <label className="text-sm font-medium">Categories</label>
        <p className="text-xs text-muted-foreground">
          Search existing categories or type a new one. If it already exists, the CMS reuses the same category; if not, it creates it on save.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {selectedNames.length === 0 ? <span className="text-sm text-muted-foreground">No categories selected.</span> : null}
        {selectedNames.map((name) => (
          <Badge key={toSlug(name)} variant="secondary" className="gap-1 pr-1">
            {name}
            <button type="button" className="rounded-full p-0.5 hover:bg-background/60" onClick={() => removeCategory(name)} aria-label={`Remove ${name}`}>
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <Input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={handleKeyDown} placeholder="Search or add category, e.g. React" />
        <Button type="button" variant="outline" onClick={() => addCategory(search)} disabled={!search.trim()}>
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>
      {filteredCategories.length ? (
        <div className="flex flex-wrap gap-2">
          {filteredCategories.map((category) => (
            <Button key={category.id} type="button" size="sm" variant="outline" onClick={() => addCategory(category.name)}>
              {category.name}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function AdminPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('content');
  const [editor, setEditor] = useState<EditorState>(emptyEditor);
  const [apiEditor, setApiEditor] = useState<ApiConnectionEditorState>(emptyApiEditor);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [githubImportUrl, setGithubImportUrl] = useState('');

  const { data: posts = [] } = useQuery({ queryKey: ['admin', 'blog-posts'], queryFn: getAllBlogPosts });
  const { data: projects = [] } = useQuery({ queryKey: ['admin', 'projects'], queryFn: getAllProjects });
  const { data: categories = [] } = useQuery({ queryKey: ['admin', 'categories'], queryFn: getCategories });
  const { data: shareSettings } = useQuery({ queryKey: ['admin', 'share-settings'], queryFn: getShareSettings });
  const { data: apiConnections = [] } = useQuery({ queryKey: ['admin', 'social-api-connections'], queryFn: getSocialApiConnections });
  const { data: shareQueue = [] } = useQuery({ queryKey: ['admin', 'share-queue'], queryFn: getShareQueue });
  const { data: siteSettings } = useQuery({ queryKey: ['admin', 'site-settings'], queryFn: getSiteSettings });

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, router, user]);

  const saveMutation = useMutation({
    mutationFn: async (state: EditorState) => {
      const rawSlug = state.slug || state.title;
      const existingSlugs =
        state.type === 'blog'
          ? posts.filter((post) => post.id !== state.id).map((post) => post.slug)
          : projects.filter((project) => project.id !== state.id).map((project) => project.slug);
      const slug = makeUniqueSlug(rawSlug, existingSlugs);
      if (!state.title.trim() || !slug.trim()) throw new Error('Title and slug are required.');

      if (state.type === 'blog') {
        const previousPost = posts.find((post) => post.id === state.id);
        const shouldQueueShare = state.status === 'published' && shareSettings?.auto_share_on_publish && (!state.id || previousPost?.status !== 'published');
        const payload = {
          title: state.title.trim(),
          slug,
          excerpt: state.description || null,
          content: state.content || '',
          content_source: 'manual' as const,
          source_url: null,
          cover_image: state.imageUrl || null,
          status: state.status,
          is_featured: state.isFeatured,
          sort_order: Number.isFinite(state.sortOrder) ? state.sortOrder : 100,
          meta_title: generateSeoTitle(state.title),
          meta_description: generateSeoDescription({ description: state.description, content: state.content }),
          published_at: state.status === 'published' ? previousPost?.published_at ?? new Date().toISOString() : null
        };
        const saved = state.id ? await updateBlogPost(state.id, payload) : await createBlogPost(payload);
        const savedCategories = await replaceBlogPostCategories(saved.id, state.categoryNames);
        if (shouldQueueShare) {
          await enqueueShareJobs({
            entityType: 'blog',
            entityId: saved.id,
            platforms: shareSettings.active_platforms,
            payload: {
              title: saved.title,
              description: generateSeoDescription({ description: saved.excerpt, content: saved.content }),
              url: getCanonicalUrl(`/blog/${saved.slug}`),
              type: 'blog',
              categories: savedCategories.map((category) => category.name)
            }
          });
        }
        return saved;
      }

      const previousProject = projects.find((project) => project.id === state.id);
      const shouldQueueShare = state.status === 'published' && shareSettings?.auto_share_on_publish && (!state.id || previousProject?.status !== 'published');
      const payload = {
        title: state.title.trim(),
        slug,
        summary: state.description || null,
        content: state.content || '',
        content_source: (state.contentSource === 'github_readme' ? 'github_readme' : 'manual') as ContentSource,
        source_url: state.contentSource === 'github_readme' ? state.sourceUrl || state.repoUrl || null : null,
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
      const savedCategories = await replaceProjectCategories(saved.id, state.categoryNames);
      if (shouldQueueShare) {
        await enqueueShareJobs({
          entityType: 'project',
          entityId: saved.id,
          platforms: shareSettings.active_platforms,
          payload: {
            title: saved.title,
            description: generateSeoDescription({ description: saved.summary, content: saved.content }),
            url: getCanonicalUrl(`/projects/${saved.slug}`),
            type: 'project',
            categories: savedCategories.map((category) => category.name)
          }
        });
      }
      return saved;
    },
    onSuccess: async () => {
      setMessage('Saved successfully. Categories were reused or created automatically.');
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

  const apiConnectionMutation = useMutation({
    mutationFn: async (state: ApiConnectionEditorState) => {
      return upsertSocialApiConnection({
        platform: state.platform,
        label: state.label || null,
        is_enabled: state.isEnabled,
        api_base_url: state.platform === 'telegram' ? null : state.apiBaseUrl || null,
        api_code: state.apiCode || null,
        api_token: state.apiToken || null,
        api_secret: state.apiSecret || null,
        account_id: state.accountId || null,
        extra_config: {}
      });
    },
    onSuccess: async () => {
      setMessage('Social API connection saved.');
      setError('');
      setApiEditor(emptyApiEditor);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'social-api-connections'] });
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Cannot save social API connection.');
      setMessage('');
    }
  });


  const categoryDeleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: async () => {
      setMessage('Category deleted.');
      setError('');
      await queryClient.invalidateQueries();
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Cannot delete category.');
      setMessage('');
    }
  });

  function getExistingSlugs(type: EditableType, currentId: string) {
    if (type === 'blog') return posts.filter((post) => post.id !== currentId).map((post) => post.slug);
    return projects.filter((project) => project.id !== currentId).map((project) => project.slug);
  }

  function mergeCategoryNames(currentNames: string[], importedNames: string[] = []) {
    const categoriesBySlug = new Map<string, string>();
    [...currentNames, ...importedNames].forEach((name) => {
      const slug = toSlug(name);
      if (slug && !categoriesBySlug.has(slug)) categoriesBySlug.set(slug, name.trim());
    });
    return [...categoriesBySlug.values()];
  }

  function applyImportedContent(imported: ImportedMarkdownContent, targetType: EditableType) {
    setEditor((current) => {
      if (current.type !== targetType) return current;

      const nextTitle = imported.title || current.title;
      const importedSlug = imported.slug || (imported.title ? toSlug(imported.title) : '');
      const shouldUpdateSlug = Boolean(importedSlug) && (!current.slug || current.slug === toSlug(current.title));
      const nextSlug = shouldUpdateSlug ? makeUniqueSlug(importedSlug, getExistingSlugs(current.type, current.id), current.slug) : current.slug;

      return {
        ...current,
        title: nextTitle,
        slug: nextSlug,
        description: imported.description ?? current.description,
        content: imported.content,
        contentSource: targetType === 'project' && imported.source === 'github_readme' ? 'github_readme' : 'manual',
        sourceUrl: targetType === 'project' && imported.source === 'github_readme' ? imported.sourceUrl : '',
        repoUrl: imported.repoUrl || current.repoUrl,
        demoUrl: imported.demoUrl || current.demoUrl,
        imageUrl: imported.imageUrl || current.imageUrl,
        categoryNames: mergeCategoryNames(current.categoryNames, imported.categoryNames),
        status: imported.status || current.status,
        isFeatured: imported.isFeatured ?? current.isFeatured,
        sortOrder: imported.sortOrder ?? current.sortOrder
      };
    });
    setMessage(`Imported ${imported.source === 'github_readme' ? 'GitHub README' : 'Markdown'} into all matching inputs successfully.`);
    setError('');
  }

  const contentImportMutation = useMutation({
    mutationFn: async (input: { targetType: 'project'; url: string }) => fetchGitHubReadmeFromRepo(input.url),
    onSuccess: (imported, variables) => {
      applyImportedContent(imported, variables.targetType);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Import failed.');
      setMessage('');
    }
  });

  const totalPublished = useMemo(
    () => posts.filter((post) => post.status === 'published').length + projects.filter((project) => project.status === 'published').length,
    [posts, projects]
  );

  const shareQueueStats = useMemo(
    () => ({
      ready: shareQueue.filter((item) => item.status === 'ready').length,
      sent: shareQueue.filter((item) => item.status === 'sent').length,
      failed: shareQueue.filter((item) => item.status === 'failed').length
    }),
    [shareQueue]
  );

  const seoPreview = useMemo(
    () => ({
      title: generateSeoTitle(editor.title),
      description: generateSeoDescription({ description: editor.description, content: editor.content })
    }),
    [editor.title, editor.description, editor.content]
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveMutation.mutate(editor);
  }

  function handleTypeChange(type: EditableType) {
    setEditor({ ...emptyEditor, type });
    setGithubImportUrl('');
  }

  function handleEdit(type: EditableType, item: BlogPost | Project) {
    setEditor(editorFromItem(type, item));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleDelete(type: EditableType, id: string) {
    if (!confirm('Delete this item?')) return;
    try {
      if (type === 'blog') await deleteBlogPost(id);
      if (type === 'project') await deleteProject(id);
      setMessage('Deleted successfully.');
      await queryClient.invalidateQueries();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.');
    }
  }

  async function handleLogout() {
    await signOut();
    router.replace('/login');
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    imageUploadMutation.mutate(file);
  }

  async function handleMarkdownFileImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const imported = await readMarkdownFile(file);
      applyImportedContent(imported, editor.type);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Markdown file import failed.');
      setMessage('');
    }
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

  if (authLoading) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Checking admin session...</CardTitle>
            <CardDescription>Please wait while Supabase restores your login session.</CardDescription>
          </CardHeader>
        </Card>
      </section>
    );
  }

  if (!user) return null;

  return (
    <>
      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">Admin CMS</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">Dashboard</h1>
            <p className="mt-3 text-muted-foreground">Logged in as {user?.email}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant={tab === 'content' ? 'default' : 'outline'} onClick={() => setTab('content')}>
              <Plus className="h-4 w-4" /> Content
            </Button>
            <Button type="button" variant={tab === 'site' ? 'default' : 'outline'} onClick={() => setTab('site')}>
              <ImageIcon className="h-4 w-4" /> Site CMS
            </Button>
            <Button type="button" variant={tab === 'settings' ? 'default' : 'outline'} onClick={() => setTab('settings')}>
              <Settings className="h-4 w-4" /> Auto-share
            </Button>
            <Button type="button" variant="secondary" onClick={handleLogout}>
              <LogOut className="h-4 w-4" /> Logout
            </Button>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <Card><CardHeader><CardTitle>{posts.length}</CardTitle><CardDescription>Blog posts</CardDescription></CardHeader></Card>
          <Card><CardHeader><CardTitle>{projects.length}</CardTitle><CardDescription>Projects</CardDescription></CardHeader></Card>
          <Card><CardHeader><CardTitle>{categories.length}</CardTitle><CardDescription>Categories</CardDescription></CardHeader></Card>
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
                <CardDescription>
                  Manage blog posts, projects, searchable categories, SEO, featured order, stateless imports, and compressed images from one CMS form.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Type</label>
                      <Select value={editor.type} onChange={(event) => handleTypeChange(event.target.value as EditableType)}>
                        <option value="blog">Blog post</option>
                        <option value="project">Project</option>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Status</label>
                      <Select value={editor.status} onChange={(event) => setEditor({ ...editor, status: event.target.value as 'draft' | 'published' })}>
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Title</label>
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
                        onClick={() => setEditor({ ...editor, slug: makeUniqueSlug(editor.title, getExistingSlugs(editor.type, editor.id)) })}
                      >
                        <RefreshCw className="h-3.5 w-3.5" /> Regenerate
                      </Button>
                    </div>
                    <Input value={editor.slug} onChange={(event) => setEditor({ ...editor, slug: toSlug(event.target.value) })} placeholder="my-article-title" />
                    {editor.slug ? (
                      <p className="text-xs text-muted-foreground">
                        Public URL: /{editor.type === 'blog' ? 'blog/' : 'projects/'}{editor.slug}
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description / excerpt</label>
                    <Textarea value={editor.description} onChange={(event) => setEditor({ ...editor, description: event.target.value })} />
                  </div>

                  <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
                    {editor.type === 'project' ? (
                      <>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                          <div>
                            <label className="text-sm font-medium">Project content source</label>
                            <p className="text-xs text-muted-foreground">
                              README import is only for projects. Paste a GitHub repository URL or a README URL, then import it into the fields above. GitHub README mode can refresh project content at page load, with saved content as fallback.
                            </p>
                          </div>
                          <Select
                            className="sm:w-52"
                            value={editor.contentSource === 'github_readme' ? 'github_readme' : 'manual'}
                            onChange={(event) => {
                              const nextSource = event.target.value as ContentSource;
                              setEditor({
                                ...editor,
                                contentSource: nextSource,
                                sourceUrl: nextSource === 'github_readme' ? editor.sourceUrl || editor.repoUrl || githubImportUrl : ''
                              });
                            }}
                          >
                            <option value="manual">Manual CMS content</option>
                            <option value="github_readme">GitHub README</option>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                            <Input
                              value={editor.repoUrl}
                              onChange={(event) => {
                                const url = event.target.value;
                                setEditor({ ...editor, repoUrl: url, sourceUrl: editor.contentSource === 'github_readme' ? url : editor.sourceUrl });
                              }}
                              placeholder="GitHub repo or README URL, e.g. https://github.com/rivando-al-rasyid/portfolio-supabase"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              disabled={contentImportMutation.isPending || !editor.repoUrl.trim()}
                              onClick={() => contentImportMutation.mutate({ targetType: 'project', url: editor.repoUrl })}
                            >
                              {contentImportMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                              Import README
                            </Button>
                          </div>
                          <Button type="button" variant="outline" asChild>
                            <label className="cursor-pointer">
                              <Upload className="h-4 w-4" />
                              Import project .md file
                              <input type="file" accept=".md,.markdown,text/markdown,text/plain" className="sr-only" onChange={handleMarkdownFileImport} />
                            </label>
                          </Button>
                          <p className="text-xs text-muted-foreground">
                            Example accepted URLs: https://github.com/rivando-al-rasyid/portfolio-supabase or https://github.com/rivando-al-rasyid/portfolio-supabase/blob/main/README.md.
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="space-y-2">
                        <div>
                          <label className="text-sm font-medium">Blog import</label>
                          <p className="text-xs text-muted-foreground">
                            Blog content uses manual CMS content. Import a local .md/.markdown file to fill title, slug, excerpt, content, categories, cover image, status, featured flag, and sort order. GitHub README import is only for projects.
                          </p>
                        </div>
                        <Button type="button" variant="outline" asChild>
                          <label className="cursor-pointer">
                            <Upload className="h-4 w-4" />
                            Import blog .md file
                            <input type="file" accept=".md,.markdown,text/markdown,text/plain" className="sr-only" onChange={handleMarkdownFileImport} />
                          </label>
                        </Button>
                      </div>
                    )}

                    {editor.type === 'project' && editor.sourceUrl ? <p className="break-all text-xs text-muted-foreground">Source: {editor.sourceUrl}</p> : null}
                  </div>

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

                  <CategoryPicker categories={categories} selectedNames={editor.categoryNames} onChange={(categoryNames) => setEditor({ ...editor, categoryNames })} />

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
                      <Input type="number" value={editor.sortOrder} onChange={(event) => setEditor({ ...editor, sortOrder: Number(event.target.value) })} />
                    </div>
                  </div>

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
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Demo URL</label>
                      <Input value={editor.demoUrl} onChange={(event) => setEditor({ ...editor, demoUrl: event.target.value })} />
                    </div>
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
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Categories</CardTitle>
                  <CardDescription>Created automatically from blog/project category input.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {categories.length === 0 ? <p className="text-sm text-muted-foreground">No categories yet.</p> : null}
                  {categories.map((category) => (
                    <Badge key={category.id} variant="outline" className="gap-1 pr-1">
                      {category.name}
                      <button
                        type="button"
                        className="rounded-full p-0.5 hover:bg-muted"
                        onClick={() => {
                          if (confirm(`Delete category ${category.name}?`)) categoryDeleteMutation.mutate(category.id);
                        }}
                        aria-label={`Delete ${category.name}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : null}

        {tab === 'site' && siteSettings ? <SiteSettingsForm settings={siteSettings} onSubmit={handleSiteSubmit} isPending={siteMutation.isPending} /> : null}

        {tab === 'settings' && shareSettings ? (
          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Auto-share workflow</CardTitle>
                  <CardDescription>
                    Auto-share does not post from the browser. Published blog/project items are added to a queue, then a Next.js webhook endpoint sends them using your saved platform connection.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border bg-muted/20 p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Automation</p>
                      <p className="mt-1 text-lg font-semibold">{shareSettings.auto_share_on_publish ? 'Enabled' : 'Disabled'}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Creates queue rows when new content becomes published.</p>
                    </div>
                    <div className="rounded-lg border bg-muted/20 p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Platforms</p>
                      <p className="mt-1 text-lg font-semibold">{shareSettings.active_platforms.length}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Selected destinations for new queue jobs.</p>
                    </div>
                    <div className="rounded-lg border bg-muted/20 p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Queue</p>
                      <p className="mt-1 text-lg font-semibold">{shareQueueStats.ready} ready</p>
                      <p className="mt-1 text-xs text-muted-foreground">{shareQueueStats.sent} sent, {shareQueueStats.failed} failed.</p>
                    </div>
                  </div>

                  <div className="rounded-lg border p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="font-medium">Create share jobs automatically</h3>
                        <p className="text-sm text-muted-foreground">
                          Turn this on when you want the CMS to prepare social posts every time a draft is published. Turn it off when you only want to publish content without sharing it.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant={shareSettings.auto_share_on_publish ? 'default' : 'outline'}
                        onClick={() =>
                          settingsMutation.mutate({
                            auto_share_on_publish: !shareSettings.auto_share_on_publish,
                            active_platforms: shareSettings.active_platforms,
                            default_message_template: shareSettings.default_message_template
                          })
                        }
                      >
                        {shareSettings.auto_share_on_publish ? 'Auto-share enabled' : 'Auto-share disabled'}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-lg border p-4">
                    <div>
                      <h3 className="font-medium">Destination platforms</h3>
                      <p className="text-sm text-muted-foreground">
                        Choose where new blog/project posts are queued. A platform must also have an enabled API connection before the Next.js webhook endpoint can send it.
                      </p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {platforms.map((platform) => {
                        const isActive = shareSettings.active_platforms.includes(platform);
                        return (
                          <button
                            key={platform}
                            type="button"
                            onClick={() => togglePlatform(platform)}
                            className={`rounded-lg border p-3 text-left transition hover:bg-muted/60 ${isActive ? 'border-primary bg-primary/10' : 'bg-background'}`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-medium">{getPlatformLabel(platform)}</span>
                              <Badge variant={isActive ? 'default' : 'outline'}>{isActive ? 'selected' : 'off'}</Badge>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">{platformDescriptions[platform]}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <form
                    className="space-y-3 rounded-lg border p-4"
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
                    <div>
                      <label className="text-sm font-medium">Share message template</label>
                      <p className="text-sm text-muted-foreground">
                        This text is rendered by the Next.js webhook endpoint before posting. Keep it simple so the same template works across multiple platforms.
                      </p>
                    </div>
                    <Textarea name="template" defaultValue={shareSettings.default_message_template} className="min-h-28" />
                    <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
                      Variables: {'{{title}}'}, {'{{description}}'}, {'{{url}}'}, {'{{type}}'}, {'{{categories}}'}.
                      Example: New {'{{type}}'}: {'{{title}}'} {'{{url}}'}
                    </div>
                    <Button type="submit" disabled={settingsMutation.isPending}>
                      <Save className="h-4 w-4" /> {settingsMutation.isPending ? 'Saving...' : 'Save auto-share settings'}
                    </Button>
                  </form>

                  <Alert>
                    <AlertTitle>How sending works</AlertTitle>
                    <AlertDescription>
                      Call <code>/api/webhooks/social-share</code> from Vercel Cron, Supabase Scheduled Functions, or another server-side scheduler. The dashboard does not run the processor manually because production posting should happen outside the browser.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Platform connection</CardTitle>
                  <CardDescription>
                    Save one reusable connection per platform. Existing platform rows are updated, so you do not create duplicate configs.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form
                    className="space-y-4"
                    onSubmit={(event) => {
                      event.preventDefault();
                      apiConnectionMutation.mutate(apiEditor);
                    }}
                  >
                    <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Platform</label>
                        <Select value={apiEditor.platform} onChange={(event) => setApiEditor({ ...apiEditor, platform: event.target.value as SharePlatform })}>
                          {platforms.map((platform) => <option key={platform} value={platform}>{getPlatformLabel(platform)}</option>)}
                        </Select>
                      </div>
                      <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm sm:self-end">
                        <input type="checkbox" checked={apiEditor.isEnabled} onChange={(event) => setApiEditor({ ...apiEditor, isEnabled: event.target.checked })} className="h-4 w-4 accent-primary" />
                        Enabled
                      </label>
                    </div>

                    <Alert>
                      <AlertTitle>{getPlatformLabel(apiEditor.platform)} requirement</AlertTitle>
                      <AlertDescription>{platformDescriptions[apiEditor.platform]}</AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Connection label</label>
                      <Input value={apiEditor.label} onChange={(event) => setApiEditor({ ...apiEditor, label: event.target.value })} placeholder="Personal LinkedIn, portfolio Telegram, etc." />
                    </div>

                    {apiEditor.platform !== 'telegram' ? (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Webhook / posting endpoint</label>
                        <Input value={apiEditor.apiBaseUrl} onChange={(event) => setApiEditor({ ...apiEditor, apiBaseUrl: event.target.value })} placeholder="https://your-server.example.com/social/share" />
                        <p className="text-xs text-muted-foreground">
                          The Next.js webhook endpoint sends a normalized JSON payload to this endpoint. Use your own backend, n8n, Make, Zapier, or an approved social API wrapper.
                        </p>
                      </div>
                    ) : null}

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Account / destination ID</label>
                      <Input value={apiEditor.accountId} onChange={(event) => setApiEditor({ ...apiEditor, accountId: event.target.value })} placeholder={apiEditor.platform === 'telegram' ? 'Telegram chat ID' : 'Page ID, author URN, account ID, or channel ID'} />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">API code</label>
                        <Input type="password" value={apiEditor.apiCode} onChange={(event) => setApiEditor({ ...apiEditor, apiCode: event.target.value })} placeholder="Optional x-api-code header" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Access token</label>
                        <Input type="password" value={apiEditor.apiToken} onChange={(event) => setApiEditor({ ...apiEditor, apiToken: event.target.value })} placeholder={apiEditor.platform === 'telegram' ? 'Telegram bot token' : 'Bearer token, if required'} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Secret / signing key</label>
                      <Input type="password" value={apiEditor.apiSecret} onChange={(event) => setApiEditor({ ...apiEditor, apiSecret: event.target.value })} placeholder="Optional x-api-secret header" />
                    </div>

                    <Button type="submit" disabled={apiConnectionMutation.isPending}>
                      <Save className="h-4 w-4" /> {apiConnectionMutation.isPending ? 'Saving...' : 'Save platform connection'}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Saved connections</CardTitle>
                  <CardDescription>{apiConnections.length} configured platform{apiConnections.length === 1 ? '' : 's'}.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {apiConnections.length === 0 ? <p className="text-sm text-muted-foreground">No API connections saved yet. Pick a platform above and save its credentials first.</p> : null}
                  {apiConnections.map((connection) => (
                    <button key={connection.id} type="button" className="block w-full rounded-lg border p-3 text-left hover:bg-muted/50" onClick={() => setApiEditor(apiEditorFromConnection(connection))}>
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium">{getPlatformLabel(connection.platform)}</span>
                        <Badge variant={connection.is_enabled ? 'default' : 'outline'}>{connection.is_enabled ? 'enabled' : 'disabled'}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{connection.label || connection.account_id || 'No label or destination ID saved'}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {connection.platform === 'telegram' ? 'Direct Telegram bot posting' : connection.api_base_url ? 'Webhook endpoint configured' : 'Missing webhook endpoint'}
                      </p>
                    </button>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Share queue</CardTitle>
                  <CardDescription>Recent jobs created when content was published.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {shareQueue.length === 0 ? <p className="text-sm text-muted-foreground">No queued share jobs yet. Publish a blog post or project while auto-share is enabled.</p> : null}
                  {shareQueue.slice(0, 8).map((item) => (
                    <div key={item.id} className="rounded-lg border p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">{getPlatformLabel(item.platform)}</span>
                        <Badge variant={item.status === 'sent' ? 'default' : item.status === 'failed' ? 'destructive' : 'outline'}>{item.status}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{String(item.payload?.title ?? item.entity_id)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.entity_type} · attempts: {item.attempts}</p>
                      {item.error_message ? <p className="mt-1 text-xs text-destructive">{item.error_message}</p> : null}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
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
