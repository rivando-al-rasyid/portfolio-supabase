"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Network } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import type { GraphData, GraphNode } from "../../types/content";

function nodePath(node: GraphNode) {
  if (node.type === "blog") return `/blog/${node.slug}`;
  if (node.type === "project") return `/projects/${node.slug}`;
  return `/graph?category=${node.slug}`;
}

function nodeColor(type: GraphNode["type"]) {
  if (type === "blog") return "fill-primary";
  if (type === "project") return "fill-emerald-500";
  return "fill-amber-500";
}

function layoutGraph(data: GraphData) {
  const width = 900;
  const height = 520;

  const cx = width / 2;
  const cy = height / 2;

  const categories = data.nodes.filter((n) => n.type === "category");
  const projects = data.nodes.filter((n) => n.type === "project");
  const blogs = data.nodes.filter((n) => n.type === "blog");

  const nodes: (GraphNode & { x: number; y: number })[] = [];

  function placeRing(
    list: GraphNode[],
    radius: number,
    startAngle = -Math.PI / 2,
  ) {
    list.forEach((node, i) => {
      const angle = startAngle + (Math.PI * 2 * i) / Math.max(list.length, 1);

      nodes.push({
        ...node,
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
      });
    });
  }

  // Categories on outer ring
  placeRing(categories, 220);

  // Projects on middle ring
  placeRing(projects, 120, 0);

  // Blogs near center
  placeRing(blogs, 60, Math.PI / 4);

  const positions = new Map(nodes.map((n) => [n.id, n]));

  return {
    width,
    height,
    nodes,
    edges: data.edges,
    positions,
  };
}

export function KnowledgeGraph({
  data,
  compact = false,
}: {
  data: GraphData;
  compact?: boolean;
}) {
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const graph = useMemo(() => layoutGraph(data), [data]);

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Network className="h-5 w-5 text-primary" /> Knowledge graph
            </CardTitle>
            <CardDescription>
              Auto-linked by categories and keyword overlap. Click a node to
              inspect it.
            </CardDescription>
          </div>
          <Badge variant="outline">{graph.nodes.length} nodes</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="overflow-hidden rounded-xl border bg-background">
          <svg
            viewBox={`0 0 ${graph.width} ${graph.height}`}
            className={compact ? "h-[340px] w-full" : "h-[520px] w-full"}
            role="img"
          >
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
              <g
                key={node.id}
                className="cursor-pointer"
                onClick={() => setSelected(node)}
              >
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={node.type === "category" ? 15 : 20}
                  className={nodeColor(node.type)}
                  opacity="0.92"
                />
                <text
                  x={node.x}
                  y={node.y + 33}
                  textAnchor="middle"
                  className="graph-label fill-foreground text-[13px] font-semibold"
                >
                  {node.label.length > 18
                    ? `${node.label.slice(0, 18)}…`
                    : node.label}
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
              <p className="mt-2 text-sm text-muted-foreground">
                {selected.description || "No description yet."}
              </p>
              {selected.type !== "category" ? (
                <Link
                  href={nodePath(selected)}
                  className="mt-4 inline-flex text-sm font-medium text-primary hover:underline"
                >
                  Open detail
                </Link>
              ) : null}
            </div>
          ) : (
            <div>
              <h3 className="font-semibold">Explore connections</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Categories connect posts and projects. Keyword overlap creates
                extra edges, making the portfolio easier to explore.
              </p>
            </div>
          )}
        </aside>
      </CardContent>
    </Card>
  );
}
