import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { 
  Layers, ZoomIn, ZoomOut, X, BrainCircuit, 
  PanelLeftClose, PanelLeft, Plus, Zap, Palette, GripVertical, GripHorizontal
} from 'lucide-react';

// --- 常量 ---
const GRID_SIZE = 10;
const CANVAS_SIZE = 8000; // 显著扩大画布

// --- 类型 ---
export interface Trigger {
  id: string;
  name: string;
  content: string;
  action: string;
}

export interface ContractNode {
  id: string;
  x: number; y: number;
  width: number; height: number;
  zIndex: number;
  color: string;
  borderColor: string;
  textColor: string;
  intent: string;
  input: string;
  output: string;
  logic: string;
  validation: string;
  errorHandling: string;
  constraints: string;
  triggers: Trigger[];
}

const MainP: React.FC = () => {
  // --- 基础状态 ---
  const [nodes, setNodes] = useState<ContractNode[]>([]);
  const [connections, setConnections] = useState<{id: string, fromId: string, toId: string}[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [scale, setScale] = useState(1.0);
  
  // 布局尺寸
  const [leftWidth, setLeftWidth] = useState(260);
  const [bottomHeight, setBottomHeight] = useState(320);
  const [isLeftVisible, setIsLeftVisible] = useState(true);
  const [editingSidebarId, setEditingSidebarId] = useState<string | null>(null);

  // 交互状态
  const [mode, setMode] = useState<'none' | 'moving' | 'resizing' | 'linking' | 'resize-sidebar' | 'resize-bottom'>('none');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const viewportRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const dragData = useRef({ startX: 0, startY: 0, initialNodes: [] as ContractNode[] });

  // --- 1. 视口初始化居中 ---
  useLayoutEffect(() => {
    if (viewportRef.current) {
      const v = viewportRef.current;
      v.scrollLeft = (CANVAS_SIZE * scale) / 2 - v.clientWidth / 2;
      v.scrollTop = (CANVAS_SIZE * scale) / 2 - v.clientHeight / 2;
    }
  }, [scale]);

  // --- 2. 坐标转换与智能吸附 ---
  const getCanvasCoords = useCallback((e: MouseEvent | React.MouseEvent) => {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale };
  }, [scale]);

  const snap = (v: number) => Math.round(v / GRID_SIZE) * GRID_SIZE;

  // --- 3. 智能连线算法 ---
  const getSmartConnectionPoints = (from: ContractNode, to: ContractNode) => {
    // 定义四个面的中心点
    const getPorts = (n: ContractNode) => [
      { x: n.x + n.width / 2, y: n.y, dir: 'T' },          // 上
      { x: n.x + n.width / 2, y: n.y + n.height, dir: 'B' }, // 下
      { x: n.x, y: n.y + n.height / 2, dir: 'L' },          // 左
      { x: n.x + n.width, y: n.y + n.height / 2, dir: 'R' }  // 右
    ];

    const fromPorts = getPorts(from);
    const toPorts = getPorts(to);

    let minDesc = { dist: Infinity, p1: fromPorts[3], p2: toPorts[2] };

    fromPorts.forEach(p1 => {
      toPorts.forEach(p2 => {
        const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        if (dist < minDesc.dist) {
          minDesc = { dist, p1, p2 };
        }
      });
    });
    return minDesc;
  };

  // --- 4. 节点操作 ---
  const addNode = (x: number, y: number) => {
    const newNode: ContractNode = {
      id: `node_${Date.now()}`,
      x: snap(x - 120), y: snap(y - 90),
      width: 240, height: 180,
      zIndex: nodes.length + 1,
      color: '#ffffff', borderColor: '#333333', textColor: '#333333',
      intent: '新合约节点',
      input: '', output: '', logic: '', validation: '', errorHandling: '',
      constraints: '', triggers: []
    };
    setNodes([...nodes, newNode]);
    setSelectedIds([newNode.id]);
  };

  const updateNode = (id: string, data: Partial<ContractNode>) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, ...data } : n));
  };

  const mainSelected = nodes.find(n => n.id === selectedIds[0]);

  // --- 5. 全局事件监听 ---
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const pos = getCanvasCoords(e);
      setMousePos(pos);

      if (mode === 'moving') {
        const dx = snap(pos.x - dragData.current.startX);
        const dy = snap(pos.y - dragData.current.startY);
        setNodes(prev => prev.map(n => {
          if (!selectedIds.includes(n.id)) return n;
          const init = dragData.current.initialNodes.find(i => i.id === n.id);
          return init ? { ...n, x: init.x + dx, y: init.y + dy } : n;
        }));
      } else if (mode === 'resizing' && activeId) {
        const dx = snap(pos.x - dragData.current.startX);
        const dy = snap(pos.y - dragData.current.startY);
        const init = dragData.current.initialNodes[0];
        updateNode(activeId, { width: Math.max(160, init.width + dx), height: Math.max(120, init.height + dy) });
      } else if (mode === 'resize-sidebar') {
        setLeftWidth(Math.max(150, Math.min(600, e.clientX)));
      } else if (mode === 'resize-bottom') {
        setBottomHeight(Math.max(150, Math.min(800, window.innerHeight - e.clientY)));
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (mode === 'linking' && activeId) {
        const pos = getCanvasCoords(e);
        const target = nodes.find(n => n.id !== activeId && pos.x > n.x && pos.x < n.x + n.width && pos.y > n.y && pos.y < n.y + n.height);
        if (target) setConnections(prev => [...prev, { id: `c_${Date.now()}`, fromId: activeId, toId: target.id }]);
      }
      setMode('none');
      setActiveId(null);
    };

    if (mode !== 'none') {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [mode, activeId, selectedIds, getCanvasCoords, nodes]);

  return (
    <div style={styles.container}>
      {/* 顶栏 */}
      <div style={styles.topBar}>
        <div style={styles.toolbarGroup}>
          <BrainCircuit size={22} color="#2196F3" />
          <span style={styles.brand}>CONTRACT FLOW</span>
          <div style={styles.divider} />
          <button style={styles.iconBtn} onClick={() => setIsLeftVisible(!isLeftVisible)}>
            {isLeftVisible ? <PanelLeftClose size={18}/> : <PanelLeft size={18}/>}
          </button>
          <button style={styles.toolBtn} onClick={() => setScale(s => Math.max(0.1, s-0.1))}><ZoomOut size={16}/></button>
          <span style={styles.valText}>{Math.round(scale*100)}%</span>
          <button style={styles.toolBtn} onClick={() => setScale(s => Math.min(3, s+0.1))}><ZoomIn size={16}/></button>
        </div>

        {mainSelected && (
          <div style={styles.toolbarGroup}>
            <div style={styles.divider} />
            <div style={styles.colorTool}>
              <Palette size={14} />
              <input type="color" value={mainSelected.color} title="背景" onChange={e => updateNode(mainSelected.id, {color: e.target.value})} />
              <input type="color" value={mainSelected.borderColor} title="边框" onChange={e => updateNode(mainSelected.id, {borderColor: e.target.value})} />
              <input type="color" value={mainSelected.textColor} title="文字" onChange={e => updateNode(mainSelected.id, {textColor: e.target.value})} />
            </div>
            <button style={{...styles.toolBtn, color: '#f44336'}} onClick={() => {
              setNodes(nodes.filter(n => n.id !== mainSelected.id));
              setConnections(connections.filter(c => c.fromId !== mainSelected.id && c.toId !== mainSelected.id));
              setSelectedIds([]);
            }}><X size={14}/> 移除节点</button>
          </div>
        )}
      </div>

      <div style={styles.mainWrapper}>
        {/* 左栏 */}
        {isLeftVisible && (
          <div style={{...styles.sidebar, width: leftWidth}}>
            <div style={styles.sidebarTitle}>节点资产库 (双击重命名)</div>
            {nodes.map(n => (
              <div key={n.id} 
                style={{...styles.layerItem, background: selectedIds.includes(n.id) ? '#e3f2fd' : 'transparent'}}
                onClick={() => setSelectedIds([n.id])}
                onDoubleClick={() => setEditingSidebarId(n.id)}
              >
                <Layers size={14} style={{marginRight: 8, opacity: 0.5}}/>
                {editingSidebarId === n.id ? (
                  <input 
                    autoFocus style={styles.sidebarInput} value={n.intent} 
                    onBlur={() => setEditingSidebarId(null)}
                    onChange={e => updateNode(n.id, {intent: e.target.value})}
                    onKeyDown={e => e.key === 'Enter' && setEditingSidebarId(null)}
                  />
                ) : <span>{n.intent}</span>}
              </div>
            ))}
            <div style={styles.resizerV} onMouseDown={() => setMode('resize-sidebar')} />
          </div>
        )}

        {/* 画布视口 */}
        <div ref={viewportRef} style={styles.viewport}>
          <div ref={boardRef} 
            style={{...styles.board, width: CANVAS_SIZE, height: CANVAS_SIZE, transform: `scale(${scale})`, transformOrigin: '0 0'}}
            onDoubleClick={e => { if(e.target === boardRef.current) addNode(getCanvasCoords(e).x, getCanvasCoords(e).y) }}
            onMouseDown={e => { if(e.target === boardRef.current) setSelectedIds([]) }}
          >
            <svg style={styles.svgLayer}>
              <defs>
                <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                  <path d="M0,0 L8,4 L0,8 Z" fill="#2196F3" />
                </marker>
              </defs>
              {connections.map(c => {
                const f = nodes.find(n => n.id === c.fromId), t = nodes.find(n => n.id === c.toId);
                if (!f || !t) return null;
                const { p1, p2 } = getSmartConnectionPoints(f, t);
                return <path key={c.id} d={`M ${p1.x} ${p1.y} C ${p1.dir==='R'?p1.x+40:p1.dir==='L'?p1.x-40:p1.x} ${p1.dir==='B'?p1.y+40:p1.dir==='T'?p1.y-40:p1.y}, ${p2.dir==='R'?p2.x+40:p2.dir==='L'?p2.x-40:p2.x} ${p2.dir==='B'?p2.y+40:p2.dir==='T'?p2.y-40:p2.y}, ${p2.x} ${p2.y}`} stroke="#2196F3" strokeWidth="2" fill="none" markerEnd="url(#arrow)" />;
              })}
              {mode === 'linking' && activeId && (() => {
                const node = nodes.find(n => n.id === activeId);
                if (!node) return null;
                return <line x1={node.x + node.width} 
                      y1={node.y + node.height/2} 
                      x2={mousePos.x} y2={mousePos.y} stroke="#2196F3" strokeDasharray="4" />;
              })()}
            </svg>

            {nodes.map(n => (
              <div key={n.id} 
                style={{
                  ...styles.node, left: n.x, top: n.y, width: n.width, height: n.height,
                  background: n.color, borderColor: selectedIds.includes(n.id) ? '#2196F3' : n.borderColor,
                  color: n.textColor, zIndex: n.zIndex,
                  fontSize: Math.max(10, 12 / Math.sqrt(scale)) // 字号视觉补偿
                }}
                onMouseDown={e => {
                  e.stopPropagation(); e.preventDefault();
                  setSelectedIds([n.id]); setMode('moving');
                  const pos = getCanvasCoords(e);
                  dragData.current = { startX: pos.x, startY: pos.y, initialNodes: JSON.parse(JSON.stringify(nodes)) };
                }}
              >
                <div style={styles.nodeHeader}>{n.intent}</div>
                <div style={styles.nodeBody}>
                  <div><b>I:</b> {n.input || '-'}</div>
                  <div><b>O:</b> {n.output || '-'}</div>
                </div>
                {/* 四面连线点 */}
                {['T','B','L','R'].map(d => (
                   <div key={d} style={{...styles.port, 
                     ...(d==='T'?{top:-6,left:'50%',marginLeft:-6}: d==='B'?{bottom:-6,left:'50%',marginLeft:-6}: d==='L'?{left:-6,top:'50%',marginTop:-6}: {right:-6,top:'50%',marginTop:-6})
                   }} onMouseDown={e => { e.stopPropagation(); setMode('linking'); setActiveId(n.id); }} />
                ))}
                <div style={styles.resizeHandle} onMouseDown={e => {
                  e.stopPropagation(); setMode('resizing'); setActiveId(n.id);
                  const pos = getCanvasCoords(e);
                  dragData.current = { startX: pos.x, startY: pos.y, initialNodes: [n] };
                }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 底栏编辑器 */}
      {mainSelected && (
        <div style={{...styles.bottomPanel, height: bottomHeight}}>
          <div style={styles.resizerH} onMouseDown={() => setMode('resize-bottom')} />
          <div style={styles.tabs}>
            <button style={styles.tabActive}>契约五要素 (自适应高度)</button>
            <button style={styles.tabInactive} onClick={() => alert('触发器逻辑功能正在开发中，敬请期待！')}>其他逻辑</button>
          </div>
          <div style={styles.contractElementsWrapper}>
            {[
              { label: 'INPUT', key: 'input', val: mainSelected.input },
              { label: 'OUTPUT', key: 'output', val: mainSelected.output },
              { label: 'VALIDATION', key: 'validation', val: mainSelected.validation },
              { label: 'ERROR', key: 'errorHandling', val: mainSelected.errorHandling },
              { label: 'CONSTRAINTS', key: 'constraints', val: mainSelected.constraints },
            ].map(item => (
              <div key={item.key} style={styles.elementColumn}>
                <label style={styles.elementLabel}>{item.label}</label>
                <textarea 
                  style={styles.elementTextarea}
                  value={item.val}
                  placeholder={`输入 ${item.label}...`}
                  onChange={e => updateNode(mainSelected.id, { [item.key]: e.target.value })}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// --- 样式定义 ---
const styles = {
  container: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f0f0f2', fontFamily: 'system-ui' } as const,
  topBar: { height: 50, background: '#fff', borderBottom: '1px solid #d1d1d1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 15px', zIndex: 100 } as const,
  toolbarGroup: { display: 'flex', alignItems: 'center', gap: 12 },
  brand: { fontWeight: 900, fontSize: 13, color: '#333', letterSpacing: 0.5 },
  divider: { width: 1, height: 20, background: '#e0e0e0' },
  iconBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#666' },
  toolBtn: { padding: '4px 10px', border: '1px solid #ddd', background: '#fff', borderRadius: 4, cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 },
  valText: { fontSize: 11, fontWeight: 'bold', minWidth: 40, textAlign: 'center' },
  colorTool: { display: 'flex', alignItems: 'center', gap: 5, background: '#f9f9f9', padding: '2px 8px', borderRadius: 4 },

  mainWrapper: { flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' } as const,
  sidebar: { background: '#fff', borderRight: '1px solid #d1d1d1', overflowY: 'auto', position: 'relative' } as const,
  resizerV: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 4, cursor: 'col-resize', background: 'transparent' },
  sidebarTitle: { padding: '10px 15px', fontSize: 10, fontWeight: 'bold', color: '#aaa', textTransform: 'uppercase' },
  layerItem: { padding: '10px 15px', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'background 0.2s' } as const,
  sidebarInput: { border: '1px solid #2196F3', outline: 'none', padding: '2px 4px', width: '100%', borderRadius: 3 },

  viewport: { flex: 1, position: 'relative', overflow: 'auto', background: '#e8e8eb' } as const,
  board: { position: 'relative', background: '#fff', backgroundImage: 'radial-gradient(#d1d1d1 1px, transparent 0)', backgroundSize: '30px 30px' } as const,
  svgLayer: { position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' } as const,

  node: { position: 'absolute', border: '2px solid #333', borderRadius: 6, display: 'flex', flexDirection: 'column', boxShadow: '0 6px 12px rgba(0,0,0,0.08)', cursor: 'move', overflow: 'visible', userSelect: 'none' } as const,
  nodeHeader: { padding: '6px 10px', borderBottom: '1px solid rgba(0,0,0,0.05)', fontSize: 'inherit', fontWeight: 'bold', background: 'rgba(0,0,0,0.03)' },
  nodeBody: { flex: 1, padding: 10, display: 'flex', flexDirection: 'column', gap: 5, overflow: 'hidden' },
  port: { position: 'absolute', width: 12, height: 12, borderRadius: '50%', background: '#2196F3', border: '2px solid #fff', cursor: 'crosshair', zIndex: 5 },
  resizeHandle: { position: 'absolute', right: 0, bottom: 0, width: 14, height: 14, cursor: 'nwse-resize', background: 'linear-gradient(135deg, transparent 50%, #bbb 50%)', borderBottomRightRadius: 4 },

  bottomPanel: { background: '#fff', borderTop: '2px solid #2196F3', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 10 } as const,
  resizerH: { position: 'absolute', top: -3, left: 0, right: 0, height: 6, cursor: 'row-resize', background: 'transparent' },
  tabs: { display: 'flex', background: '#f8f8f8', borderBottom: '1px solid #eee' },
  tabActive: { padding: '12px 24px', border: 'none', background: '#fff', color: '#2196F3', fontWeight: 'bold', fontSize: 12, borderTop: '2px solid #2196F3' },
  tabInactive: { padding: '12px 24px', border: 'none', background: 'none', color: '#999', fontSize: 12, cursor: 'pointer' },

  contractElementsWrapper: { flex: 1, display: 'flex', gap: 1, background: '#eee', padding: 1, overflow: 'hidden' } as const,
  elementColumn: { flex: 1, background: '#fff', display: 'flex', flexDirection: 'column', minWidth: 150 },
  elementLabel: { padding: '8px 12px', fontSize: 10, fontWeight: 800, color: '#2196F3', background: '#fcfcfc', borderBottom: '1px solid #f0f0f0' },
  elementTextarea: { flex: 1, padding: 12, border: 'none', resize: 'none', outline: 'none', fontSize: 13, lineHeight: '1.6', fontFamily: 'monospace', color: '#444' } as const,
};

export default MainP;