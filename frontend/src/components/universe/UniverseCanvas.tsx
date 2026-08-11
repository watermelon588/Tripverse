import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { GraphNode as GraphNodeType, GraphEdge as GraphEdgeType } from '../../types/trip';
import { GraphNode } from './GraphNode';
import { GraphEdge } from './GraphEdge';

interface UniverseCanvasProps {
  nodes: GraphNodeType[];
  edges: GraphEdgeType[];
  selectedNodeId: string | null;
  onSelectNode: (node: GraphNodeType | null) => void;
  onHoverNode: (node: GraphNodeType | null) => void;
}

export const UniverseCanvas: React.FC<UniverseCanvasProps> = ({
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
  onHoverNode,
}) => {
  const nodeMap = React.useMemo(() => {
    const map = new Map<string, GraphNodeType>();
    nodes.forEach((node) => map.set(node.id, node));
    return map;
  }, [nodes]);

  return (
    <div className="w-full h-full relative bg-slate-950">
      <Canvas
        camera={{ position: [0, 1.5, 9.5], fov: 50 }}
        onClick={() => onSelectNode(null)}
      >
        {/* Lighting setup */}
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 15, 10]} intensity={1.2} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#818cf8" />
        <pointLight position={[10, 10, 10]} intensity={0.8} color="#c084fc" />

        {/* Space environment background */}
        <Stars
          radius={80}
          depth={50}
          count={3500}
          factor={4}
          saturation={0}
          fade
          speed={0.8}
        />

        {/* Dynamic Edges */}
        {edges.map((edge) => {
          const sourceNode = nodeMap.get(edge.source);
          const targetNode = nodeMap.get(edge.target);
          if (!sourceNode || !targetNode) return null;

          const isEdgeSelected =
            selectedNodeId === edge.source || selectedNodeId === edge.target;

          return (
            <GraphEdge
              key={edge.id}
              edge={edge}
              sourceNode={sourceNode}
              targetNode={targetNode}
              isSelected={isEdgeSelected}
            />
          );
        })}

        {/* Dynamic Nodes */}
        {nodes.map((node) => (
          <GraphNode
            key={node.id}
            node={node}
            isSelected={node.id === selectedNodeId}
            onSelect={(selected) => onSelectNode(selected)}
            onHover={(hovered) => onHoverNode(hovered)}
          />
        ))}

        {/* Orbit Controls for Rotation, Zoom, Pan */}
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          rotateSpeed={0.8}
          zoomSpeed={1.0}
          panSpeed={0.8}
          minDistance={2.5}
          maxDistance={30}
        />
      </Canvas>
    </div>
  );
};
