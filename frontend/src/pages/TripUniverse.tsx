import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RefreshCw, Layers, Server, AlertTriangle, Sparkles } from 'lucide-react';
import { Trip, GraphNode } from '../types/trip';
import { UniverseCanvas } from '../components/universe/UniverseCanvas';
import { NodeDetails } from '../components/universe/NodeDetails';

interface TripUniverseProps {
  tripData: Trip;
  isBackendConnected: boolean;
  onBackToForm: () => void;
  onRefreshData: () => void;
  isLoading: boolean;
}

export const TripUniverse: React.FC<TripUniverseProps> = ({
  tripData,
  isBackendConnected,
  onBackToForm,
  onRefreshData,
  isLoading,
}) => {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);

  return (
    <div className="w-screen h-screen relative overflow-hidden bg-slate-950 select-none">
      {/* 3D Canvas Scene */}
      <UniverseCanvas
        nodes={tripData.nodes}
        edges={tripData.edges}
        selectedNodeId={selectedNode?.id || null}
        onSelectNode={(node) => setSelectedNode(node)}
        onHoverNode={(node) => setHoveredNode(node)}
      />

      {/* Top Floating Header Controls */}
      <div className="absolute top-6 left-6 right-6 z-20 flex items-center justify-between pointer-events-none">
        {/* Left Action & Title */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <button
            onClick={onBackToForm}
            className="p-2.5 rounded-2xl glass-panel text-slate-300 hover:text-white hover:border-slate-500 transition-all flex items-center gap-2 group shadow-lg"
            title="Back to Create Trip"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-sm font-semibold hidden sm:inline">New Trip</span>
          </button>

          <div className="glass-panel px-4 py-2 rounded-2xl shadow-lg border border-slate-700/60 flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping" />
            <div>
              <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                <span>{tripData.destination} Trip Universe</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 font-mono">
                  {tripData.days} Days
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">
                Budget: ₹{tripData.budget.toLocaleString()} • {tripData.nodes.length} Spatial Nodes
              </p>
            </div>
          </div>
        </div>

        {/* Right Status & Refresh */}
        <div className="flex items-center gap-3 pointer-events-auto">
          {/* Backend Connection Indicator Pill */}
          <div
            className={`px-3 py-1.5 rounded-xl border text-xs font-mono flex items-center gap-2 backdrop-blur-md shadow-md ${
              isBackendConnected
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                : 'bg-amber-950/80 border-amber-500/50 text-amber-300'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span className="hidden md:inline">
              {isBackendConnected ? 'FastAPI Connected' : 'Demo Fallback'}
            </span>
          </div>

          <button
            onClick={onRefreshData}
            disabled={isLoading}
            className="p-2.5 rounded-2xl glass-panel text-slate-300 hover:text-white hover:border-slate-500 transition-all shadow-lg disabled:opacity-50"
            title="Refresh graph from FastAPI"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Hovered Node Bottom Tooltip */}
      <AnimatePresence>
        {hoveredNode && !selectedNode && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 glass-panel px-4 py-2 rounded-full border border-slate-700/80 text-xs text-slate-200 shadow-xl flex items-center gap-2 pointer-events-none"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Click to explore <strong>{hoveredNode.name}</strong> ({hoveredNode.type})</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected Node Details Drawer */}
      <AnimatePresence>
        {selectedNode && (
          <NodeDetails
            node={selectedNode}
            edges={tripData.edges}
            nodes={tripData.nodes}
            onClose={() => setSelectedNode(null)}
            onSelectNode={(node) => setSelectedNode(node)}
          />
        )}
      </AnimatePresence>

      {/* Bottom Floating Navigation Hints */}
      <div className="absolute bottom-6 left-6 z-10 hidden sm:flex items-center gap-3 text-[11px] text-slate-400 font-mono glass-panel px-3.5 py-1.5 rounded-xl border border-slate-800 pointer-events-none">
        <Layers className="w-3.5 h-3.5 text-indigo-400" />
        <span>Rotate: Left Drag • Pan: Right Drag • Zoom: Scroll</span>
      </div>
    </div>
  );
};
