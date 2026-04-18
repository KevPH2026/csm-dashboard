'use client';

import { useMemo, useState } from 'react';

interface SankeyPath {
  from: string;
  to: string;
  customerCount: number;
  avgDaysToCross: number;
  arpu: number;
}

interface SankeyDiagramProps {
  paths: SankeyPath[];
  entryDistribution: { aimi: number; ads: number; site: number };
}

const PRODUCT_COLORS: Record<string, string> = {
  AIMI: '#6366f1',
  广告: '#f59e0b',
  独立站: '#10b981',
};

const PRODUCT_LABELS: Record<string, string> = {
  AIMI: 'AIMI',
  广告: '广告',
  独立站: '独立站',
};

export default function SankeyDiagram({ paths, entryDistribution }: SankeyDiagramProps) {
  const SVG_WIDTH = 800;
  const SVG_HEIGHT = 400;
  const PADDING_LEFT = 120;
  const PADDING_RIGHT = 120;
  const PADDING_TOP = 50;
  const PADDING_BOTTOM = 30;
  const NODE_WIDTH = 18;
  const GAP_BETWEEN_NODES = 12;

  const leftProducts = ['AIMI', '广告', '独立站'];
  const rightProducts = ['AIMI', '广告', '独立站'];

  // Interactive state
  const [selectedPath, setSelectedPath] = useState<number | null>(null);
  const [hiddenProducts, setHiddenProducts] = useState<Set<string>>(new Set());
  const [hoveredPath, setHoveredPath] = useState<number | null>(null);
  const [filterProduct, setFilterProduct] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  const { leftNodes, rightNodes, flows, maxCustomerCount } = useMemo(() => {
    // Calculate left side (entry distribution)
    const totalEntry = entryDistribution.aimi + entryDistribution.ads + entryDistribution.site;
    const usableHeight = SVG_HEIGHT - PADDING_TOP - PADDING_BOTTOM - GAP_BETWEEN_NODES * (leftProducts.length - 1);

    const leftNodes = leftProducts.map((product) => {
      const key = product === 'AIMI' ? 'aimi' : product === '广告' ? 'ads' : 'site';
      const count = entryDistribution[key];
      const ratio = totalEntry > 0 ? count / totalEntry : 0;
      const height = Math.max(ratio * usableHeight, 20);
      return { product, count, height, y: 0, color: PRODUCT_COLORS[product] };
    });

    // Position left nodes
    let currentY = PADDING_TOP;
    for (const node of leftNodes) {
      node.y = currentY;
      currentY += node.height + GAP_BETWEEN_NODES;
    }

    // Calculate right side (sum of incoming paths per product)
    const rightTotals: Record<string, number> = {};
    for (const p of rightProducts) {
      rightTotals[p] = paths.filter(path => path.to === p).reduce((sum, path) => sum + path.customerCount, 0);
    }
    const totalRight = Object.values(rightTotals).reduce((s, v) => s + v, 0);

    const rightNodes = rightProducts.map((product) => {
      const count = rightTotals[product] || 0;
      const ratio = totalRight > 0 ? count / totalRight : 0;
      const height = Math.max(ratio * usableHeight, 20);
      return { product, count, height, y: 0, color: PRODUCT_COLORS[product] };
    });

    // Position right nodes
    currentY = PADDING_TOP;
    for (const node of rightNodes) {
      node.y = currentY;
      currentY += node.height + GAP_BETWEEN_NODES;
    }

    // Calculate flows
    const maxCustomerCount = Math.max(...paths.map(p => p.customerCount), 1);
    const leftX = PADDING_LEFT;
    const rightX = SVG_WIDTH - PADDING_RIGHT - NODE_WIDTH;

    const flows = paths.map(path => {
      const leftNode = leftNodes.find(n => n.product === path.from);
      const rightNode = rightNodes.find(n => n.product === path.to);
      if (!leftNode || !rightNode) return null;

      // Calculate proportional height within the node
      const leftTotalForProduct = paths
        .filter(p => p.from === path.from)
        .reduce((s, p) => s + p.customerCount, 0);
      const rightTotalForProduct = paths
        .filter(p => p.to === path.to)
        .reduce((s, p) => s + p.customerCount, 0);

      const flowHeightFromLeft = leftNode.height * (path.customerCount / Math.max(leftTotalForProduct, 1));
      const flowHeightFromRight = rightNode.height * (path.customerCount / Math.max(rightTotalForProduct, 1));

      return {
        from: path.from,
        to: path.to,
        customerCount: path.customerCount,
        avgDaysToCross: path.avgDaysToCross,
        arpu: path.arpu,
        leftX,
        rightX,
        leftY: leftNode.y,
        rightY: rightNode.y,
        flowHeightFromLeft,
        flowHeightFromRight,
        color: PRODUCT_COLORS[path.from],
      };
    }).filter(Boolean) as Array<{
      from: string; to: string; customerCount: number; avgDaysToCross: number; arpu: number;
      leftX: number; rightX: number; leftY: number; rightY: number;
      flowHeightFromLeft: number; flowHeightFromRight: number; color: string;
    }>;

    // Track offsets for each node's used area
    const leftOffsets: Record<string, number> = {};
    const rightOffsets: Record<string, number> = {};
    for (const p of leftProducts) leftOffsets[p] = 0;
    for (const p of rightProducts) rightOffsets[p] = 0;

    for (const flow of flows) {
      flow.leftY = (leftNodes.find(n => n.product === flow.from)?.y || 0) + leftOffsets[flow.from];
      flow.rightY = (rightNodes.find(n => n.product === flow.to)?.y || 0) + rightOffsets[flow.to];
      leftOffsets[flow.from] += flow.flowHeightFromLeft;
      rightOffsets[flow.to] += flow.flowHeightFromRight;
    }

    return { leftNodes, rightNodes, flows, maxCustomerCount };
  }, [paths, entryDistribution]);

  const leftX = PADDING_LEFT;
  const rightX = SVG_WIDTH - PADDING_RIGHT - NODE_WIDTH;

  // Generate a smooth cubic bezier path for each flow
  const generateFlowPath = (
    lx: number, ly: number, lh: number,
    rx: number, ry: number, rh: number
  ) => {
    const midX = (lx + NODE_WIDTH + rx) / 2;
    return `M ${lx + NODE_WIDTH} ${ly}
            C ${midX} ${ly}, ${midX} ${ry}, ${rx} ${ry}
            L ${rx} ${ry + rh}
            C ${midX} ${ry + rh}, ${midX} ${ly + lh}, ${lx + NODE_WIDTH} ${ly + lh}
            Z`;
  };

  // Path visibility logic
  const isPathVisible = (flow: typeof flows[number]) => {
    // If the entry product is hidden by legend
    if (hiddenProducts.has(flow.from)) return false;
    // If filtered by filter bar
    if (filterProduct && flow.from !== filterProduct) return false;
    return true;
  };

  const getPathOpacity = (flow: typeof flows[number], index: number) => {
    if (!isPathVisible(flow)) return { fill: 0, stroke: 0, strokeWidth: 0.5 };
    if (selectedPath !== null) {
      if (index === selectedPath) return { fill: 0.5, stroke: 0.8, strokeWidth: 2 };
      return { fill: 0.05, stroke: 0.1, strokeWidth: 0.5 };
    }
    if (hoveredPath === index) return { fill: 0.35, stroke: 0.5, strokeWidth: 1.5 };
    return { fill: 0.18, stroke: 0.3, strokeWidth: 0.5 };
  };

  // Legend toggle
  const toggleProduct = (product: string) => {
    setHiddenProducts(prev => {
      const next = new Set(prev);
      if (next.has(product)) next.delete(product);
      else next.add(product);
      return next;
    });
  };

  // Flow click handler
  const handleFlowClick = (index: number) => {
    setSelectedPath(prev => prev === index ? null : index);
  };

  // Flow hover handlers
  const handleFlowMouseMove = (e: React.MouseEvent, flow: typeof flows[number], index: number) => {
    setHoveredPath(index);
    const rect = (e.currentTarget as HTMLElement).closest('.sankey-container')?.getBoundingClientRect();
    if (rect) {
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    } else {
      setMousePos({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY });
    }
  };

  const handleFlowMouseLeave = () => {
    setHoveredPath(null);
    setMousePos(null);
  };

  // Filter button click
  const handleFilterClick = (product: string | null) => {
    setFilterProduct(product);
    setSelectedPath(null);
  };

  // Tooltip content for hovered path
  const hoveredFlowData = hoveredPath !== null ? flows[hoveredPath] : null;

  return (
    <div className="w-full sankey-container relative" style={{ minHeight: 400 }}>
      <svg
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        className="w-full"
        style={{ maxHeight: 450 }}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Column Headers */}
        <text x={PADDING_LEFT - 10} y={30} textAnchor="end" fontSize={13} fontWeight="600" fill="#475569">入口产品</text>
        <text x={SVG_WIDTH - PADDING_RIGHT + 10 + NODE_WIDTH} y={30} textAnchor="start" fontSize={13} fontWeight="600" fill="#475569">扩展产品</text>

        {/* Flows (drawn first, behind nodes) */}
        {flows.map((flow, i) => {
          const opacity = getPathOpacity(flow, i);
          const visible = isPathVisible(flow);
          return (
            <g key={i}>
              <path
                d={generateFlowPath(
                  flow.leftX, flow.leftY, flow.flowHeightFromLeft,
                  flow.rightX, flow.rightY, flow.flowHeightFromRight
                )}
                fill={flow.color}
                fillOpacity={opacity.fill}
                stroke={flow.color}
                strokeWidth={opacity.strokeWidth}
                strokeOpacity={opacity.stroke}
                style={{
                  cursor: visible ? 'pointer' : 'default',
                  pointerEvents: visible ? 'auto' : 'none',
                  transition: 'fill-opacity 0.2s ease, stroke-opacity 0.2s ease, stroke-width 0.2s ease',
                }}
                onClick={() => handleFlowClick(i)}
                onMouseMove={(e) => handleFlowMouseMove(e, flow, i)}
                onMouseLeave={handleFlowMouseLeave}
              />
              {/* Flow label - positioned at the midpoint */}
              {flow.customerCount >= 10 && opacity.fill > 0.05 && (
                <text
                  x={(flow.leftX + NODE_WIDTH + flow.rightX) / 2}
                  y={(flow.leftY + flow.flowHeightFromLeft / 2 + flow.rightY + flow.flowHeightFromRight / 2) / 2}
                  textAnchor="middle"
                  fontSize={9}
                  fill={flow.color}
                  fontWeight="600"
                  opacity={opacity.fill > 0.3 ? 1 : 0.7}
                  style={{ pointerEvents: 'none' }}
                >
                  {flow.customerCount}人 · {flow.avgDaysToCross}天
                </text>
              )}
            </g>
          );
        })}

        {/* Left Nodes */}
        {leftNodes.map((node, i) => (
          <g key={`left-${i}`}>
            <rect
              x={leftX}
              y={node.y}
              width={NODE_WIDTH}
              height={node.height}
              rx={4}
              fill={node.color}
              fillOpacity={0.85}
            />
            <text
              x={leftX - 8}
              y={node.y + node.height / 2}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={12}
              fontWeight="600"
              fill={node.color}
            >
              {PRODUCT_LABELS[node.product]}
            </text>
            <text
              x={leftX - 8}
              y={node.y + node.height / 2 + 14}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={9}
              fill="#94a3b8"
            >
              {node.count}人
            </text>
          </g>
        ))}

        {/* Right Nodes */}
        {rightNodes.map((node, i) => (
          <g key={`right-${i}`}>
            <rect
              x={rightX}
              y={node.y}
              width={NODE_WIDTH}
              height={node.height}
              rx={4}
              fill={node.color}
              fillOpacity={0.85}
            />
            <text
              x={rightX + NODE_WIDTH + 8}
              y={node.y + node.height / 2}
              textAnchor="start"
              dominantBaseline="middle"
              fontSize={12}
              fontWeight="600"
              fill={node.color}
            >
              {PRODUCT_LABELS[node.product]}
            </text>
            <text
              x={rightX + NODE_WIDTH + 8}
              y={node.y + node.height / 2 + 14}
              textAnchor="start"
              dominantBaseline="middle"
              fontSize={9}
              fill="#94a3b8"
            >
              {node.count}人
            </text>
          </g>
        ))}

        {/* Legend - clickable */}
        <g transform={`translate(${SVG_WIDTH / 2 - 150}, ${SVG_HEIGHT - 18})`}>
          {Object.entries(PRODUCT_COLORS).map(([name, color], i) => {
            const isHidden = hiddenProducts.has(name);
            return (
              <g
                key={name}
                transform={`translate(${i * 110}, 0)`}
                style={{ cursor: 'pointer' }}
                onClick={() => toggleProduct(name)}
              >
                <rect
                  x={0}
                  y={-6}
                  width={12}
                  height={12}
                  rx={2}
                  fill={isHidden ? '#94a3b8' : color}
                  fillOpacity={isHidden ? 0.4 : 0.7}
                />
                <text
                  x={16}
                  y={4}
                  fontSize={10}
                  fill={isHidden ? '#94a3b8' : '#64748b'}
                  textDecoration={isHidden ? 'line-through' : 'none'}
                >
                  {PRODUCT_LABELS[name]}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Tooltip */}
      {hoveredFlowData && mousePos && (
        <div
          style={{
            position: 'absolute',
            left: mousePos.x + 12,
            top: mousePos.y - 10,
            pointerEvents: 'none',
            zIndex: 50,
            backgroundColor: '#1e293b',
            color: '#f8fafc',
            padding: '8px 12px',
            borderRadius: 8,
            fontSize: 12,
            lineHeight: 1.6,
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            whiteSpace: 'nowrap',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4 }}>
            路径：{hoveredFlowData.from} → {hoveredFlowData.to}
          </div>
          <div>客户数：{hoveredFlowData.customerCount}人</div>
          <div>平均扩展天数：{hoveredFlowData.avgDaysToCross}天</div>
          <div>ARPU：¥{hoveredFlowData.arpu}</div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
        <button
          onClick={() => handleFilterClick(null)}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            filterProduct === null
              ? 'bg-slate-800 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          全部
        </button>
        {leftProducts.map((product) => (
          <button
            key={product}
            onClick={() => handleFilterClick(product)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              filterProduct === product
                ? 'text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            style={filterProduct === product ? { backgroundColor: PRODUCT_COLORS[product] } : undefined}
          >
            仅{PRODUCT_LABELS[product]}入口
          </button>
        ))}
      </div>
    </div>
  );
}
