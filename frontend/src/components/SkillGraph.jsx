import React, { useEffect, useRef, useState } from 'react';

const COLOR = { 
  MATCHED: '#5B8266', 
  MISSING: '#BC4B51', 
  PARTIAL: '#D9A441',
  EXTRA: '#5D7EA7', 
  DOMAIN: '#D6D0C2', 
  JOB_ROLE: '#3A4134',
  VERIFIED: '#2E7D32'
};

export const SkillGraph = ({ data, height = '500px', name = 'Candidate' }) => {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const drawRef = useRef(() => {});
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

    const nodes = graphData.nodes
      .filter(n => n.status !== 'REQUIRED_HUB')
      .map(n => ({ ...n, x: 0, y: 0 }));
    
    const byId = {}; 
    nodes.forEach(n => byId[n.id] = n);
    const edges = graphData.edges.filter(
      e => byId[e.source] && byId[e.target] && e.edge_type !== 'REQUIREMENT_HUB'
    );

    // Calculate github_metrics for each node from projects data
    const projects = data?.projects || [];
    const skillRepoMap = {};
    projects.forEach(proj => {
      const languages = proj.languages || [];
      const collaborations = proj.collaborations || { pull_requests: 0, issues: 0, discussion_count: 0 };
      languages.forEach(lang => {
        if (!skillRepoMap[lang.toLowerCase()]) {
          skillRepoMap[lang.toLowerCase()] = { total_repos: 0, total_collaborations: 0 };
        }
        skillRepoMap[lang.toLowerCase()].total_repos += 1;
        skillRepoMap[lang.toLowerCase()].total_collaborations += 
          (collaborations.pull_requests || 0) + (collaborations.issues || 0) + (collaborations.discussion_count || 0);
      });
      const skills = proj.inferred_skills || [];
      skills.forEach(skill => {
        if (!skillRepoMap[skill.toLowerCase()]) {
          skillRepoMap[skill.toLowerCase()] = { total_repos: 0, total_collaborations: 0 };
        }
        skillRepoMap[skill.toLowerCase()].total_repos += 1;
        skillRepoMap[skill.toLowerCase()].total_collaborations += 
          (collaborations.pull_requests || 0) + (collaborations.issues || 0) + (collaborations.discussion_count || 0);
      });
    });

    // Enrich nodes with github_metrics
    nodes.forEach(n => {
      const metrics = skillRepoMap[n.id.toLowerCase()] || { total_repos: 0, total_collaborations: 0 };
      n.github_metrics = {
        total_repos: metrics.total_repos,
        total_collaborations: metrics.total_collaborations
      };
    });

    // Deterministic layout: fixed concentric rings, no physics jitter.
    const jobRole = nodes.find(n => n.status === 'JOB_ROLE');
    const requiredNodes = nodes.filter(n => n.status === 'MATCHED' || n.status === 'MISSING' || n.status === 'PARTIAL');
    const extraNodes = nodes.filter(n => n.status === 'EXTRA');

    if (jobRole) {
      jobRole.x = 0;
      jobRole.y = 0;
    }

    const placeRing = (ringNodes, radius, startAngle = -Math.PI / 2) => {
      if (!ringNodes.length) return;
      ringNodes
        .sort((a, b) => (a.label || a.id).localeCompare(b.label || b.id))
        .forEach((n, i) => {
          const angle = startAngle + (i * (Math.PI * 2)) / ringNodes.length;
          n.x = Math.cos(angle) * radius;
          n.y = Math.sin(angle) * radius;
        });
    };

    const orderedRequired = [
      ...requiredNodes.filter(n => n.status === 'MATCHED').sort((a, b) => (a.label || a.id).localeCompare(b.label || b.id)),
      ...requiredNodes.filter(n => n.status === 'PARTIAL').sort((a, b) => (a.label || a.id).localeCompare(b.label || b.id)),
      ...requiredNodes.filter(n => n.status === 'MISSING').sort((a, b) => (a.label || a.id).localeCompare(b.label || b.id)),
    ];
    const reqRadius = Math.max(190, 150 + orderedRequired.length * 10);
    const extraRadius = Math.max(320, reqRadius + 130);
    placeRing(orderedRequired, reqRadius, -Math.PI / 2);
    placeRing(extraNodes, extraRadius, -Math.PI / 3);

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

    const onWheel = (e) => {
      e.preventDefault(); 
      const d = e.deltaY > 0 ? 0.95 : 1.05; 
      stRef.current.scale = Math.min(3, Math.max(0.2, stRef.current.scale * d)); 
      drawRef.current();
    };

    const wrap = wrapRef.current;
    if (wrap) {
      wrap.addEventListener('wheel', onWheel, { passive: false });
    }

    const draw = () => {
      const c = canvas.getContext('2d');
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      const { scale, tx, ty, dash, nodes: ns, edges: es, byId: bi, hovered: hv } = stRef.current;

      // --- Rendering ---
      const ts = (nx, ny) => [nx * scale + tx, ny * scale + ty];
      c.clearRect(0, 0, w, h);
      c.fillStyle = '#FBF9F4';
      c.fillRect(0, 0, w, h);

      c.fillStyle = 'rgba(0,0,0,0.015)';
      for (let gx = 0; gx < w; gx += 50) {
        for (let gy = 0; gy < h; gy += 50) {
          c.beginPath(); c.arc(gx, gy, 1, 0, Math.PI * 2); c.fill();
        }
      }

      es.forEach(e => {
        const a = bi[e.source], b = bi[e.target];
        if (!a || !b) return;
        const [ax, ay] = ts(a.x, a.y), [bx, by] = ts(b.x, b.y);
        const rel = !hv || hv === e.source || hv === e.target;
        c.beginPath();
        c.moveTo(ax, ay);
        c.lineTo(bx, by);
        c.strokeStyle = e.is_gap_path ? 'rgba(188,75,81,0.45)' : 'rgba(58,65,52,0.2)';
        c.lineWidth = (e.edge_type === 'CORE_REQUIREMENT' ? 4.2 : 2.6) * scale;
        if (e.is_gap_path) {
          c.setLineDash([6, 6]);
          c.lineDashOffset = -dash;
        }
        c.globalAlpha = rel ? 1 : 0.08;
        c.stroke();
        c.setLineDash([]);
        c.globalAlpha = 1;
      });

      ns.forEach(n => {
        const [sx, sy] = ts(n.x, n.y);
        const baseR = n.status === 'JOB_ROLE' ? 32 : 14 + Math.sqrt(n.downstream_count || 0) * 1.5;
        const r = baseR * scale;
        const isH = hv === n.id;

        if (n.status === 'MATCHED' || n.status === 'JOB_ROLE') {
          c.beginPath(); c.arc(sx, sy, r + 6 * scale, 0, Math.PI * 2);
          c.fillStyle = n.status === 'MATCHED' ? 'rgba(91,130,102,0.08)' : 'rgba(58,65,52,0.04)';
          c.fill();
        }

        c.beginPath(); c.arc(sx, sy, r, 0, Math.PI * 2);
        c.fillStyle = n.is_verified ? COLOR.VERIFIED : (COLOR[n.status] || '#D6D0C2');
        c.fill();
        if (isH) {
          c.strokeStyle = '#000';
          c.lineWidth = 2.5;
          c.stroke();
        }

        if (scale > 0.35 || isH) {
          c.font = `${isH || n.status === 'JOB_ROLE' ? '800' : '600'} ${Math.max(10, (n.status === 'JOB_ROLE' ? 14 : 12) * scale)}px 'Plus Jakarta Sans', sans-serif`;
          c.fillStyle = isH ? '#000' : '#333';
          c.textAlign = 'center';
          const rawLabel = n.label || '';
          const label = !isH && n.status === 'EXTRA' && rawLabel.length > 14 ? `${rawLabel.slice(0, 12)}…` : rawLabel;
          c.fillText(label, sx, sy + r + (n.status === 'JOB_ROLE' ? 22 : 20) * scale);
          if (isH && n.status !== 'JOB_ROLE') {
            c.font = `700 10px 'Plus Jakarta Sans'`;
            c.fillText(`${n.impact_score ? 'IMPACT: ' + (n.impact_score * 100).toFixed(0) : ''}`, sx, sy - r - 10);
          }
        }
      });

      stRef.current.dash += 0.3;
    };
    drawRef.current = draw;
    draw();
    return () => { 
      window.removeEventListener('resize', resize);
      if (wrap) wrap.removeEventListener('wheel', onWheel);
    };
  }, [graphData]);

  const onMouseMove = (e) => {
    const st = stRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;

    if (st.dragging) {
      st.tx += e.clientX - st.lx;
      st.ty += e.clientY - st.ly;
      st.lx = e.clientX;
      st.ly = e.clientY;
      drawRef.current();
      return;
    }

    let found = null;
    for (let i = st.nodes.length - 1; i >= 0; i--) {
      const n = st.nodes[i];
      const [sx, sy] = [n.x * st.scale + st.tx, n.y * st.scale + st.ty];
      const rad = (n.status === 'JOB_ROLE' ? 34 : 18) * st.scale;
      if (Math.hypot(mx - sx, my - sy) <= rad + 10) {
        found = n;
        break;
      }
    }

    if (st.hovered !== found?.id) {
      st.hovered = found?.id;
      setHoveredNode(found);
      drawRef.current();
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
        ref={wrapRef}
        style={{ height, position: 'relative', overflow: 'hidden', cursor: stRef.current.dragging ? 'grabbing' : 'grab' }}
        onMouseDown={e => { stRef.current.dragging = true; stRef.current.lx = e.clientX; stRef.current.ly = e.clientY; drawRef.current(); }}
        onMouseUp={() => { stRef.current.dragging = false; drawRef.current(); }}
        onMouseLeave={() => { stRef.current.dragging = false; drawRef.current(); }}
        onMouseMove={onMouseMove}
      >
        <canvas ref={canvasRef} />

        {hoveredNode && (
          <div style={{
            position: 'absolute', top: '12px', right: '12px',
            width: '200px', padding: '16px',
            background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)',
            border: '1px solid var(--border)', borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            zIndex: 10
          }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, marginBottom: '4px' }}>{hoveredNode.label}</div>
            <div style={{ fontSize: '0.65rem', color: hoveredNode.is_verified ? COLOR.VERIFIED : (COLOR[hoveredNode.status] || '#666'), fontWeight: 700, marginBottom: '8px' }}>
              Status: {hoveredNode.status}{hoveredNode.is_verified ? ' · VERIFIED VIA GITHUB' : ''}
            </div>
            
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

            {hoveredNode.matched_with && hoveredNode.status !== 'JOB_ROLE' && (
              <div style={{ fontSize: '0.65rem', opacity: 0.95, marginBottom: '6px' }}>
                <div>Matched With: <b>{hoveredNode.matched_with}</b></div>
                <div>Similarity: <b>{(Number(hoveredNode.best_similarity || 0) * 100).toFixed(1)}%</b></div>
              </div>
            )}

            {hoveredNode.similarity_reason && hoveredNode.status !== 'JOB_ROLE' && (
              <div style={{ fontSize: '0.62rem', lineHeight: 1.45, color: '#444', marginBottom: '6px' }}>
                Reason: {hoveredNode.similarity_reason}
              </div>
            )}
            
            {hoveredNode.github_metrics?.total_repos > 0 && (
              <div style={{ fontSize: '0.65rem', opacity: 0.9, marginTop: '4px' }}>
                <div style={{ marginBottom: '2px' }}>• Verified in <b>{hoveredNode.github_metrics.total_repos}</b> repos</div>
                {hoveredNode.github_metrics.total_collaborations > 0 && (
                  <div>• <b>{hoveredNode.github_metrics.total_collaborations}</b> pull requests & issues</div>
                )}
              </div>
            )}

            {hoveredNode.github_evidence > 0 && (
              <div style={{ fontSize: '0.62rem', color: '#2E7D32' }}>
                GitHub Evidence Score: <b>{hoveredNode.github_evidence.toFixed(1)}</b>
              </div>
            )}
          </div>
        )}

        <div style={{ position: 'absolute', bottom: '16px', left: '16px', padding: '10px 16px', background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(8px)', border: '1px solid var(--border)', borderRadius: '10px', display: 'flex', gap: '16px', pointerEvents: 'none' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.65rem', fontWeight: 700 }}>
             <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: COLOR.MATCHED }} /> Match
           </div>
           <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.65rem', fontWeight: 700 }}>
             <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: COLOR.PARTIAL }} /> Similar
           </div>
           <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.65rem', fontWeight: 700 }}>
             <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: COLOR.MISSING }} /> Gap
           </div>
           <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.65rem', fontWeight: 700 }}>
             <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: COLOR.EXTRA }} /> Extra
           </div>
           <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.65rem', fontWeight: 700 }}>
             <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: COLOR.VERIFIED }} /> Verified
           </div>
        </div>
      </div>

      {expl?.narrative && (
        <div style={{ padding: '16px 24px', background: '#F9F9F9', borderTop: 'var(--border)', fontSize: '0.75rem', lineHeight: '1.5', color: '#444', fontStyle: 'italic' }}>
          "{expl.narrative}"
        </div>
      )}
    </div>
  );
};
