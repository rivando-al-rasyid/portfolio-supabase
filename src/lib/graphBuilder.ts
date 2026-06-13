import type { BlogPost, GraphData, GraphEdge, GraphNode, Project, Topic } from '../types/content';

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

export function buildGraphData(posts: BlogPost[], projects: Project[], topics: Topic[]): GraphData {
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
    ...topics.map((topic) => ({
      id: `topic:${topic.id}`,
      type: 'topic' as const,
      label: topic.name,
      slug: topic.slug,
      description: topic.description
    }))
  ];

  const edges = new Map<string, GraphEdge>();
  posts.forEach((post) => {
    post.topics?.forEach((topic) => addEdge(edges, `blog:${post.id}`, `topic:${topic.id}`, 3, 'topic'));
  });
  projects.forEach((project) => {
    project.topics?.forEach((topic) => addEdge(edges, `project:${project.id}`, `topic:${topic.id}`, 3, 'topic'));
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
