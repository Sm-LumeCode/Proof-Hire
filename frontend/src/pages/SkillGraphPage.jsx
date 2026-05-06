import React, { useEffect, useRef, useState } from 'react';

// Embedded graph data from proofhire_output.json
const GRAPH_DATA = {"graph":{"nodes":[{"id":"SQLAlchemy","label":"SQLAlchemy","status":"DOMAIN","impact_score":0.1474,"learnability":0.5,"downstream_count":0},{"id":"GitLab","label":"GitLab","status":"DOMAIN","impact_score":0.1492,"learnability":0.5,"downstream_count":0},{"id":"Git","label":"Git","status":"EXTRA","impact_score":0.1847,"learnability":0.9,"downstream_count":2},{"id":"AWS","label":"AWS","status":"DOMAIN","impact_score":0.1741,"learnability":0.55,"downstream_count":2},{"id":"JWT","label":"JWT","status":"DOMAIN","impact_score":0.1231,"learnability":0.72,"downstream_count":0},{"id":"MySQL","label":"MySQL","status":"DOMAIN","impact_score":0.1535,"learnability":0.5,"downstream_count":0},{"id":"Django","label":"Django","status":"EXTRA","impact_score":0.1544,"learnability":0.7,"downstream_count":9},{"id":"Flask","label":"Flask","status":"MISSING","impact_score":0.1493,"learnability":0.8,"downstream_count":11,"skill_match":14.5,"gap_priority":0.3732},{"id":"Python","label":"Python","status":"MATCHED","impact_score":0.57,"learnability":0.85,"downstream_count":23,"skill_match":65,"github_evidence":41,"github_metrics":{"total_repos":9,"total_stars":0,"deployed_apps":true}},{"id":"GitHub","label":"GitHub","status":"DOMAIN","impact_score":0.1493,"learnability":0.85,"downstream_count":0},{"id":"PostgreSQL","label":"PostgreSQL","status":"DOMAIN","impact_score":0.1487,"learnability":0.7,"downstream_count":1},{"id":"Machine Learning","label":"Machine Learning","status":"DOMAIN","impact_score":0.1981,"learnability":0.55,"downstream_count":6},{"id":"FastAPI","label":"FastAPI","status":"DOMAIN","impact_score":0.1566,"learnability":0.75,"downstream_count":9},{"id":"Programming","label":"Programming","status":"DOMAIN","impact_score":0.3035,"learnability":0.5,"downstream_count":24},{"id":"DevOps","label":"DevOps","status":"DOMAIN","impact_score":0.3311,"learnability":0.5,"downstream_count":10},{"id":"Backend Developer","label":"Backend Developer","status":"JOB_ROLE","fit_score_val":0.4746,"impact_score":0.1779,"learnability":0.5,"downstream_count":24},{"id":"Docker Compose","label":"Docker Compose","status":"DOMAIN","impact_score":0.1492,"learnability":0.7,"downstream_count":0},{"id":"Kubernetes","label":"Kubernetes","status":"DOMAIN","impact_score":0.1494,"learnability":0.4,"downstream_count":0},{"id":"Docker","label":"Docker","status":"MISSING","impact_score":0.2613,"learnability":0.65,"downstream_count":5,"skill_match":17.8,"gap_priority":0.402},{"id":"Engineering","label":"Engineering","status":"DOMAIN","impact_score":0.3035,"learnability":0.5,"downstream_count":3},{"id":"SQL","label":"SQL","status":"EXTRA","impact_score":0.185,"learnability":0.8,"downstream_count":2},{"id":"NumPy","label":"NumPy","status":"DOMAIN","impact_score":0.1665,"learnability":0.8,"downstream_count":2},{"id":"Backend","label":"Backend","status":"DOMAIN","impact_score":0.3066,"learnability":0.5,"downstream_count":6},{"id":"REST API","label":"REST API","status":"MISSING","impact_score":0.1726,"learnability":0.75,"downstream_count":8,"skill_match":15.2,"gap_priority":0.4603},{"id":"OpenAPI","label":"OpenAPI","status":"DOMAIN","impact_score":0.1234,"learnability":0.7,"downstream_count":0}],"edges":[{"source":"Programming","target":"Python","edge_type":"DOMAIN","is_gap_path":false},{"source":"Python","target":"Flask","edge_type":"DEPENDENCY","is_gap_path":true},{"source":"Python","target":"Django","edge_type":"DEPENDENCY","is_gap_path":false},{"source":"Python","target":"FastAPI","edge_type":"DEPENDENCY","is_gap_path":false},{"source":"Python","target":"SQLAlchemy","edge_type":"DEPENDENCY","is_gap_path":false},{"source":"Python","target":"NumPy","edge_type":"DEPENDENCY","is_gap_path":false},{"source":"Python","target":"Machine Learning","edge_type":"DOMAIN","is_gap_path":false},{"source":"Flask","target":"REST API","edge_type":"STACK","is_gap_path":true},{"source":"Flask","target":"FastAPI","edge_type":"SIBLING","is_gap_path":true},{"source":"Flask","target":"Django","edge_type":"SIBLING","is_gap_path":true},{"source":"Django","target":"REST API","edge_type":"STACK","is_gap_path":true},{"source":"FastAPI","target":"REST API","edge_type":"STACK","is_gap_path":true},{"source":"REST API","target":"OpenAPI","edge_type":"DEPENDENCY","is_gap_path":true},{"source":"REST API","target":"JWT","edge_type":"STACK","is_gap_path":true},{"source":"REST API","target":"Docker","edge_type":"STACK","is_gap_path":true},{"source":"Backend","target":"SQL","edge_type":"DOMAIN","is_gap_path":false},{"source":"SQL","target":"PostgreSQL","edge_type":"DEPENDENCY","is_gap_path":false},{"source":"SQL","target":"MySQL","edge_type":"DEPENDENCY","is_gap_path":false},{"source":"PostgreSQL","target":"MySQL","edge_type":"SIBLING","is_gap_path":false},{"source":"DevOps","target":"Docker","edge_type":"DOMAIN","is_gap_path":true},{"source":"Docker","target":"Kubernetes","edge_type":"STACK","is_gap_path":true},{"source":"Docker","target":"Docker Compose","edge_type":"DEPENDENCY","is_gap_path":true},{"source":"Docker","target":"AWS","edge_type":"STACK","is_gap_path":true},{"source":"Engineering","target":"Git","edge_type":"DOMAIN","is_gap_path":false},{"source":"Git","target":"GitHub","edge_type":"DEPENDENCY","is_gap_path":false},{"source":"Git","target":"GitLab","edge_type":"DEPENDENCY","is_gap_path":false},{"source":"Backend Developer","target":"Docker","edge_type":"CORE_REQUIREMENT","is_gap_path":true},{"source":"Backend Developer","target":"Flask","edge_type":"CORE_REQUIREMENT","is_gap_path":true},{"source":"Backend Developer","target":"Python","edge_type":"CORE_REQUIREMENT","is_gap_path":false},{"source":"Backend Developer","target":"REST API","edge_type":"CORE_REQUIREMENT","is_gap_path":true}]},"gap_analysis":{"gaps":[{"skill":"REST API","gap_priority":0.4603,"impact_score":0.1726,"learnability":0.75,"learning_path":["Django","REST API"]},{"skill":"Docker","gap_priority":0.402,"impact_score":0.2613,"learnability":0.65,"learning_path":["Python","Backend Developer","Docker"]},{"skill":"Flask","gap_priority":0.3732,"impact_score":0.1493,"learnability":0.8,"learning_path":["Python","Backend Developer","Flask"]}]},"explainability":{"fit_score":0.4746,"fit_grade":"PARTIAL FIT","matched_count":1,"missing_count":3,"extra_count":3,"narrative":"Candidate achieves a 47.5% weighted skill fit against the job requirements. They directly match 1 of 4 required skills. Key gaps include: Flask, REST API, Docker. Candidate's experience in Django provides a foundation to bridge these gaps."}};

