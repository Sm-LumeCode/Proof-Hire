import React, { useEffect, useRef, useState } from 'react';

const COLOR = { 
  MATCHED: '#5B8266', 
  MISSING: '#BC4B51', 
  EXTRA: '#5D7EA7', 
  DOMAIN: '#D6D0C2', 
  JOB_ROLE: '#3A4134' 
};

export const SkillGraph = ({ data, height = '500px', name = 'Candidate' }) => {
  const canvasRef = useRef(null);
  const stRef = useRef({ 
    scale: 0.9, tx: 0, ty: 0, 
    dash: 0, dragging: false, 
    lx: 0, ly: 0, hovered: null, 
    nodes: [], edges: [], byId: {} 
  });
  const [hoveredNode, setHoveredNode] = useState(null);

  const graphData = data?.graph;
  const expl = data?.explainability;
  const fitPct = (expl?.fit_score * 100 || 0).toFixed(1);

  useEffect(() => {
    if (!graphData) return;

    // Initialize nodes with random positions for simulation
    const nodes = graphData.nodes.map(n => ({ 
      ...n, 
      x: Math.random() * 800, 
      y: Math.random() * 600,
      vx: 0, vy: 0 
    }));
    
    const byId = {}; 
    nodes.forEach(n => byId[n.id] = n);
    const edges = graphData.edges.filter(e => byId[e.source] && byId[e.target]);

    stRef.current.nodes = nodes;
    stRef.current.edges = edges;
    stRef.current.byId = byId;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const r = parent.getBoundingClientRect();
      canvas.width = r.width * devicePixelRatio;
      canvas.height = r.height * devicePixelRatio;
      canvas.style.width = r.width + 'px';
      canvas.style.height = r.height + 'px';
      const c = canvas.getContext('2d');
      c.scale(devicePixelRatio, devicePixelRatio);
      
      stRef.current.tx = r.width / 2;
      stRef.current.ty = r.height / 2;
    };
    
    resize();
    window.addEventListener('resize', resize);

    let animId;
    const draw = () => {
      const c = canvas.getContext('2d');
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      const { scale, tx, ty, dash, nodes: ns, edges: es, byId: bi, hovered: hv } = stRef.current;

      // --- Force Simulation ---
      for (let step = 0; step < 2; step++) {
        // 1. Repulsion (between all nodes)
        for (let i = 0; i < ns.length; i++) {
          for (let j = i + 1; j < ns.length; j++) {
            const n1 = ns[i], n2 = ns[j];
            const dx = n2.x - n1.x, dy = n2.y - n1.y;
            const distSq = dx * dx + dy * dy || 1;
            if (distSq > 1000000) continue; // Skip very distant nodes
            const force = 3000 / distSq;
            const fx = (dx / Math.sqrt(distSq)) * force;
            const fy = (dy / Math.sqrt(distSq)) * force;
            n1.vx -= fx; n1.vy -= fy;
            n2.vx += fx; n2.vy += fy;
          }
        }
        // 2. Attraction (Edges)
        es.forEach(e => {
          const n1 = bi[e.source], n2 = bi[e.target];
          if (!n1 || !n2) return;
          const dx = n2.x - n1.x, dy = n2.y - n1.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const desired = e.edge_type === 'CORE_REQUIREMENT' ? 120 : 180;
          const force = (dist - desired) * 0.04;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          n1.vx += fx; n1.vy += fy;
          n2.vx -= fx; n2.vy -= fy;
        });
        // 3. Center Gravity & Constraints
        ns.forEach(n => {
          if (n.status === 'JOB_ROLE') {
            // FIX THE CENTER NODE
            n.x = 0; n.y = 0;
            n.vx = 0; n.vy = 0;
          } else {
            n.vx -= n.x * 0.015; // Gentle pull to center
            n.vy -= n.y * 0.015;
            n.x += n.vx; n.y += n.vy;
            n.vx *= 0.7; n.vy *= 0.7; // Heavy Damping for stability
          }
        });
      }

      // --- Rendering ---
      const ts = (nx, ny) => [nx * scale + tx, ny * scale + ty];
      c.clearRect(0, 0, w, h);
      c.fillStyle = '#FBF9F4';
      c.fillRect(0, 0, w, h);

      // Dots grid
      c.fillStyle = 'rgba(0,0,0,0.015)';
      for (let gx = 0; gx < w; gx += 50) {
        for (let gy = 0; gy < h; gy += 50) {
          c.beginPath(); c.arc(gx, gy, 1, 0, Math.PI * 2); c.fill();
        }
      }

      // Draw Edges
      es.forEach(e => {
        const a = bi[e.source], b = bi[e.target];
        if (!a || !b) return;
        const [ax, ay] = ts(a.x, a.y), [bx, by] = ts(b.x, b.y);
        const rel = !hv || hv === e.source || hv === e.target;
        
        c.beginPath(); 
        c.moveTo(ax, ay); 
        c.lineTo(bx, by);
        c.strokeStyle = e.is_gap_path ? 'rgba(188,75,81,0.3)' : 'rgba(58,65,52,0.12)';
        c.lineWidth = (e.edge_type === 'CORE_REQUIREMENT' ? 2.5 : 1.2) * scale;
        
        if (e.is_gap_path) {
          c.setLineDash([6, 6]);
          c.lineDashOffset = -dash;
        }
        
        c.globalAlpha = rel ? 1 : 0.08;
        c.stroke();
        c.setLineDash([]);
        c.globalAlpha = 1;
      });

      // Draw Nodes
      ns.forEach(n => {
        const [sx, sy] = ts(n.x, n.y);
        const baseR = n.status === 'JOB_ROLE' ? 42 : 14 + Math.sqrt(n.downstream_count || 0) * 1.5;
        const r = baseR * scale;
        const isH = hv === n.id;

        // Outer Ring / Glow
        if (n.status === 'MATCHED' || n.status === 'JOB_ROLE') {
          c.beginPath(); c.arc(sx, sy, r + 6 * scale, 0, Math.PI * 2);
          c.fillStyle = n.status === 'MATCHED' ? 'rgba(91,130,102,0.08)' : 'rgba(58,65,52,0.04)';
          c.fill();
        }

        c.beginPath(); c.arc(sx, sy, r, 0, Math.PI * 2);
        c.fillStyle = COLOR[n.status] || '#D6D0C2';
        c.fill();
        
        if (isH) {
          c.strokeStyle = '#000';
          c.lineWidth = 2.5;
          c.stroke();
        }

        // Label
        if (scale > 0.35 || isH) {
          c.font = `${isH || n.status === 'JOB_ROLE' ? '800' : '600'} ${Math.max(10, (n.status === 'JOB_ROLE' ? 15 : 12) * scale)}px 'Plus Jakarta Sans', sans-serif`;
          c.fillStyle = isH ? '#000' : '#333';
          c.textAlign = 'center';
          c.fillText(n.label, sx, sy + r + (n.status === 'JOB_ROLE' ? 24 : 20) * scale);
          
          if (isH && n.status !== 'JOB_ROLE') {
             c.font = `700 10px 'Plus Jakarta Sans'`;
             c.fillText(`${n.impact_score ? 'IMPACT: ' + (n.impact_score*100).toFixed(0) : ''}`, sx, sy - r - 10);
          }
        }
      });

      stRef.current.dash += 0.3;
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, [graphData, hoveredNode]);

  const onMouseMove = (e) => {
    const st = stRef.current; 
    const r = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    
    if (st.dragging) {
      st.tx += e.clientX - st.lx;
      st.ty += e.clientY - st.ly;
      st.lx = e.clientX;
      st.ly = e.clientY;
      return;
    }

    let found = null;
    for (let i = st.nodes.length - 1; i >= 0; i--) {
      const n = st.nodes[i];
      const [sx, sy] = [n.x * st.scale + st.tx, n.y * st.scale + st.ty];
      const rad = (n.status === 'JOB_ROLE' ? 38 : 18) * st.scale;
      if (Math.hypot(mx - sx, my - sy) <= rad + 10) {
        found = n;
        break;
      }
    }
    
    if (st.hovered !== found?.id) {
      st.hovered = found?.id;
      setHoveredNode(found);
    }
  };

  if (!graphData) return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)', borderRadius: '12px' }}>Analyzing candidate network...</div>;

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', border: 'var(--border)', borderRadius: '16px', background: 'white', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
      <div style={{ padding: '20px 24px', borderBottom: 'var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.02em' }}>Intelligence Network</div>
          <div style={{ fontSize: '0.7rem', opacity: 0.6, fontWeight: 500 }}>Semantic Skill Evidence Map • {name}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: fitPct > 70 ? 'var(--success)' : fitPct > 40 ? 'var(--warning)' : 'var(--error)' }}>{fitPct}%</div>
          <div style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', opacity: 0.5 }}>Fit Accuracy</div>
        </div>
      </div>
      
      <div 
        style={{ height, position: 'relative', overflow: 'hidden', cursor: stRef.current.dragging ? 'grabbing' : 'grab' }}
        onMouseDown={e => { stRef.current.dragging = true; stRef.current.lx = e.clientX; stRef.current.ly = e.clientY; }}
        onMouseUp={() => stRef.current.dragging = false}
        onMouseLeave={() => stRef.current.dragging = false}
        onMouseMove={onMouseMove}
        onWheel={e => { 
          e.preventDefault(); 
          const d = e.deltaY > 0 ? 0.95 : 1.05; 
          stRef.current.scale = Math.min(3, Math.max(0.2, stRef.current.scale * d)); 
        }}
      >
        <canvas ref={canvasRef} />
        
        {/* Force Feedback Info */}
        {hoveredNode && (
          <div style={{ 
            position: 'absolute', top: '12px', right: '12px', 
            width: '200px', padding: '16px', 
            background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', 
            border: '1px solid var(--border)', borderRadius: '12px', 
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            zIndex: 10, animation: 'fadeIn 0.2s ease'
          }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, marginBottom: '4px' }}>{hoveredNode.label}</div>
            <div style={{ fontSize: '0.65rem', color: COLOR[hoveredNode.status], fontWeight: 700, marginBottom: '8px' }}>{hoveredNode.status}</div>
            
            {hoveredNode.skill_match > 0 && (
              <div style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', marginBottom: '2px' }}>
                  <span>Match Confidence</span>
                  <span>{hoveredNode.skill_match}%</span>
                </div>
                <div style={{ height: '4px', background: '#EEE', borderRadius: '2px' }}>
                  <div style={{ height: '100%', width: `${hoveredNode.skill_match}%`, background: COLOR.MATCHED, borderRadius: '2px' }} />
                </div>
              </div>
            )}
            
            {hoveredNode.github_metrics?.total_repos > 0 && (
              <div style={{ fontSize: '0.65rem', opacity: 0.9, marginTop: '4px' }}>
                <div style={{ marginBottom: '2px' }}>• Verified in <b>{hoveredNode.github_metrics.total_repos}</b> repos</div>
                {hoveredNode.github_metrics.total_commits > 0 && (
                  <div>• <b>{hoveredNode.github_metrics.total_commits}</b> relevant commits</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Legend */}
        <div style={{ position: 'absolute', bottom: '16px', left: '16px', padding: '10px 16px', background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(8px)', border: '1px solid var(--border)', borderRadius: '10px', display: 'flex', gap: '16px', pointerEvents: 'none' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.65rem', fontWeight: 700 }}>
             <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: COLOR.MATCHED }} /> Match
           </div>
           <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.65rem', fontWeight: 700 }}>
             <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: COLOR.MISSING }} /> Gap
           </div>
           <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.65rem', fontWeight: 700 }}>
             <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: COLOR.EXTRA }} /> Extra
           </div>
        </div>
      </div>
      
      {/* Narrative Footer */}
      {expl?.narrative && (
        <div style={{ padding: '16px 24px', background: '#F9F9F9', borderTop: 'var(--border)', fontSize: '0.75rem', lineHeight: '1.5', color: '#444', fontStyle: 'italic' }}>
          "{expl.narrative}"
        </div>
      )}
    </div>
  );
};
