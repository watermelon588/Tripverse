import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import { GraphEdge as GraphEdgeType, GraphNode as GraphNodeType } from '../../types/trip';

interface GraphEdgeProps {
  edge: GraphEdgeType;
  sourceNode: GraphNodeType;
  targetNode: GraphNodeType;
  isSelected: boolean;
}

export const GraphEdge: React.FC<GraphEdgeProps> = ({
  edge,
  sourceNode,
  targetNode,
  isSelected,
}) => {
  const particleRef = useRef<THREE.Mesh>(null!);

  const startPos = useMemo<[number, number, number]>(
    () => sourceNode.position || [0, 0, 0],
    [sourceNode]
  );
  const endPos = useMemo<[number, number, number]>(
    () => targetNode.position || [0, 0, 0],
    [targetNode]
  );

  const midPos = useMemo<[number, number, number]>(() => [
    (startPos[0] + endPos[0]) / 2,
    (startPos[1] + endPos[1]) / 2 + 0.2,
    (startPos[2] + endPos[2]) / 2,
  ], [startPos, endPos]);

  // Particle flowing along edge
  useFrame((state) => {
    if (!particleRef.current) return;
    const t = (state.clock.getElapsedTime() * 0.6) % 1;
    const pX = startPos[0] + (endPos[0] - startPos[0]) * t;
    const pY = startPos[1] + (endPos[1] - startPos[1]) * t;
    const pZ = startPos[2] + (endPos[2] - startPos[2]) * t;
    particleRef.current.position.set(pX, pY, pZ);
  });

  const lineColor = isSelected ? '#a855f7' : '#475569';
  const lineWidth = isSelected ? 3 : 1.5;

  return (
    <group>
      {/* Edge Line */}
      <Line
        points={[startPos, endPos]}
        color={lineColor}
        lineWidth={lineWidth}
        transparent
        opacity={isSelected ? 0.9 : 0.45}
        dashed={false}
      />

      {/* Moving Energy Particle along edge */}
      <mesh ref={particleRef}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshBasicMaterial color={isSelected ? '#e9d5ff' : '#818cf8'} />
      </mesh>

      {/* Relationship Label Overlay */}
      <Html position={midPos} center distanceFactor={14} style={{ pointerEvents: 'none' }}>
        <div
          className={`px-2 py-0.5 rounded text-[9px] font-mono tracking-wider border backdrop-blur-sm shadow-sm transition-colors ${
            isSelected
              ? 'bg-purple-950/90 border-purple-500/80 text-purple-200'
              : 'bg-slate-900/70 border-slate-800 text-slate-400'
          }`}
        >
          {edge.relationship}
        </div>
      </Html>
    </group>
  );
};
