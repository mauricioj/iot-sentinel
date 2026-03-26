'use client';

import { useEffect, useState, useCallback, memo } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Router } from 'lucide-react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
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
import { groupsService } from '@/services/groups.service';
import { useThingTypes } from '@/contexts/thing-types-context';
import { getIconComponent } from '@/components/ui/icon-picker';
import { Local, Network as NetworkType, Thing, Group } from '@/types';

// ---------- Status colors ----------

const STATUS_COLORS: Record<string, { border: string; dot: string; hex: string }> = {
  online: { border: 'border-green-500', dot: 'bg-green-500', hex: '#22c55e' },
  offline: { border: 'border-red-500', dot: 'bg-red-500', hex: '#ef4444' },
  discovered: { border: 'border-gray-400', dot: 'bg-gray-400', hex: '#9ca3af' },
  unknown: { border: 'border-gray-400', dot: 'bg-gray-400', hex: '#9ca3af' },
};

function getStatusInfo(status: string) {
  return STATUS_COLORS[status] ?? STATUS_COLORS.unknown;
}

// ---------- Custom Node Components ----------

const GatewayNode = memo(function GatewayNode({ data }: NodeProps) {
  const isReal = data.isRealDevice as boolean;
  const healthStatus = (data.healthStatus as string) || 'unknown';
  const statusInfo = getStatusInfo(healthStatus);
  const iconName = data.icon as string | undefined;
  const iconColor = data.iconColor as string | undefined;

  const IconComp = iconName ? getIconComponent(iconName) : Router;

  return (
    <div
      className={`flex flex-col items-center gap-1.5 rounded-xl border-2 ${isReal ? statusInfo.border : 'border-indigo-500'} bg-card px-5 py-3 shadow-lg min-w-[160px] cursor-pointer hover:shadow-xl transition-shadow`}
    >
      <Handle type="target" position={Position.Top} className="!bg-transparent !border-0 !w-0 !h-0" />
      <div
        className="flex h-10 w-10 items-center justify-center rounded-full"
        style={{ backgroundColor: iconColor ? `${iconColor}20` : 'rgba(99,102,241,0.1)' }}
      >
        <IconComp className="h-6 w-6" style={{ color: iconColor || '#6366f1' }} />
      </div>
      <p className="text-sm font-bold text-foreground text-center">{String(data.label)}</p>
      <p className="text-xs text-muted-foreground">{String(data.ip)}</p>
      {isReal && (
        <div className="flex items-center gap-1">
          <span className={`h-2 w-2 rounded-full ${statusInfo.dot}`} />
          <span className="text-xs text-muted-foreground capitalize">{healthStatus}</span>
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-transparent !border-0 !w-0 !h-0" />
    </div>
  );
});

const ThingNode = memo(function ThingNode({ data }: NodeProps) {
  const healthStatus = (data.healthStatus as string) || 'unknown';
  const regStatus = (data.registrationStatus as string) || 'registered';
  const statusInfo = getStatusInfo(healthStatus);
  const groupColor = data.groupColor as string | undefined;
  const iconName = data.icon as string;
  const iconColor = data.iconColor as string | undefined;
  const isDiscovered = regStatus === 'discovered';

  const IconComp = getIconComponent(iconName || 'box');

  return (
    <div
      className={`flex items-center gap-2 rounded-md border-2 ${statusInfo.border} bg-card px-3 py-2 shadow-sm min-w-[140px] cursor-pointer hover:shadow-md transition-shadow`}
      style={{
        borderStyle: isDiscovered ? 'dashed' : 'solid',
        borderLeftColor: groupColor || undefined,
        borderLeftWidth: groupColor ? '4px' : undefined,
      }}
    >
      <Handle type="target" position={Position.Top} className="!bg-transparent !border-0 !w-0 !h-0" />
      <div className="shrink-0">
        <IconComp className="h-4 w-4" style={{ color: iconColor || '#9ca3af' }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-foreground truncate">{String(data.label)}</p>
        <p className="text-[10px] text-muted-foreground truncate">{String(data.ip)}</p>
        <div className="flex items-center gap-1 mt-0.5">
          <span className={`h-2 w-2 rounded-full ${statusInfo.dot}`} />
          <span className="text-[10px] text-muted-foreground capitalize">{healthStatus}</span>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-transparent !border-0 !w-0 !h-0" />
    </div>
  );
});

const NetworkContainerNode = memo(function NetworkContainerNode({ data }: NodeProps) {
  return (
    <div className="px-4 py-2 rounded-lg border border-dashed border-border/50 bg-card/30">
      <p className="text-sm font-semibold text-muted-foreground">{String(data.label)}</p>
      {data.cidr ? (
        <p className="text-xs text-muted-foreground/60">{String(data.cidr)}</p>
      ) : null}
    </div>
  );
});

const LocalLabelNode = memo(function LocalLabelNode({ data }: NodeProps) {
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
});

const nodeTypes: NodeTypes = {
  gateway: GatewayNode,
  thing: ThingNode,
  networkContainer: NetworkContainerNode,
  localLabel: LocalLabelNode,
};

// ---------- Graph builder ----------

interface GraphData {
  nodes: Node[];
  edges: Edge[];
}

interface ThingTypeInfo {
  icon: string;
  color: string;
}

function buildGraph(
  locals: Local[],
  networksByLocal: Record<string, NetworkType[]>,
  thingsByNetwork: Record<string, Thing[]>,
  groups: Group[],
  thingTypeMap: Record<string, ThingTypeInfo>,
): GraphData {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const groupMap = new Map(groups.map((g) => [g._id, g]));

  let localXOffset = 0;

  for (const local of locals) {
    const networks = networksByLocal[local._id] ?? [];

    // Local label node positioned above all its networks
    nodes.push({
      id: `local-${local._id}`,
      type: 'localLabel',
      position: { x: localXOffset, y: -80 },
      data: { label: local.name },
    });

    let networkYOffset = 0;

    for (const network of networks) {
      const things = thingsByNetwork[network._id] ?? [];

      // Separate gateway thing from other things
      const gatewayThing = things.find((t) => t.ipAddress === network.gateway);
      const otherThings = things.filter((t) => t._id !== gatewayThing?._id);

      const count = otherThings.length;
      const radius = count > 0 ? Math.max(150, Math.min(300, count * 45)) : 100;
      const areaSize = radius * 2 + 200;

      const cx = localXOffset + areaSize / 2;
      const cy = networkYOffset + areaSize / 2;

      // Network container label (top-left of area)
      nodes.push({
        id: `net-label-${network._id}`,
        type: 'networkContainer',
        position: { x: localXOffset + 10, y: networkYOffset + 10 },
        data: { label: network.name, cidr: network.cidr || '' },
      });

      // Gateway node
      const gwNodeId = `gw-${network._id}`;
      if (gatewayThing) {
        const ttInfo = thingTypeMap[gatewayThing.type];
        nodes.push({
          id: gwNodeId,
          type: 'gateway',
          position: { x: cx - 80, y: cy - 40 },
          sourcePosition: Position.Bottom,
          targetPosition: Position.Top,
          data: {
            label: gatewayThing.name,
            ip: gatewayThing.ipAddress,
            isRealDevice: true,
            thingId: gatewayThing._id,
            healthStatus: gatewayThing.healthStatus,
            icon: ttInfo?.icon,
            iconColor: ttInfo?.color,
          },
        });
      } else {
        nodes.push({
          id: gwNodeId,
          type: 'gateway',
          position: { x: cx - 80, y: cy - 40 },
          sourcePosition: Position.Bottom,
          targetPosition: Position.Top,
          data: {
            label: 'Gateway',
            ip: network.gateway || 'N/A',
            isRealDevice: false,
          },
        });
      }

      // Things radially around gateway
      otherThings.forEach((thing, i) => {
        const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
        const tx = cx + radius * Math.cos(angle) - 70;
        const ty = cy + radius * Math.sin(angle) - 20;

        const ttInfo = thingTypeMap[thing.type];
        const firstGroupId = thing.groupIds?.[0];
        const firstGroup = firstGroupId ? groupMap.get(firstGroupId) : undefined;

        const healthStatus = thing.registrationStatus === 'discovered' ? 'unknown' : thing.healthStatus;

        nodes.push({
          id: `thing-${thing._id}`,
          type: 'thing',
          position: { x: tx, y: ty },
          sourcePosition: Position.Bottom,
          targetPosition: Position.Top,
          data: {
            label: thing.name,
            ip: thing.ipAddress,
            thingId: thing._id,
            healthStatus,
            registrationStatus: thing.registrationStatus,
            icon: ttInfo?.icon || 'box',
            iconColor: ttInfo?.color,
            groupColor: firstGroup?.color,
          },
        });

        // Edge from gateway to thing
        const isOnline = healthStatus === 'online';
        edges.push({
          id: `e-${gwNodeId}-${thing._id}`,
          source: gwNodeId,
          target: `thing-${thing._id}`,
          animated: isOnline,
          style: {
            stroke: isOnline ? '#22c55e' : '#6b7280',
            strokeDasharray: isOnline ? undefined : '5 5',
          },
        });
      });

      networkYOffset += areaSize + 500;
    }

    // Advance horizontal offset for next local
    const maxNetworkWidth = (networks.length > 0)
      ? Math.max(...networks.map((n) => {
          const count = (thingsByNetwork[n._id] ?? []).length;
          const r = count > 0 ? Math.max(150, Math.min(300, count * 45)) : 100;
          return r * 2 + 200;
        }))
      : 400;

    localXOffset += maxNetworkWidth + 800;
  }

  return { nodes, edges };
}

// ---------- Page ----------

export default function MapPage() {
  const router = useRouter();
  const { thingTypes } = useThingTypes();
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

      const [groupsRes] = await Promise.all([
        groupsService.findAll(1, 100),
      ]);
      const groups = groupsRes.data;

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

      // Build thing type map from context
      const thingTypeMap: Record<string, ThingTypeInfo> = {};
      for (const tt of thingTypes) {
        thingTypeMap[tt.slug] = { icon: tt.icon, color: tt.color };
      }

      setGraphData(buildGraph(locals, networksByLocal, thingsByNetwork, groups, thingTypeMap));
    } catch (err) {
      console.error('Failed to fetch map data:', err);
    } finally {
      setLoading(false);
    }
  }, [thingTypes]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const thingId = node.data?.thingId;
      if (typeof thingId === 'string') {
        router.push(`/things/${thingId}`);
      }
    },
    [router],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm">Loading network map...</p>
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
          fitViewOptions={{ padding: 0.3 }}
          minZoom={0.1}
          maxZoom={2}
        >
          <Background />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              if (node.type === 'gateway') return '#6366f1';
              if (node.type === 'networkContainer' || node.type === 'localLabel') return 'transparent';
              const hs = node.data?.healthStatus as string | undefined;
              if (hs === 'online') return '#22c55e';
              if (hs === 'offline') return '#ef4444';
              return '#9ca3af';
            }}
            maskColor="rgba(0,0,0,0.05)"
          />
        </ReactFlow>
      </div>
    </div>
  );
}
