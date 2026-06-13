import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Network } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { useGraphData } from '../../hooks/usePortfolioData';
import type { GraphData, GraphNode } from '../../types/content';

function nodePath(node: GraphNode) {
  if (node.type === 'blog') return `/blog/${node.slug}`;
  if (node.type === 'project') return `/projects/${node.slug}`;
  return `/graph?topic=${node.slug}`;
}

function nodeColor(type: GraphNode['type']) {
  if (type === 'blog') return 'fill-primary';
  if (type === 'project') return 'fill-emerald-500';
  return 'fill-amber-500';
}

function layoutGraph(data: GraphData) {
  const width = 900;
  const height = 520;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.35;
  const nodes = data.nodes.map((node, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(data.nodes.length, 1) - Math.PI / 2;
    const typeOffset = node.type === 'topic' ? -45 : node.type === 'project' ? 35 : 0;
    return {
      ...node,
      x: cx + Math.cos(angle) * (radius + typeOffset),
      y: cy + Math.sin(angle) * (radius + typeOffset)
    };
  });
  const positions = new Map(nodes.map((node) => [node.id, node]));
  return { width, height, nodes, edges: data.edges, positions };
}

export function KnowledgeGraph({ compact = false }: { compact?: boolean }) {
  const { data, isLoading } = useGraphData();
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const graph = useMemo(() => layoutGraph(data ?? { nodes: [], edges: [] }), [data]);

  if (isLoading) {
    return <div className="h-[420px] animate-pulse rounded-xl border bg-muted" />;
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Network className="h-5 w-5 text-primary" /> Knowledge graph
            </CardTitle>
            <CardDescription>Auto-linked by topics and keyword overlap. Click a node to inspect it.</CardDescription>
          </div>
          <Badge variant="outline">{graph.nodes.length} nodes</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="overflow-hidden rounded-xl border bg-background">
          <svg viewBox={`0 0 ${graph.width} ${graph.height}`} className={compact ? 'h-[340px] w-full' : 'h-[520px] w-full'} role="img">
            {graph.edges.map((edge, index) => {
              const source = graph.positions.get(edge.source);
              const target = graph.positions.get(edge.target);
              if (!source || !target) return null;
              return (
                <line
                  key={`${edge.source}-${edge.target}-${index}`}
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke="currentColor"
                  strokeOpacity={Math.min(0.15 + edge.weight / 20, 0.55)}
                  strokeWidth={Math.max(1, Math.min(edge.weight, 5))}
                  className="text-muted-foreground"
                />
              );
            })}
            {graph.nodes.map((node) => (
              <g key={node.id} className="cursor-pointer" onClick={() => setSelected(node)}>
                <circle cx={node.x} cy={node.y} r={node.type === 'topic' ? 15 : 20} className={nodeColor(node.type)} opacity="0.92" />
                <text x={node.x} y={node.y + 33} textAnchor="middle" className="graph-label fill-foreground text-[13px] font-semibold">
                  {node.label.length > 18 ? `${node.label.slice(0, 18)}…` : node.label}
                </text>
              </g>
            ))}
          </svg>
        </div>
        <aside className="rounded-xl border bg-muted/30 p-4">
          {selected ? (
            <div>
              <Badge>{selected.type}</Badge>
              <h3 className="mt-3 text-lg font-semibold">{selected.label}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{selected.description || 'No description yet.'}</p>
              {selected.type !== 'topic' ? (
                <Link to={nodePath(selected)} className="mt-4 inline-flex text-sm font-medium text-primary hover:underline">
                  Open detail
                </Link>
              ) : null}
            </div>
          ) : (
            <div>
              <h3 className="font-semibold">Explore connections</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Topics connect posts and projects. Keyword overlap creates extra edges, making the portfolio easier to explore.
              </p>
            </div>
          )}
        </aside>
      </CardContent>
    </Card>
  );
}
