import React, { useRef, useState, useCallback, useEffect } from 'react';
import './GraphTraversalVisualizer.css';
import { Play, Pause, RotateCcw, Trash2, Plus, AlertCircle, CheckCircle, Settings } from 'lucide-react';

// Define types
interface Node {
  id: string;
  x: number;
  y: number;
  visited: boolean;
  current: boolean;
}

interface Edge {
  from: Node;
  to: Node;
  traversed: boolean;
}

interface Message {
  text: string;
  type: 'info' | 'success' | 'error';
}

const GraphTraversalVisualizer = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Graph state with proper typing
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [adjacencyList, setAdjacencyList] = useState<Record<string, string[]>>({});
  
  // Input state
  const [nodeInput, setNodeInput] = useState('');
  const [edgeFromInput, setEdgeFromInput] = useState('');
  const [edgeToInput, setEdgeToInput] = useState('');
  const [startNodeInput, setStartNodeInput] = useState('');
  
  // Traversal state
  const [isTraversing, setIsTraversing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState(5);
  const [traversalOrder, setTraversalOrder] = useState<string[]>([]);
  const [currentAlgorithm, setCurrentAlgorithm] = useState('');
  const [selectedAlgorithm, setSelectedAlgorithm] = useState('BFS');
  
  // UI state
  const [message, setMessage] = useState<Message>({ text: '', type: 'info' });
  const [graphBuilt, setGraphBuilt] = useState(false);

  // Canvas dimensions
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 500;
  const NODE_RADIUS = 30;

  // Show message to user
  const showMessage = (text: string, type: 'info' | 'success' | 'error' = 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: 'info' }), 3000);
  };

  // Add node
  const addNode = () => {
    const nodeId = nodeInput.trim().toUpperCase();
    if (!nodeId) {
      showMessage('Please enter a node name', 'error');
      return;
    }
    
    if (nodes.find(node => node.id === nodeId)) {
      showMessage('Node already exists', 'error');
      return;
    }

    const newNode: Node = {
      id: nodeId,
      x: Math.random() * (CANVAS_WIDTH - 100) + 50,
      y: Math.random() * (CANVAS_HEIGHT - 100) + 50,
      visited: false,
      current: false
    };

    setNodes(prev => [...prev, newNode]);
    setAdjacencyList(prev => ({ ...prev, [nodeId]: [] }));
    setNodeInput('');
    showMessage(`Node ${nodeId} added successfully`, 'success');
  };

  // Add edge
  const addEdge = () => {
    const from = edgeFromInput.trim().toUpperCase();
    const to = edgeToInput.trim().toUpperCase();
    
    if (!from || !to) {
      showMessage('Please enter both nodes for the edge', 'error');
      return;
    }
    
    if (from === to) {
      showMessage('Cannot create edge to the same node', 'error');
      return;
    }

    const fromNode = nodes.find(node => node.id === from);
    const toNode = nodes.find(node => node.id === to);
    
    if (!fromNode || !toNode) {
      showMessage('One or both nodes do not exist', 'error');
      return;
    }

    // Check if edge already exists
    const edgeExists = edges.some(edge => 
      (edge.from.id === from && edge.to.id === to) || 
      (edge.from.id === to && edge.to.id === from)
    );
    
    if (edgeExists) {
      showMessage('Edge already exists', 'error');
      return;
    }

    const newEdge: Edge = { from: fromNode, to: toNode, traversed: false };
    setEdges(prev => [...prev, newEdge]);
    
    // Update adjacency list (undirected graph)
    setAdjacencyList(prev => ({
      ...prev,
      [from]: [...(prev[from] || []), to],
      [to]: [...(prev[to] || []), from]
    }));
    
    setEdgeFromInput('');
    setEdgeToInput('');
    showMessage(`Edge ${from}-${to} added successfully`, 'success');
  };

  // Build graph for visualization
  const buildGraph = () => {
    if (nodes.length === 0) {
      showMessage('Please add at least one node', 'error');
      return;
    }
    setGraphBuilt(true);
    showMessage('Graph built successfully! You can now start traversal.', 'success');
  };

  // Clear all data
  const clearAll = () => {
    setNodes([]);
    setEdges([]);
    setAdjacencyList({});
    setTraversalOrder([]);
    setGraphBuilt(false);
    setIsTraversing(false);
    setStartNodeInput('');
    showMessage('Graph cleared', 'info');
  };

  // Calculate node positions in a circle for better visualization
  const arrangeNodes = () => {
    if (nodes.length === 0) return;
    
    const centerX = CANVAS_WIDTH / 2;
    const centerY = CANVAS_HEIGHT / 2;
    const radius = Math.min(centerX, centerY) - 80;
    
    const updatedNodes = nodes.map((node, index) => {
      const angle = (2 * Math.PI * index) / nodes.length;
      return {
        ...node,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      };
    });
    
    setNodes(updatedNodes);

    // Update edges to reference the new node objects
    setEdges(prevEdges =>
      prevEdges.map(edge => ({
        ...edge,
        from: updatedNodes.find(n => n.id === edge.from.id)!,
        to: updatedNodes.find(n => n.id === edge.to.id)!
      }))
    );

    showMessage('Nodes arranged in circle', 'success');
  };

  // Draw function
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw edges
    edges.forEach(edge => {
      ctx.beginPath();
      ctx.moveTo(edge.from.x, edge.from.y);
      ctx.lineTo(edge.to.x, edge.to.y);
      ctx.strokeStyle = edge.traversed ? '#4facfe' : '#666';
      ctx.lineWidth = edge.traversed ? 4 : 2;
      ctx.stroke();
      
      // Draw arrow for direction (optional - since it's undirected)
      const angle = Math.atan2(edge.to.y - edge.from.y, edge.to.x - edge.from.x);
      const arrowLength = 15;
      const arrowAngle = 0.3;
      
      const midX = (edge.from.x + edge.to.x) / 2;
      const midY = (edge.from.y + edge.to.y) / 2;
      
      ctx.beginPath();
      ctx.moveTo(midX, midY);
      ctx.lineTo(
        midX - arrowLength * Math.cos(angle - arrowAngle),
        midY - arrowLength * Math.sin(angle - arrowAngle)
      );
      ctx.moveTo(midX, midY);
      ctx.lineTo(
        midX - arrowLength * Math.cos(angle + arrowAngle),
        midY - arrowLength * Math.sin(angle + arrowAngle)
      );
      ctx.strokeStyle = edge.traversed ? '#4facfe' : '#666';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
    
    // Draw nodes
    nodes.forEach(node => {
      ctx.beginPath();
      ctx.arc(node.x, node.y, NODE_RADIUS, 0, 2 * Math.PI);
      
      if (node.current) {
        ctx.fillStyle = '#ff6b6b';
      } else if (node.visited) {
        ctx.fillStyle = '#51cf66';
      } else if (node.id === startNodeInput.toUpperCase()) {
        ctx.fillStyle = '#4facfe';
      } else {
        ctx.fillStyle = '#e9ecef';
      }
      
      ctx.fill();
      ctx.strokeStyle = '#495057';
      ctx.lineWidth = 3;
      ctx.stroke();
      
      // Draw node label
      ctx.fillStyle = '#000';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.id, node.x, node.y);
    });
  }, [nodes, edges, startNodeInput]);

  // Effect to redraw canvas
  useEffect(() => {
    draw();
  }, [draw]);

  // Sleep function
  const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

  // BFS Algorithm
  const bfsTraversal = async (startNode: string): Promise<string[]> => {
    const queue = [startNode];
    const visited = new Set<string>();
    const order: string[] = [];
    
    while (queue.length > 0 && !isPaused) {
      await new Promise<void>(resolve => {
        const checkPause = () => {
          if (!isPaused) {
            resolve();
          } else {
            setTimeout(checkPause, 100);
          }
        };
        checkPause();
      });
      
      const current = queue.shift()!;
      
      if (visited.has(current)) continue;
      
      visited.add(current);
      order.push(current);
      
      // Update node state
      setNodes(prev => prev.map(node => 
        node.id === current 
          ? { ...node, visited: true, current: true }
          : { ...node, current: false }
      ));
      
      setTraversalOrder([...order]);
      await sleep(1100 - speed * 100);
      
      // Remove current highlighting
      setNodes(prev => prev.map(node => 
        node.id === current ? { ...node, current: false } : node
      ));
      
      // Add neighbors to queue
      const neighbors = adjacencyList[current] || [];
      neighbors.forEach(neighbor => {
        if (!visited.has(neighbor)) {
          queue.push(neighbor);
        }
      });
    }
    return order;
  };

  // DFS Algorithm
  const dfsTraversal = async (startNode: string): Promise<string[]> => {
    const visited = new Set<string>();
    const order: string[] = [];
    
    const dfsRecursive = async (node: string): Promise<void> => {
      await new Promise<void>(resolve => {
        const checkPause = () => {
          if (!isPaused) {
            resolve();
          } else {
            setTimeout(checkPause, 100);
          }
        };
        checkPause();
      });
      
      if (visited.has(node)) return;
      
      visited.add(node);
      order.push(node);
      
      // Update node state
      setNodes(prev => prev.map(n => 
        n.id === node 
          ? { ...n, visited: true, current: true }
          : { ...n, current: false }
      ));
      
      setTraversalOrder([...order]);
      await sleep(1100 - speed * 100);
      
      // Remove current highlighting
      setNodes(prev => prev.map(n => 
        n.id === node ? { ...n, current: false } : n
      ));
      
      // Visit neighbors
      const neighbors = adjacencyList[node] || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          await dfsRecursive(neighbor);
        }
      }
    };
    
    await dfsRecursive(startNode);
    return order;
  };

  // Start traversal
  const startTraversal = async () => {
    const startNode = startNodeInput.trim().toUpperCase();
    
    if (!startNode) {
      showMessage('Please enter a start node', 'error');
      return;
    }
    
    if (!nodes.find(node => node.id === startNode)) {
      showMessage('Start node does not exist in the graph', 'error');
      return;
    }

    if (!graphBuilt) {
      showMessage('Please build the graph first', 'error');
      return;
    }
    
    // Reset visualization
    setNodes(prev => prev.map(node => ({
      ...node,
      visited: false,
      current: false
    })));
    setEdges(prev => prev.map(edge => ({ ...edge, traversed: false })));
    
    setIsTraversing(true);
    setCurrentAlgorithm(selectedAlgorithm);
    setTraversalOrder([]);
    
    try {
      let order: string[];
      if (selectedAlgorithm === 'BFS') {
        order = await bfsTraversal(startNode);
      } else {
        order = await dfsTraversal(startNode);
      }
      
      showMessage(`${selectedAlgorithm} traversal completed!`, 'success');
    } catch (error) {
      console.error('Traversal error:', error);
      showMessage('Traversal error occurred', 'error');
    } finally {
      setIsTraversing(false);
    }
  };

  // Toggle pause
  const togglePause = () => {
    setIsPaused(prev => !prev);
  };

  // Reset visualization
  const resetVisualization = () => {
    setNodes(prev => prev.map(node => ({
      ...node,
      visited: false,
      current: false
    })));
    setEdges(prev => prev.map(edge => ({ ...edge, traversed: false })));
    setTraversalOrder([]);
    setIsTraversing(false);
    setIsPaused(false);
    showMessage('Visualization reset', 'info');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-600 to-purple-800">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-8 text-white">
          <h1 className="text-4xl font-bold mb-3 drop-shadow-lg">
            🌐 Graph Traversal Visualizer
          </h1>
          <p className="text-xl opacity-90">Interactive BFS & DFS Algorithm Demonstration</p>
        </div>

        {/* Message Display */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'error' ? 'bg-red-100 text-red-800 border border-red-300' :
            message.type === 'success' ? 'bg-green-100 text-green-800 border border-green-300' :
            'bg-blue-100 text-blue-800 border border-blue-300'
          }`}>
            {message.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
            {message.text}
          </div>
        )}

        {/* Input Controls */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 mb-6 shadow-2xl">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">📝 Build Your Graph</h2>
          
          {/* Node Input */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">Add Node</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={nodeInput}
                  onChange={(e) => setNodeInput(e.target.value)}
                  placeholder="Enter node (A, B, C...)"
                  className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  onKeyPress={(e) => e.key === 'Enter' && addNode()}
                />
                <button
                  onClick={addNode}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>

            {/* Edge Input */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">From Node</label>
              <input
                type="text"
                value={edgeFromInput}
                onChange={(e) => setEdgeFromInput(e.target.value)}
                placeholder="From (A)"
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">To Node</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={edgeToInput}
                  onChange={(e) => setEdgeToInput(e.target.value)}
                  placeholder="To (B)"
                  className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  onKeyPress={(e) => e.key === 'Enter' && addEdge()}
                />
                <button
                  onClick={addEdge}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Add Edge
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">Actions</label>
              <div className="flex gap-2">
                <button
                  onClick={buildGraph}
                  className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors flex-1"
                >
                  Build Graph
                </button>
                <button
                  onClick={arrangeNodes}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 rounded-lg transition-colors"
                >
                  <Settings size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Current Graph Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-gray-100 p-3 rounded-lg">
              <h3 className="font-semibold text-gray-700 mb-2">Nodes ({nodes.length})</h3>
              <div className="text-sm text-gray-600">
                {nodes.length > 0 ? nodes.map(node => node.id).join(', ') : 'No nodes added'}
              </div>
            </div>
            
            <div className="bg-gray-100 p-3 rounded-lg">
              <h3 className="font-semibold text-gray-700 mb-2">Edges ({edges.length})</h3>
              <div className="text-sm text-gray-600">
                {edges.length > 0 ? edges.map(edge => `${edge.from.id}-${edge.to.id}`).join(', ') : 'No edges added'}
              </div>
            </div>
            
            <div className="bg-gray-100 p-3 rounded-lg">
              <h3 className="font-semibold text-gray-700 mb-2">Status</h3>
              <div className={`text-sm font-semibold ${graphBuilt ? 'text-green-600' : 'text-orange-600'}`}>
                {graphBuilt ? '✓ Graph Built' : '⏳ Building...'}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={clearAll}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <Trash2 size={18} />
              Clear All
            </button>
          </div>
        </div>

        {/* Traversal Controls */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 mb-6 shadow-2xl">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">🚀 Graph Traversal</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">Start Node</label>
              <input
                type="text"
                value={startNodeInput}
                onChange={(e) => setStartNodeInput(e.target.value)}
                placeholder="Enter start node"
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">Algorithm</label>
              <select
                value={selectedAlgorithm}
                onChange={(e) => setSelectedAlgorithm(e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              >
                <option value="BFS">BFS (Breadth-First Search)</option>
                <option value="DFS">DFS (Depth-First Search)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">Speed: {speed}</label>
              <input
                type="range"
                min="1"
                max="10"
                value={speed}
                onChange={(e) => setSpeed(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none slider"
              />
            </div>

            <button
              onClick={startTraversal}  
              disabled={isTraversing || !graphBuilt}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-6 py-2 rounded-lg transition-all duration-300 hover:-translate-y-1 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
            >
              <Play size={18} />
              Start {selectedAlgorithm}
            </button>

            <div className="flex gap-2">
              <button
                onClick={togglePause}
                disabled={!isTraversing}
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                {isPaused ? <Play size={16} /> : <Pause size={16} />}
              </button>
              
              <button
                onClick={resetVisualization}
                className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-lg transition-colors flex items-center gap-1"
              >
                <RotateCcw size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Visualization Area */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-2xl">
          <div className="border-2 border-gray-300 rounded-xl overflow-hidden bg-gray-50 mb-6">
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="block w-full"
              style={{ maxWidth: '100%', height: 'auto' }}
            />
          </div>

          {/* Results */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white p-4 rounded-xl shadow-lg">
              <h3 className="text-lg font-semibold mb-3">📊 Graph Statistics</h3>
              <div className="space-y-2">
                <div>Nodes: <span className="font-mono text-xl">{nodes.length}</span></div>
                <div>Edges: <span className="font-mono text-xl">{edges.length}</span></div>
                <div>Algorithm: <span className="font-semibold">{currentAlgorithm || 'None'}</span></div>
                <div>Status: <span className="font-semibold">
                  {isTraversing ? (isPaused ? 'Paused' : 'Running') : 'Ready'}
                </span></div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 rounded-xl shadow-lg">
              <h3 className="text-lg font-semibold mb-3">🚀 Traversal Order</h3>
              <div className="font-mono text-sm leading-relaxed">
                {traversalOrder.length > 0 
                  ? `${currentAlgorithm}: ${traversalOrder.join(' → ')}`
                  : 'Start traversal to see the order'
                }
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 mt-6">
          <h3 className="font-semibold mb-3 text-gray-800">🎨 Color Legend</h3>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-400 rounded-full"></div>
              <span>Start Node</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-400 rounded-full"></div>
              <span>Currently Processing</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-400 rounded-full"></div>
              <span>Visited</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-300 rounded-full border border-gray-500"></div>
              <span>Unvisited</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GraphTraversalVisualizer;