const COLOR = { 
  MATCHED: '#5B8266', 
  MISSING: '#BC4B51', 
  EXTRA: '#5D7EA7', 
  DOMAIN: '#D6D0C2', 
  JOB_ROLE: '#3A4134' 
};

const SkillGraphPage = ({ application, onBack }) => {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const stRef = useRef({ scale:1, tx:0, ty:0, dash:0, dragging:false, lx:0, ly:0, hovered:null, nodes:[], edges:[], byId:{} });
  const [hovered, setHovered] = useState(null);

  // Use application graph data or fallback to demo
  const GRAPH_DATA_LIVE = application?.githubData?.graph || GRAPH_DATA.graph;
  const expl = application?.githubData?.explainability || GRAPH_DATA.explainability;
  const gaps = (application?.githubData?.gap_analysis?.gaps || GRAPH_DATA.gap_analysis.gaps).slice(0, 3);
  const fitPct = ((application?.githubData?.explainability?.fit_score || GRAPH_DATA.explainability.fit_score) * 100).toFixed(1);

  useEffect(() => {
    const nodes = GRAPH_DATA_LIVE.nodes.map(n => ({ ...n, px:0.5, py:0.5 }));
    const byId = {}; nodes.forEach(n => byId[n.id] = n);
    const edges = GRAPH_DATA.graph.edges;

    // Layout logic (simplified radial)
    const cx=0.5, cy=0.5;
    const role = nodes.find(n => n.status === 'JOB_ROLE');
    if (role) { role.px = cx; role.py = cy; }
    
    const others = nodes.filter(n => n.status !== 'JOB_ROLE');
    others.forEach((n, i) => {
      const dist = n.status === 'DOMAIN' ? 0.42 : 0.28;
      const angle = (i / others.length) * Math.PI * 2;
      n.px = cx + Math.cos(angle) * dist;
      n.py = cy + Math.sin(angle) * dist;
    });

    stRef.current = { ...stRef.current, nodes, edges, byId };

    const canvas = canvasRef.current;
    if(!canvas) return;

    const resize = () => {
      const r = canvas.parentElement.getBoundingClientRect();
      canvas.width = r.width * devicePixelRatio;
      canvas.height = r.height * devicePixelRatio;
      canvas.style.width = r.width + 'px';
      canvas.style.height = r.height + 'px';
      const c = canvas.getContext('2d');
      c.scale(devicePixelRatio, devicePixelRatio);
    };
    resize(); window.addEventListener('resize', resize);

    let animId;
    const draw = () => {
      const c = canvas.getContext('2d');
      const { width: w, height: h } = canvas.getBoundingClientRect();
      const { scale, tx, ty, dash, nodes: ns, edges: es, byId: bi, hovered: hv } = stRef.current;
      const ts = (nx, ny) => [nx * w * scale + tx, ny * h * scale + ty];

      c.clearRect(0, 0, w, h);
      c.fillStyle = '#FBF9F4';
      c.fillRect(0, 0, w, h);

      // Grid
      c.fillStyle = 'rgba(0,0,0,0.03)';
      for (let gx = 0; gx < w; gx += 50) {
        for (let gy = 0; gy < h; gy += 50) {
          c.beginPath(); c.arc(gx, gy, 1, 0, Math.PI * 2); c.fill();
        }
      }

      // Edges
      es.forEach(e => {
        const a = bi[e.source], b = bi[e.target];
        if (!a || !b) return;
        const [ax, ay] = ts(a.px, a.py), [bx, by] = ts(b.px, b.py);
        const rel = !hv || hv === e.source || hv === e.target;
        c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by);
        c.strokeStyle = e.is_gap_path ? 'rgba(188,75,81,0.3)' : 'rgba(58,65,52,0.1)';
        c.lineWidth = e.edge_type === 'CORE_REQUIREMENT' ? 2 : 1;
        if (e.is_gap_path) {
          c.setLineDash([5, 5]);
          c.lineDashOffset = -dash;
        }
        c.globalAlpha = rel ? 1 : 0.2;
        c.stroke();
        c.setLineDash([]);
        c.globalAlpha = 1;
      });

      // Nodes
      ns.forEach(n => {
        const [sx, sy] = ts(n.px, n.py);
        const r = (n.status === 'JOB_ROLE' ? 38 : 12 + Math.sqrt(n.downstream_count || 0) * 2) * scale;
        const isH = hv === n.id;

        // Glow/Halo
        if (n.status === 'MATCHED' || n.status === 'MISSING') {
          c.beginPath(); c.arc(sx, sy, r + 8 * scale, 0, Math.PI * 2);
          c.fillStyle = n.status === 'MATCHED' ? 'rgba(91,130,102,0.1)' : 'rgba(188,75,81,0.1)';
          c.fill();
        }

        c.beginPath(); c.arc(sx, sy, r, 0, Math.PI * 2);
        c.fillStyle = COLOR[n.status] || '#D6D0C2';
        c.fill();
        c.strokeStyle = isH ? '#000' : 'rgba(0,0,0,0.1)';
        c.lineWidth = isH ? 2 : 1;
        c.stroke();

        // Label
        c.font = `${isH ? '600' : '500'} ${Math.max(10, 12 * scale)}px 'Inter', sans-serif`;
        c.fillStyle = isH ? '#000' : '#444';
        c.textAlign = 'center';
        c.fillText(n.label, sx, sy + r + 20 * scale);
      });

      stRef.current.dash += 0.3;
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, [hovered]);

  const onMouseMove = (e) => {
    const st = stRef.current; const r = canvasRef.current.getBoundingClientRect();
    if(st.dragging){ st.tx+=e.clientX-st.lx;st.ty+=e.clientY-st.ly;st.lx=e.clientX;st.ly=e.clientY; return; }
    const mx=e.clientX-r.left, my=e.clientY-r.top;
    let found=null;
    for(let i=st.nodes.length-1;i>=0;i--){
      const n=st.nodes[i]; const [sx,sy] = [n.px*r.width*st.scale+st.tx, n.py*r.height*st.scale+st.ty];
      const rad = (n.status === 'JOB_ROLE' ? 38 : 20) * st.scale;
      if(Math.hypot(mx-sx,my-sy) <= rad + 10){ found=n.id; break; }
    }
    st.hovered=found; setHovered(found);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)' }}>
      {/* Top Bar Analysis */}
      <header style={{ borderBottom: '2px solid var(--border)', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--white)', flexWrap: 'nowrap', overflowX: 'auto', gap: '16px' }}>
        
        <div style={{ flexShrink: 0 }}>
          <p className="label mb-1" style={{ fontSize: '0.65rem' }}>Fit Analysis</p>
          <h2 style={{ fontSize: '1rem', margin: 0 }}>{application?.name || 'Demo Candidate'}</h2>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexShrink: 0, paddingLeft: '16px', borderLeft: '1px solid var(--border)' }}>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>{fitPct}%</div>
          <p className="label" style={{ color: 'var(--accent)', margin: 0, fontSize: '0.65rem' }}>{expl.fit_grade}</p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexShrink: 0, paddingLeft: '16px', borderLeft: '1px solid var(--border)' }}>
          <div className="stat-card" style={{ padding: '6px 10px', minWidth: '60px', textAlign: 'center' }}>
            <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--success)' }}>{expl.matched_count}</span>
            <span className="label" style={{ display: 'block', fontSize: '0.55rem' }}>Matched</span>
          </div>
          <div className="stat-card" style={{ padding: '6px 10px', minWidth: '60px', textAlign: 'center' }}>
            <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--error)' }}>{expl.missing_count}</span>
            <span className="label" style={{ display: 'block', fontSize: '0.55rem' }}>Gaps</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'nowrap', alignItems: 'center', gap: '6px', flexShrink: 0, paddingLeft: '16px', borderLeft: '1px solid var(--border)' }}>
          <p className="label" style={{ margin: '0 6px 0 0', fontSize: '0.65rem' }}>Critical Gaps</p>
          {gaps.map(g => (
            <div key={g.skill} style={{ padding: '4px 8px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, display: 'flex', gap: '6px' }}>
              <span>{g.skill}</span>
              <span style={{ color: 'var(--error)' }}>{Math.round(g.gap_priority * 100)}%</span>
            </div>
          ))}
        </div>


      </header>

      {/* Visualizer */}
      <div 
        ref={wrapRef}
        style={{ flex: 1, position: 'relative', overflow: 'hidden', cursor: stRef.current.dragging ? 'grabbing' : 'grab' }}
        onMouseDown={e => { stRef.current.dragging=true; stRef.current.lx=e.clientX; stRef.current.ly=e.clientY; }}
        onMouseUp={() => stRef.current.dragging=false}
        onMouseMove={onMouseMove}
        onWheel={e => { e.preventDefault(); const d=e.deltaY>0?0.9:1.1; stRef.current.scale=Math.min(4,Math.max(0.3,stRef.current.scale*d)); }}
      >
        <canvas ref={canvasRef} />
        
        {/* Legend Overlay */}
        <div style={{ position: 'absolute', bottom: '24px', left: '24px', padding: '16px', background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(8px)', border: '2px solid var(--border)', borderRadius: '0', display: 'flex', gap: '20px' }}>
          <LegendItem color={COLOR.MATCHED} label="Verified Match" />
          <LegendItem color={COLOR.MISSING} label="Skill Gap" />
          <LegendItem color={COLOR.DOMAIN} label="Context" />
        </div>
      </div>
    </div>
  );
};

const LegendItem = ({ color, label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)' }}>
    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: color }} />
    {label}
  </div>
);

export default SkillGraphPage;
