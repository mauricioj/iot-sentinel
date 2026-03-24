'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Network, Box } from 'lucide-react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type NodeTypes,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { EmptyState } from '@/components/ui/empty-state';
import { localsService } from '@/services/locals.service';
import { networksService } from '@/services/networks.service';
import { thingsService } from '@/services/things.service';
import { Local, Network as NetworkType, Thing } from '@/types';

// ---------- Custom Node Components ----------

function LocalNode({ data }: NodeProps) {
  return (
    <div className="flex items-center gap-2 rounded-xl border-2 border-primary bg-card px-5 py-3 shadow-md min-w-[180px]">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
        <MapPin className="h-5 w-5 text-primary" />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Local</p>
        <p className="text-sm font-bold text-foreground">{String(data.label)}</p>
      </div>
    </div>
  );
}

function NetworkNode({ data }: NodeProps) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 shadow min-w-[160px]">
      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-500/10">
        <Network className="h-4 w-4 text-blue-500" />
      </div>
      <div>
        <p className="text-xs font-medium text-foreground">{String(data.label)}</p>
        {data.cidr ? (
          <p className="text-xs text-muted-foreground">{String(data.cidr)}</p>
        ) : null}
      </div>
    </div>
  );
}

const STATUS_BORDER: Record<string, string> = {
  online: 'border-green-500',
  offline: 'border-red-500',
  discovered: 'border-blue-400',
  unknown: 'border-gray-400',
};

const STATUS_DOT: Record<string, string> = {
  online: 'bg-green-500',
  offline: 'bg-red-500',
  discovered: 'bg-blue-400',
  unknown: 'bg-gray-400',
};

function ThingNode({ data }: NodeProps) {
  const status = typeof data.status === 'string' ? data.status : 'unknown';
  const borderClass = STATUS_BORDER[status] ?? STATUS_BORDER.unknown;
  const dotClass = STATUS_DOT[status] ?? STATUS_DOT.unknown;

  return (
    <div
      className={`flex items-center gap-2 rounded-md border-2 ${borderClass} bg-card px-3 py-2 shadow-sm min-w-[140px] cursor-pointer hover:shadow-md transition-shadow`}
    >
      <Box className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <p className="text-xs font-medium text-foreground truncate">{String(data.label)}</p>
        <div className="flex items-center gap-1 mt-0.5">
          <span className={`h-2 w-2 rounded-full ${dotClass}`} />
          <span className="text-xs text-muted-foreground capitalize">{status}</span>
        </div>
      </div>
    </div>
  );
}

const nodeTypes: NodeTypes = {
  local: LocalNode,
  network: NetworkNode,
  thing: ThingNode,
};

// ---------- Layout helpers ----------

const LOCAL_Y = 0;
const NETWORK_Y = 200;
const THING_Y = 400;
const H_GAP = 220;

interface GraphData {
  nodes: Node[];
  edges: Edge[];
}

function buildGraph(
  locals: Local[],
  networksByLocal: Record<string, NetworkType[]>,
  thingsByNetwork: Record<string, Thing[]>,
): GraphData {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // First pass: collect all things per local to compute total width
  type Column = { local: Local; networks: { network: NetworkType; things: Thing[] }[] };
  const columns: Column[] = locals.map((local) => ({
    local,
    networks: (networksByLocal[local._id] ?? []).map((network) => ({
      network,
      things: thingsByNetwork[network._id] ?? [],
    })),
  }));

  let localXOffset = 0;

  for (const col of columns) {
    const { local, networks } = col;

    // Calculate the total horizontal span needed by this local's things/networks
    const thingCounts = networks.map((n) => Math.max(n.things.length, 1));
    const localWidth = Math.max(thingCounts.reduce((a, b) => a + b, 0), 1) * H_GAP;
    const localX = localXOffset + localWidth / 2 - H_GAP / 2;

    nodes.push({
      id: `local-${local._id}`,
      type: 'local',
      position: { x: localX, y: LOCAL_Y },
      data: { label: local.name },
    });

    let networkXOffset = localXOffset;

    for (const { network, things } of networks) {
      const networkSpan = Math.max(things.length, 1) * H_GAP;
      const networkX = networkXOffset + networkSpan / 2 - H_GAP / 2;

      nodes.push({
        id: `network-${network._id}`,
        type: 'network',
        position: { x: networkX, y: NETWORK_Y },
        data: { label: network.name, cidr: network.cidr ?? '' },
      });

      edges.push({
        id: `e-local-${local._id}-network-${network._id}`,
        source: `local-${local._id}`,
        target: `network-${network._id}`,
        animated: false,
        style: { stroke: 'var(--color-border)' },
      });

      things.forEach((thing, idx) => {
        const thingX = networkXOffset + idx * H_GAP;

        nodes.push({
          id: `thing-${thing._id}`,
          type: 'thing',
          position: { x: thingX, y: THING_Y },
          data: { label: thing.name, status: thing.status, thingId: thing._id },
        });

        edges.push({
          id: `e-network-${network._id}-thing-${thing._id}`,
          source: `network-${network._id}`,
          target: `thing-${thing._id}`,
          animated: false,
          style: { stroke: 'var(--color-border)' },
        });
      });

      networkXOffset += networkSpan;
    }

    localXOffset += localWidth;
  }

  return { nodes, edges };
}

// ---------- Page ----------

export default function MapPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [] });
  const [hasLocals, setHasLocals] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const localsRes = await localsService.findAll(1, 100);
      const locals = localsRes.data;

      if (locals.length === 0) {
        setHasLocals(false);
        setLoading(false);
        return;
      }

      const networksByLocal: Record<string, NetworkType[]> = {};
      await Promise.all(
        locals.map(async (local) => {
          const res = await networksService.findByLocal(local._id, 1, 100);
          networksByLocal[local._id] = res.data;
        }),
      );

      const allNetworks = Object.values(networksByLocal).flat();
      const thingsByNetwork: Record<string, Thing[]> = {};
      await Promise.all(
        allNetworks.map(async (network) => {
          const res = await thingsService.findAll({ networkId: network._id, page: '1', limit: '100' });
          thingsByNetwork[network._id] = res.data;
        }),
      );

      setGraphData(buildGraph(locals, networksByLocal, thingsByNetwork));
    } catch (err) {
      console.error('Failed to fetch map data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.type === 'thing' && typeof node.data.thingId === 'string') {
        router.push(`/things/${node.data.thingId}`);
      }
    },
    [router],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm">Loading network map…</p>
        </div>
      </div>
    );
  }

  if (!hasLocals) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Network Map</h1>
        <EmptyState
          icon={MapPin}
          title="No locals found"
          description="Add a local and configure networks to visualize the topology."
        />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Network Map</h1>
      <div className="rounded-lg border border-border overflow-hidden h-[calc(100vh-10rem)]">
        <ReactFlow
          nodes={graphData.nodes}
          edges={graphData.edges}
          nodeTypes={nodeTypes}
          onNodeClick={handleNodeClick}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.2}
          maxZoom={2}
        >
          <Background />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              if (node.type === 'local') return 'var(--color-primary)';
              if (node.type === 'network') return '#3b82f6';
              const status = typeof node.data?.status === 'string' ? node.data.status : 'unknown';
              return STATUS_DOT[status] ? '' : '#9ca3af';
            }}
            maskColor="rgba(0,0,0,0.05)"
          />
        </ReactFlow>
      </div>
    </div>
  );
}
