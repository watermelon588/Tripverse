import React from 'react';
import { motion } from 'framer-motion';
import { X, MapPin, Compass, DollarSign, Clock, ArrowRight } from 'lucide-react';
import { GraphNode, GraphEdge } from '../../types/trip';

interface NodeDetailsProps {
  node: GraphNode;
  edges: GraphEdge[];
  nodes: GraphNode[];
  onClose: () => void;
  onSelectNode: (node: GraphNode) => void;
}

export const NodeDetails: React.FC<NodeDetailsProps> = ({
  node,
  edges,
  nodes,
  onClose,
  onSelectNode,
}) => {
  const nodeMap = React.useMemo(() => {
    const map = new Map<string, GraphNode>();
    nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [nodes]);

  // Connected edges
  const connectedEdges = edges.filter(
    (e) => e.source === node.id || e.target === node.id
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: 50, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 50, scale: 0.95 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="absolute top-20 right-6 z-20 w-80 sm:w-96 glass-panel rounded-2xl p-6 text-slate-100 shadow-2xl overflow-hidden backdrop-blur-xl border border-slate-700/60"
    >
      {/* Header */}
      <div className="flex items-start justify-between pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono tracking-wider bg-indigo-900/60 border border-indigo-500/40 text-indigo-300 uppercase">
              {node.type}
            </span>
            {node.position && (
              <span className="text-[10px] font-mono text-slate-400">
                [{node.position.map((p) => p.toFixed(1)).join(', ')}]
              </span>
            )}
          </div>
          <h3 className="text-2xl font-bold mt-1 text-white tracking-tight flex items-center gap-2">
            <MapPin className="w-5 h-5 text-indigo-400" />
            {node.name}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Close panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body Description */}
      <div className="py-4 space-y-3">
        <p className="text-sm text-slate-300 leading-relaxed">
          {node.description || 'No detailed description available for this spatial node.'}
        </p>

        {/* Connections List */}
        {connectedEdges.length > 0 && (
          <div className="pt-2">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-indigo-400" />
              Connected Spatial Relationships ({connectedEdges.length})
            </h4>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {connectedEdges.map((edge) => {
                const isSource = edge.source === node.id;
                const otherNodeId = isSource ? edge.target : edge.source;
                const otherNode = nodeMap.get(otherNodeId);

                if (!otherNode) return null;

                return (
                  <div
                    key={edge.id}
                    onClick={() => onSelectNode(otherNode)}
                    className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/80 transition-all cursor-pointer group flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200 group-hover:text-indigo-300">
                        <span>{isSource ? '→' : '←'}</span>
                        <span>{otherNode.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          ({otherNode.type})
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400 font-mono">
                        <span className="text-purple-400">{edge.relationship}</span>
                        {edge.cost !== undefined && edge.cost > 0 && (
                          <span className="flex items-center gap-0.5 text-emerald-400">
                            <DollarSign className="w-3 h-3" />
                            ₹{edge.cost.toLocaleString()}
                          </span>
                        )}
                        {edge.duration !== undefined && edge.duration > 0 && (
                          <span className="flex items-center gap-0.5 text-amber-400">
                            <Clock className="w-3 h-3" />
                            {edge.duration}h
                          </span>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
        <span>Node ID: <code className="font-mono text-indigo-300">{node.id}</code></span>
        <span className="text-emerald-400 font-semibold">Active Graph Node</span>
      </div>
    </motion.div>
  );
};
