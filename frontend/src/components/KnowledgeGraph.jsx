import React, { useEffect, useRef, useState } from 'react';

const KnowledgeGraph = ({ data }) => {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: null });

  // Use a ref for values that change during animation/interaction without re-render
  const stateRef = useRef({
    scale: 1,
    tx: 0,
    ty: 0,
    nodes: [],
    edges: [],
    byId: {},
    dragging: false,
    lastX: 0,
    lastY: 0,
    dashOffset: 0
  });

  const COLOR = { 
    MATCHED: '#00d68f', 
    MISSING: '#ff4d6d', 
    EXTRA: '#4d9fff', 
    DOMAIN: '#3d4260', 
    JOB_ROLE: '#7c5cfc' 
  };
  const STROKE_C = { 
    MATCHED: '#00a86b', 
    MISSING: '#cc1f3e', 
    EXTRA: '#1a6fcc', 
    DOMAIN: '#5c6280', 
    JOB_ROLE: '#fff' 
  };

  useEffect(() => {
    if (!data || !data.graph) return;

    const nodes = data.graph.nodes.map(n => ({ ...n, px: 0.5, py: 0.5 }));
    const byId = {};
    nodes.forEach(n => byId[n.id] = n);
    const edges = data.graph.edges;

    // Layout calculation
    const centerX = 0.5, centerY = 0.5;
    const coreEdges = edges.filter(e => e.source === 'Backend Developer' || e.target === 'Backend Developer');
    const coreIds = new Set(coreEdges.map(e => e.source === 'Backend Developer' ? e.target : e.source));
    
    if (byId['Backend Developer']) {
      byId['Backend Developer'].px = centerX;
      byId['Backend Developer'].py = centerY;
    }

    const coreNodesList = nodes.filter(n => coreIds.has(n.id));
    coreNodesList.forEach((n, i) => {
      const angle = (i / coreNodesList.length) * Math.PI * 2;
      const r = 0.22;
      n.px = centerX + Math.cos(angle) * r;
      n.py = centerY + Math.sin(angle) * r;
    });

    const level1Ids = new Set(coreNodesList.map(n => n.id));
    const level2Nodes = nodes.filter(n => {
      if (n.status === 'JOB_ROLE' || level1Ids.has(n.id)) return false;
      return edges.some(e => (level1Ids.has(e.source) && e.target === n.id) || (level1Ids.has(e.target) && e.source === n.id));
    });
    level2Nodes.forEach((n, i) => {
      const angle = (i / level2Nodes.length) * Math.PI * 2 + 0.2;
      const r = 0.38;
      n.px = centerX + Math.cos(angle) * r;
      n.py = centerY + Math.sin(angle) * r;
    });

    const placedIds = new Set([...coreIds, ...level2Nodes.map(n => n.id), 'Backend Developer']);
    const remaining = nodes.filter(n => !placedIds.has(n.id));
    remaining.forEach((n, i) => {
      const angle = (i / remaining.length) * Math.PI * 2 - 0.1;
      const r = 0.46;
      n.px = centerX + Math.cos(angle) * r;
      n.py = centerY + Math.sin(angle) * r;
    });

    stateRef.current.nodes = nodes;
    stateRef.current.edges = edges;
    stateRef.current.byId = byId;

    // Resize handler
    const resize = () => {
      if (!wrapRef.current || !canvasRef.current) return;
      const r = wrapRef.current.getBoundingClientRect();
      const W = r.width;
      const H = r.height;
      canvasRef.current.width = W * window.devicePixelRatio;
      canvasRef.current.height = H * window.devicePixelRatio;
      canvasRef.current.style.width = W + 'px';
      canvasRef.current.style.height = H + 'px';
      const ctx = canvasRef.current.getContext('2d');
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resize();
    window.addEventListener('resize', resize);

    // Animation loop
    let animId;
    const draw = () => {
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx || !wrapRef.current) return;
      
      const { width: W, height: H } = wrapRef.current.getBoundingClientRect();
      const { scale, tx, ty, nodes, edges, byId, dashOffset } = stateRef.current;

      ctx.clearRect(0, 0, W, H);

      // Grid
      ctx.fillStyle = 'rgba(0,0,0,0.03)';
      for (let gx = 0; gx < W; gx += 40) for (let gy = 0; gy < H; gy += 40) {
        ctx.beginPath(); ctx.arc(gx, gy, 1, 0, Math.PI*2); ctx.fill();
      }

      const toScreen = (nx, ny) => [nx * W * scale + tx, ny * H * scale + ty];
      const nodeRadius = (n) => {
        if (n.status === 'JOB_ROLE') return 45;
        return Math.max(10, 8 + Math.sqrt(n.downstream_count || 0) * 3);
      };

      // Draw edges
      edges.forEach(e => {
        const a = byId[e.source], b = byId[e.target];
        if (!a || !b) return;
        const [ax, ay] = toScreen(a.px, a.py);
        const [bx, by] = toScreen(b.px, b.py);

        const isRelated = !hoveredNode || hoveredNode.id === e.source || hoveredNode.id === e.target;
        const opacityMult = isRelated ? 1 : 0.15;

        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        
        ctx.setLineDash([3, 3]);
        ctx.lineDashOffset = -dashOffset;
        if (e.edge_type === 'CORE_REQUIREMENT') {
          ctx.strokeStyle = e.is_gap_path ? `rgba(255,77,109,${0.7 * opacityMult})` : `rgba(124,92,252,${0.5 * opacityMult})`;
          ctx.lineWidth = 1.5;
        } else {
          ctx.strokeStyle = e.is_gap_path ? `rgba(255,77,109,${0.5 * opacityMult})` : `rgba(0,0,0,${0.1 * opacityMult})`;
          ctx.lineWidth = 0.8;
        }
        
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // Draw nodes
      nodes.forEach(n => {
        const [sx, sy] = toScreen(n.px, n.py);
        const r = nodeRadius(n) * scale;
        const isH = hoveredNode && hoveredNode.id === n.id;

        // Glow
        if (n.status === 'MATCHED' || n.status === 'MISSING' || n.status === 'JOB_ROLE') {
          ctx.beginPath();
          ctx.arc(sx, sy, r + (n.status === 'JOB_ROLE' ? 15 : 8) * scale, 0, Math.PI*2);
          const grd = ctx.createRadialGradient(sx, sy, r * 0.5, sx, sy, r + (n.status === 'JOB_ROLE' ? 15 : 8) * scale);
          let c = n.status === 'MATCHED' ? '0,214,143' : '255,77,109';
          if (n.status === 'JOB_ROLE') c = '124,92,252';
          grd.addColorStop(0, `rgba(${c},0.3)`);
          grd.addColorStop(1, `rgba(${c},0)`);
          ctx.fillStyle = grd;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI*2);
        ctx.fillStyle = COLOR[n.status] || '#3d4260';
        ctx.fill();
        ctx.strokeStyle = isH ? '#000' : (STROKE_C[n.status] || '#5c6280');
        ctx.lineWidth = isH ? 2 : 0.8;
        ctx.stroke();

        // Label
        const fontSize = Math.max(9, Math.min(13, 11 * scale));
        ctx.font = `${n.status === 'MATCHED' || n.status === 'MISSING' ? '600' : '400'} ${fontSize}px 'IBM Plex Mono',monospace`;
        ctx.textAlign = 'center';
        ctx.fillStyle = isH ? '#000' : 'rgba(0,0,0,0.8)';
        ctx.fillText(n.label, sx, sy + r + 4 * scale + fontSize);
      });

      stateRef.current.dashOffset += 0.2;
      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [data, hoveredNode]);

  const handleMouseDown = (e) => {
    stateRef.current.dragging = true;
    stateRef.current.lastX = e.clientX;
    stateRef.current.lastY = e.clientY;
  };

  const handleMouseMove = (e) => {
    if (stateRef.current.dragging) {
      stateRef.current.tx += e.clientX - stateRef.current.lastX;
      stateRef.current.ty += e.clientY - stateRef.current.lastY;
      stateRef.current.lastX = e.clientX;
      stateRef.current.lastY = e.clientY;
    } else {
      // Hover detection
      if (!wrapRef.current || !canvasRef.current) return;
      const r = canvasRef.current.getBoundingClientRect();
      const mx = e.clientX - r.left;
      const my = e.clientY - r.top;
      
      const { scale, tx, ty, nodes, width: W, height: H } = stateRef.current;
      const W_actual = r.width;
      const H_actual = r.height;

      let found = null;
      for (let i = nodes.length - 1; i >= 0; i--) {
        const n = nodes[i];
        const sx = n.px * W_actual * scale + tx;
        const sy = n.py * H_actual * scale + ty;
        const radius = (n.status === 'JOB_ROLE' ? 45 : 12) * scale;
        if (Math.hypot(mx - sx, my - sy) <= radius + 5) {
          found = n;
          break;
        }
      }
      setHoveredNode(found);
      
      if (found) {
        setTooltip({
          visible: true,
          x: e.clientX + 15,
          y: e.clientY - 15,
          content: found
        });
      } else {
        setTooltip(prev => ({ ...prev, visible: false }));
      }
    }
  };

  const handleMouseUp = () => {
    stateRef.current.dragging = false;
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    stateRef.current.scale = Math.min(4, Math.max(0.3, stateRef.current.scale * delta));
  };

  return (
    <div 
      ref={wrapRef} 
      style={{ 
        width: '100%', 
        height: '400px', 
        position: 'relative', 
        overflow: 'hidden',
        border: '2px solid var(--border)',
        background: 'white',
        cursor: stateRef.current.dragging ? 'grabbing' : (hoveredNode ? 'pointer' : 'default')
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      <canvas ref={canvasRef} style={{ display: 'block' }} />
      
      {tooltip.visible && tooltip.content && (
        <div style={{
          position: 'fixed',
          left: tooltip.x,
          top: tooltip.y,
          background: 'var(--surface)',
          border: '2px solid var(--border)',
          boxShadow: 'var(--shadow)',
          padding: '12px',
          zIndex: 1000,
          pointerEvents: 'none',
          minWidth: '200px'
        }}>
          <div style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '4px' }}>{tooltip.content.label}</div>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '8px' }}>{tooltip.content.status}</div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
              <span>Impact:</span>
              <span className="mono">{(tooltip.content.impact_score * 100).toFixed(1)}%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
              <span>Learnability:</span>
              <span className="mono">{(tooltip.content.learnability * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeGraph;
