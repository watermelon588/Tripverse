import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { GraphNode as GraphNodeType, NodeType } from '../../types/trip';

interface GraphNodeProps {
  node: GraphNodeType;
  isSelected: boolean;
  onSelect: (node: GraphNodeType) => void;
  onHover: (node: GraphNodeType | null) => void;
}

const TYPE_COLORS: Record<NodeType, { color: string; emissive: string; ring: string }> = {
  COUNTRY: { color: '#a855f7', emissive: '#6b21a8', ring: '#d8b4fe' },
  CITY: { color: '#06b6d4', emissive: '#0e7490', ring: '#67e8f9' },
  NEIGHBORHOOD: { color: '#3b82f6', emissive: '#1d4ed8', ring: '#93c5fd' },
  ATTRACTION: { color: '#f59e0b', emissive: '#b45309', ring: '#fde68a' },
  RESTAURANT: { color: '#10b981', emissive: '#047857', ring: '#6ee7b7' },
  ACTIVITY: { color: '#ec4899', emissive: '#be185d', ring: '#fbcfe8' },
  HOTEL: { color: '#8b5cf6', emissive: '#5b21b6', ring: '#c4b5fd' },
  TRANSPORT: { color: '#64748b', emissive: '#334155', ring: '#cbd5e1' },
};

const TYPE_SIZES: Record<NodeType, number> = {
  COUNTRY: 0.7,
  CITY: 0.5,
  NEIGHBORHOOD: 0.4,
  ATTRACTION: 0.35,
  RESTAURANT: 0.35,
  ACTIVITY: 0.35,
  HOTEL: 0.35,
  TRANSPORT: 0.3,
};

export const GraphNode: React.FC<GraphNodeProps> = ({
  node,
  isSelected,
  onSelect,
  onHover,
}) => {
  const meshRef = useRef<THREE.Mesh>(null!);
  const ringRef = useRef<THREE.Mesh>(null!);
  const [hovered, setHovered] = useState(false);

  const position: [number, number, number] = node.position || [0, 0, 0];
  const typeStyle = TYPE_COLORS[node.type] || TYPE_COLORS.COUNTRY;
  const baseSize = TYPE_SIZES[node.type] || 0.4;

  // Gentle float & pulse animation
  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();
    
    // Slight vertical float oscillation
    meshRef.current.position.y = position[1] + Math.sin(t * 1.5 + position[0]) * 0.08;
    
    if (ringRef.current) {
      ringRef.current.position.y = meshRef.current.position.y;
      ringRef.current.rotation.z = t * 0.5;
    }

    // Scale animation on hover/selection
    const targetScale = isSelected ? 1.35 : hovered ? 1.2 : 1.0;
    meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
  });

  return (
    <group>
      {/* Outer orbit ring for Country/City nodes */}
      {(node.type === 'COUNTRY' || node.type === 'CITY' || isSelected) && (
        <mesh ref={ringRef} position={position} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[baseSize * 1.4, baseSize * 1.55, 32]} />
          <meshBasicMaterial
            color={typeStyle.ring}
            side={THREE.DoubleSide}
            transparent
            opacity={isSelected ? 0.9 : 0.4}
          />
        </mesh>
      )}

      {/* Main 3D Node Mesh */}
      <mesh
        ref={meshRef}
        position={position}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(node);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          onHover(node);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          onHover(null);
          document.body.style.cursor = 'auto';
        }}
      >
        <sphereGeometry args={[baseSize, 32, 32]} />
        <meshStandardMaterial
          color={typeStyle.color}
          emissive={typeStyle.emissive}
          emissiveIntensity={isSelected ? 1.2 : hovered ? 0.9 : 0.5}
          roughness={0.2}
          metalness={0.8}
        />

        {/* Floating HTML Badge & Label */}
        <Html
          position={[0, baseSize + 0.35, 0]}
          center
          distanceFactor={12}
          style={{ pointerEvents: 'none', transition: 'all 0.2s ease' }}
        >
          <div
            className={`flex flex-col items-center px-3 py-1.5 rounded-full border whitespace-nowrap backdrop-blur-md shadow-lg transition-all duration-200 ${
              isSelected
                ? 'bg-indigo-950/90 border-indigo-400 text-white scale-110 shadow-indigo-500/50 glow-indigo'
                : hovered
                ? 'bg-slate-900/90 border-slate-400 text-slate-100 scale-105'
                : 'bg-slate-950/70 border-slate-800 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: typeStyle.color }}
              />
              <span className="font-semibold text-xs tracking-wide">
                {node.name}
              </span>
            </div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
              {node.type}
            </span>
          </div>
        </Html>
      </mesh>
    </group>
  );
};
