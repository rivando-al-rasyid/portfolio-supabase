import type { BlogPost, Category, GraphData, GraphEdge, GraphNode, Project } from '../types/content';

function keywords(value: string) {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 4)
  );
}

function addEdge(edges: Map<string, GraphEdge>, source: string, target: string, weight: number, reason: string) {
  if (source === target) return;
  const key = [source, target].sort().join('__');
  const existing = edges.get(key);
  if (existing) {
    existing.weight += weight;
    if (!existing.reason.includes(reason)) existing.reason = `${existing.reason}, ${reason}`;
    return;
  }
  edges.set(key, { source, target, weight, reason });
}

export function buildGraphData(posts: BlogPost[], projects: Project[], categories: Category[]): GraphData {
  const nodes: GraphNode[] = [
    ...posts.map((post) => ({
      id: `blog:${post.id}`,
      type: 'blog' as const,
      label: post.title,
      slug: post.slug,
      description: post.excerpt
    })),
    ...projects.map((project) => ({
      id: `project:${project.id}`,
      type: 'project' as const,
      label: project.title,
      slug: project.slug,
      description: project.summary
    })),
    ...categories.map((category) => ({
      id: `category:${category.id}`,
      type: 'category' as const,
      label: category.name,
      slug: category.slug,
      description: null
    }))
  ];

  const edges = new Map<string, GraphEdge>();
  posts.forEach((post) => {
    post.categories?.forEach((category) => addEdge(edges, `blog:${post.id}`, `category:${category.id}`, 3, 'category'));
  });
  projects.forEach((project) => {
    project.categories?.forEach((category) => addEdge(edges, `project:${project.id}`, `category:${category.id}`, 3, 'category'));
  });

  const contentNodes = [
    ...posts.map((post) => ({ id: `blog:${post.id}`, text: `${post.title} ${post.excerpt ?? ''} ${post.content}` })),
    ...projects.map((project) => ({ id: `project:${project.id}`, text: `${project.title} ${project.summary ?? ''} ${project.content}` }))
  ];

  for (let i = 0; i < contentNodes.length; i += 1) {
    for (let j = i + 1; j < contentNodes.length; j += 1) {
      const left = keywords(contentNodes[i].text);
      const right = keywords(contentNodes[j].text);
      const overlap = [...left].filter((word) => right.has(word));
      if (overlap.length >= 2) addEdge(edges, contentNodes[i].id, contentNodes[j].id, Math.min(overlap.length, 5), 'keyword overlap');
    }
  }

  return { nodes, edges: [...edges.values()] };
}
