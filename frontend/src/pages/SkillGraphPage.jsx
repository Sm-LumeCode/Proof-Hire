import React, { useEffect, useRef, useState } from 'react';

// Embedded graph data from proofhire_output.json
const GRAPH_DATA = {"graph":{"nodes":[{"id":"SQLAlchemy","label":"SQLAlchemy","status":"DOMAIN","impact_score":0.1474,"learnability":0.5,"downstream_count":0},{"id":"GitLab","label":"GitLab","status":"DOMAIN","impact_score":0.1492,"learnability":0.5,"downstream_count":0},{"id":"Git","label":"Git","status":"EXTRA","impact_score":0.1847,"learnability":0.9,"downstream_count":2},{"id":"AWS","label":"AWS","status":"DOMAIN","impact_score":0.1741,"learnability":0.55,"downstream_count":2},{"id":"JWT","label":"JWT","status":"DOMAIN","impact_score":0.1231,"learnability":0.72,"downstream_count":0},{"id":"MySQL","label":"MySQL","status":"DOMAIN","impact_score":0.1535,"learnability":0.5,"downstream_count":0},{"id":"Django","label":"Django","status":"EXTRA","impact_score":0.1544,"learnability":0.7,"downstream_count":9},{"id":"Flask","label":"Flask","status":"MISSING","impact_score":0.1493,"learnability":0.8,"downstream_count":11,"skill_match":14.5,"gap_priority":0.3732},{"id":"Python","label":"Python","status":"MATCHED","impact_score":0.57,"learnability":0.85,"downstream_count":23,"skill_match":65,"github_evidence":41,"github_metrics":{"total_repos":9,"total_stars":0,"deployed_apps":true}},{"id":"GitHub","label":"GitHub","status":"DOMAIN","impact_score":0.1493,"learnability":0.85,"downstream_count":0},{"id":"PostgreSQL","label":"PostgreSQL","status":"DOMAIN","impact_score":0.1487,"learnability":0.7,"downstream_count":1},{"id":"Machine Learning","label":"Machine Learning","status":"DOMAIN","impact_score":0.1981,"learnability":0.55,"downstream_count":6},{"id":"FastAPI","label":"FastAPI","status":"DOMAIN","impact_score":0.1566,"learnability":0.75,"downstream_count":9},{"id":"Programming","label":"Programming","status":"DOMAIN","impact_score":0.3035,"learnability":0.5,"downstream_count":24},{"id":"DevOps","label":"DevOps","status":"DOMAIN","impact_score":0.3311,"learnability":0.5,"downstream_count":10},{"id":"Backend Developer","label":"Backend Developer","status":"JOB_ROLE","fit_score_val":0.4746,"impact_score":0.1779,"learnability":0.5,"downstream_count":24},{"id":"Docker Compose","label":"Docker Compose","status":"DOMAIN","impact_score":0.1492,"learnability":0.7,"downstream_count":0},{"id":"Kubernetes","label":"Kubernetes","status":"DOMAIN","impact_score":0.1494,"learnability":0.4,"downstream_count":0},{"id":"Docker","label":"Docker","status":"MISSING","impact_score":0.2613,"learnability":0.65,"downstream_count":5,"skill_match":17.8,"gap_priority":0.402},{"id":"Engineering","label":"Engineering","status":"DOMAIN","impact_score":0.3035,"learnability":0.5,"downstream_count":3},{"id":"SQL","label":"SQL","status":"EXTRA","impact_score":0.185,"learnability":0.8,"downstream_count":2},{"id":"NumPy","label":"NumPy","status":"DOMAIN","impact_score":0.1665,"learnability":0.8,"downstream_count":2},{"id":"Backend","label":"Backend","status":"DOMAIN","impact_score":0.3066,"learnability":0.5,"downstream_count":6},{"id":"REST API","label":"REST API","status":"MISSING","impact_score":0.1726,"learnability":0.75,"downstream_count":8,"skill_match":15.2,"gap_priority":0.4603},{"id":"OpenAPI","label":"OpenAPI","status":"DOMAIN","impact_score":0.1234,"learnability":0.7,"downstream_count":0}],"edges":[{"source":"Programming","target":"Python","edge_type":"DOMAIN","is_gap_path":false},{"source":"Python","target":"Flask","edge_type":"DEPENDENCY","is_gap_path":true},{"source":"Python","target":"Django","edge_type":"DEPENDENCY","is_gap_path":false},{"source":"Python","target":"FastAPI","edge_type":"DEPENDENCY","is_gap_path":false},{"source":"Python","target":"SQLAlchemy","edge_type":"DEPENDENCY","is_gap_path":false},{"source":"Python","target":"NumPy","edge_type":"DEPENDENCY","is_gap_path":false},{"source":"Python","target":"Machine Learning","edge_type":"DOMAIN","is_gap_path":false},{"source":"Flask","target":"REST API","edge_type":"STACK","is_gap_path":true},{"source":"Flask","target":"FastAPI","edge_type":"SIBLING","is_gap_path":true},{"source":"Flask","target":"Django","edge_type":"SIBLING","is_gap_path":true},{"source":"Django","target":"REST API","edge_type":"STACK","is_gap_path":true},{"source":"FastAPI","target":"REST API","edge_type":"STACK","is_gap_path":true},{"source":"REST API","target":"OpenAPI","edge_type":"DEPENDENCY","is_gap_path":true},{"source":"REST API","target":"JWT","edge_type":"STACK","is_gap_path":true},{"source":"REST API","target":"Docker","edge_type":"STACK","is_gap_path":true},{"source":"Backend","target":"SQL","edge_type":"DOMAIN","is_gap_path":false},{"source":"SQL","target":"PostgreSQL","edge_type":"DEPENDENCY","is_gap_path":false},{"source":"SQL","target":"MySQL","edge_type":"DEPENDENCY","is_gap_path":false},{"source":"PostgreSQL","target":"MySQL","edge_type":"SIBLING","is_gap_path":false},{"source":"DevOps","target":"Docker","edge_type":"DOMAIN","is_gap_path":true},{"source":"Docker","target":"Kubernetes","edge_type":"STACK","is_gap_path":true},{"source":"Docker","target":"Docker Compose","edge_type":"DEPENDENCY","is_gap_path":true},{"source":"Docker","target":"AWS","edge_type":"STACK","is_gap_path":true},{"source":"Engineering","target":"Git","edge_type":"DOMAIN","is_gap_path":false},{"source":"Git","target":"GitHub","edge_type":"DEPENDENCY","is_gap_path":false},{"source":"Git","target":"GitLab","edge_type":"DEPENDENCY","is_gap_path":false},{"source":"Backend Developer","target":"Docker","edge_type":"CORE_REQUIREMENT","is_gap_path":true},{"source":"Backend Developer","target":"Flask","edge_type":"CORE_REQUIREMENT","is_gap_path":true},{"source":"Backend Developer","target":"Python","edge_type":"CORE_REQUIREMENT","is_gap_path":false},{"source":"Backend Developer","target":"REST API","edge_type":"CORE_REQUIREMENT","is_gap_path":true}]},"gap_analysis":{"gaps":[{"skill":"REST API","gap_priority":0.4603,"impact_score":0.1726,"learnability":0.75,"learning_path":["Django","REST API"]},{"skill":"Docker","gap_priority":0.402,"impact_score":0.2613,"learnability":0.65,"learning_path":["Python","Backend Developer","Docker"]},{"skill":"Flask","gap_priority":0.3732,"impact_score":0.1493,"learnability":0.8,"learning_path":["Python","Backend Developer","Flask"]}]},"explainability":{"fit_score":0.4746,"fit_grade":"PARTIAL FIT","matched_count":1,"missing_count":3,"extra_count":3,"narrative":"Candidate achieves a 47.5% weighted skill fit against the job requirements. They directly match 1 of 4 required skills. Key gaps include: Flask, REST API, Docker. Candidate's experience in Django provides a foundation to bridge these gaps."}};

const COLOR = { MATCHED:'#00d68f', MISSING:'#ff4d6d', EXTRA:'#4d9fff', DOMAIN:'#3d4260', JOB_ROLE:'#7c5cfc' };
const STROKE = { MATCHED:'#00a86b', MISSING:'#cc1f3e', EXTRA:'#1a6fcc', DOMAIN:'#5c6280', JOB_ROLE:'#fff' };

const SkillGraphPage = () => {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const stRef = useRef({ scale:1, tx:0, ty:0, dash:0, dragging:false, lx:0, ly:0, hovered:null, nodes:[], edges:[], byId:{} });
  const [hovered, setHovered] = useState(null);

  const expl = GRAPH_DATA.explainability;
  const gaps = GRAPH_DATA.gap_analysis.gaps;
  const fitPct = (expl.fit_score * 100).toFixed(1);
  const longestPath = gaps.reduce((a,b) => b.learning_path.length > a.learning_path.length ? b : a).learning_path;

  useEffect(() => {
    const nodes = GRAPH_DATA.graph.nodes.map(n => ({ ...n, px:0.5, py:0.5 }));
    const byId = {}; nodes.forEach(n => byId[n.id] = n);
    const edges = GRAPH_DATA.graph.edges;

    // Radial layout
    const cx=0.5, cy=0.5;
    const coreEdges = edges.filter(e => e.source==='Backend Developer'||e.target==='Backend Developer');
    const coreIds = new Set(coreEdges.map(e => e.source==='Backend Developer'?e.target:e.source));
    if(byId['Backend Developer']){byId['Backend Developer'].px=cx;byId['Backend Developer'].py=cy;}
    const coreN = nodes.filter(n=>coreIds.has(n.id));
    coreN.forEach((n,i) => { const a=(i/coreN.length)*Math.PI*2; n.px=cx+Math.cos(a)*0.22; n.py=cy+Math.sin(a)*0.22; });
    const l1 = new Set(coreN.map(n=>n.id));
    const l2 = nodes.filter(n => { if(n.status==='JOB_ROLE'||l1.has(n.id)) return false; return edges.some(e=>(l1.has(e.source)&&e.target===n.id)||(l1.has(e.target)&&e.source===n.id)); });
    l2.forEach((n,i) => { const a=(i/l2.length)*Math.PI*2+0.2; n.px=cx+Math.cos(a)*0.38; n.py=cy+Math.sin(a)*0.38; });
    const placed = new Set([...coreIds,...l2.map(n=>n.id),'Backend Developer']);
    nodes.filter(n=>!placed.has(n.id)).forEach((n,i,arr) => { const a=(i/arr.length)*Math.PI*2-0.1; n.px=cx+Math.cos(a)*0.46; n.py=cy+Math.sin(a)*0.46; });

    stRef.current = { ...stRef.current, nodes, edges, byId };

    const canvas = canvasRef.current; const wrap = wrapRef.current;
    if(!canvas||!wrap) return;

    const resize = () => {
      const r=wrap.getBoundingClientRect(); const W=r.width; const H=r.height;
      canvas.width=W*devicePixelRatio; canvas.height=H*devicePixelRatio;
      canvas.style.width=W+'px'; canvas.style.height=H+'px';
      const c=canvas.getContext('2d'); c.scale(devicePixelRatio,devicePixelRatio);
    };
    resize(); window.addEventListener('resize',resize);

    const nodeR = n => n.status==='JOB_ROLE'?45:Math.max(10,8+Math.sqrt(n.downstream_count||0)*3);
    let animId;

    const draw = () => {
      const c=canvas.getContext('2d'); if(!c) return;
      const {width:rw,height:rh}=wrap.getBoundingClientRect();
      const {scale,tx,ty,dash,nodes:ns,edges:es,byId:bi,hovered:hv}=stRef.current;
      const ts=(nx,ny)=>[nx*rw*scale+tx,ny*rh*scale+ty];
      c.clearRect(0,0,rw,rh);
      // BG
      c.fillStyle='#0d0f14'; c.fillRect(0,0,rw,rh);
      // Grid
      c.fillStyle='rgba(255,255,255,0.03)';
      for(let gx=0;gx<rw;gx+=40) for(let gy=0;gy<rh;gy+=40){ c.beginPath();c.arc(gx,gy,1,0,Math.PI*2);c.fill(); }
      // Edges
      es.forEach(e => {
        const a=bi[e.source],b=bi[e.target]; if(!a||!b) return;
        const [ax,ay]=ts(a.px,a.py),[bx,by]=ts(b.px,b.py);
        const rel=!hv||hv===e.source||hv===e.target; const op=rel?1:0.15;
        c.beginPath();c.moveTo(ax,ay);c.lineTo(bx,by);
        c.setLineDash([3,3]);c.lineDashOffset=-dash;
        if(e.edge_type==='CORE_REQUIREMENT'){
          c.strokeStyle=e.is_gap_path?`rgba(255,77,109,${0.7*op})`:`rgba(124,92,252,${0.5*op})`;c.lineWidth=1.5;
        } else {
          c.strokeStyle=e.is_gap_path?`rgba(255,77,109,${0.5*op})`:`rgba(255,255,255,${0.08*op})`;c.lineWidth=0.8;
        }
        c.stroke();c.setLineDash([]);
      });
      // Nodes
      ns.forEach(n => {
        const [sx,sy]=ts(n.px,n.py); const r=nodeR(n)*scale; const isH=hv===n.id;
        if(n.status==='MATCHED'||n.status==='MISSING'||n.status==='JOB_ROLE'){
          c.beginPath();c.arc(sx,sy,r+(n.status==='JOB_ROLE'?15:8)*scale,0,Math.PI*2);
          const grd=c.createRadialGradient(sx,sy,r*0.5,sx,sy,r+(n.status==='JOB_ROLE'?15:8)*scale);
          let cl=n.status==='MATCHED'?'0,214,143':'255,77,109'; if(n.status==='JOB_ROLE') cl='124,92,252';
          grd.addColorStop(0,`rgba(${cl},0.3)`);grd.addColorStop(1,`rgba(${cl},0)`);c.fillStyle=grd;c.fill();
        }
        if(isH){c.beginPath();c.arc(sx,sy,r+6*scale,0,Math.PI*2);c.fillStyle='rgba(255,255,255,0.06)';c.fill();}
        c.beginPath();c.arc(sx,sy,r,0,Math.PI*2);c.fillStyle=COLOR[n.status]||'#3d4260';c.fill();
        c.strokeStyle=isH?'#fff':(STROKE[n.status]||'#5c6280');c.lineWidth=isH?2:0.8;c.stroke();
        // Label
        const fs=Math.max(9,Math.min(13,11*scale));
        const rel2=!hv||hv===n.id||es.some(e=>(e.source===n.id&&e.target===hv)||(e.target===n.id&&e.source===hv));
        c.font=`${n.status==='MATCHED'||n.status==='MISSING'?'600':'400'} ${fs}px 'IBM Plex Mono',monospace`;
        c.textAlign='center';
        const ly=sy+r+4*scale+fs; const tw=c.measureText(n.label).width;
        c.fillStyle=`rgba(13,15,20,${0.75*(rel2?1:0.3)})`;c.fillRect(sx-tw/2-3,ly-fs,tw+6,fs+2);
        c.fillStyle=isH?COLOR[n.status]:(n.status==='DOMAIN'?`rgba(200,204,220,${0.5*(rel2?1:0.3)})`:`rgba(200,204,220,${0.85*(rel2?1:0.3)})`);
        c.fillText(n.label,sx,ly);
      });
      stRef.current.dash+=0.2;
      animId=requestAnimationFrame(draw);
    };
    animId=requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize',resize); };
  }, [hovered]);

  const onMouseMove = (e) => {
    const st=stRef.current; const r=canvasRef.current.getBoundingClientRect();
    if(st.dragging){ st.tx+=e.clientX-st.lx;st.ty+=e.clientY-st.ly;st.lx=e.clientX;st.ly=e.clientY; return; }
    const mx=e.clientX-r.left,my=e.clientY-r.top;
    const nodeR=n=>n.status==='JOB_ROLE'?45:Math.max(10,8+Math.sqrt(n.downstream_count||0)*3);
    let found=null;
    for(let i=st.nodes.length-1;i>=0;i--){
      const n=st.nodes[i];const sx=n.px*r.width*st.scale+st.tx;const sy=n.py*r.height*st.scale+st.ty;
      if(Math.hypot(mx-sx,my-sy)<=nodeR(n)*st.scale+5){found=n.id;break;}
    }
    st.hovered=found; setHovered(found);
  };

  const fitColor = expl.fit_score>=0.65?'#00d68f':expl.fit_score>=0.45?'#ffb347':'#ff4d6d';

  return (
    <div style={{ display:'grid', gridTemplateColumns:'300px 1fr', gridTemplateRows:'auto 1fr', height:'calc(100vh - 64px)', background:'#0d0f14', color:'#e8eaf0', fontFamily:"'Syne',sans-serif" }}>
      {/* Header */}
      <div style={{ gridColumn:'1/-1', padding:'20px 28px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#13161e' }}>
        <div style={{ fontSize:'18px', fontWeight:700, fontFamily:'Syne,sans-serif' }}>Proof<span style={{color:'#c8ff00'}}>Hire</span> <span style={{color:'#444', fontFamily:'IBM Plex Mono,monospace', fontSize:'13px', marginLeft:'8px'}}>/ SKILL GRAPH</span></div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:'11px', letterSpacing:'1.5px', textTransform:'uppercase', color:'#7a7f94', fontFamily:'IBM Plex Mono,monospace' }}>{expl.fit_grade}</div>
          <div style={{ fontSize:'28px', fontWeight:500, fontFamily:'IBM Plex Mono,monospace', color:fitColor }}>{fitPct}%</div>
        </div>
      </div>

      {/* Sidebar */}
      <aside style={{ background:'#13161e', borderRight:'1px solid rgba(255,255,255,0.07)', overflowY:'auto', padding:'20px 16px', display:'flex', flexDirection:'column', gap:'20px' }}>
        <div>
          <div style={secTitle}>FIT SUMMARY</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px' }}>
            <StatCard num={expl.matched_count} label="Matched" color="#00d68f" />
            <StatCard num={expl.missing_count} label="Missing" color="#ff4d6d" />
            <StatCard num={expl.extra_count} label="Extra" color="#4d9fff" />
          </div>
        </div>
        <div>
          <div style={secTitle}>LEGEND</div>
          <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
            <LegendDot color="#00d68f" label="Matched skill" />
            <LegendDot color="#ff4d6d" label="Missing (gap)" />
            <LegendDot color="#4d9fff" label="Extra skill" />
            <LegendDot color="#3d4260" label="Domain context" />
          </div>
        </div>
        <div>
          <div style={secTitle}>CRITICAL GAPS</div>
          <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
            {gaps.map((g,i) => {
              const pct=Math.round(g.gap_priority*100);
              const bc=i===0?'#ff4d6d':i===1?'#ffb347':'#4d9fff';
              return (
                <div key={g.skill} style={{ background:'#1a1e2a', borderRadius:'8px', padding:'10px 12px', borderLeft:`3px solid ${bc}` }}>
                  <div style={{ fontSize:'13px', fontWeight:600 }}>{g.skill}</div>
                  <div style={{ fontSize:'11px', color:'#7a7f94', marginTop:'4px', fontFamily:'IBM Plex Mono,monospace' }}>Priority {pct}%</div>
                  <div style={{ background:'rgba(255,255,255,0.06)', borderRadius:'3px', height:'3px', marginTop:'8px' }}>
                    <div style={{ height:'3px', borderRadius:'3px', background:bc, width:`${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div>
          <div style={secTitle}>LEARNING PATH</div>
          <div style={{ display:'flex', alignItems:'center', flexWrap:'wrap', gap:'4px' }}>
            {longestPath.map((n,i) => (
              <React.Fragment key={n}>
                <span style={{ fontSize:'11px', padding:'3px 8px', borderRadius:'4px', background:'#1a1e2a', border:'1px solid rgba(255,255,255,0.07)', fontFamily:'IBM Plex Mono,monospace' }}>{n}</span>
                {i < longestPath.length-1 && <span style={{ color:'#7a7f94', fontSize:'11px' }}>→</span>}
              </React.Fragment>
            ))}
          </div>
        </div>
        <div>
          <div style={secTitle}>ANALYSIS</div>
          <div style={{ fontSize:'12px', color:'#7a7f94', lineHeight:1.7, padding:'10px 12px', background:'#1a1e2a', borderRadius:'8px', border:'1px solid rgba(255,255,255,0.07)' }}>
            {expl.narrative}
          </div>
        </div>
      </aside>

      {/* Canvas */}
      <div ref={wrapRef} style={{ position:'relative', overflow:'hidden' }}
        onMouseDown={e => { stRef.current.dragging=true; stRef.current.lx=e.clientX; stRef.current.ly=e.clientY; }}
        onMouseUp={() => stRef.current.dragging=false}
        onMouseLeave={() => { stRef.current.dragging=false; stRef.current.hovered=null; setHovered(null); }}
        onMouseMove={onMouseMove}
        onWheel={e => { e.preventDefault(); const d=e.deltaY>0?0.9:1.1; stRef.current.scale=Math.min(4,Math.max(0.3,stRef.current.scale*d)); }}
      >
        <canvas ref={canvasRef} style={{ display:'block', cursor: stRef.current.dragging?'grabbing':'default' }} />
        <div style={{ position:'absolute', bottom:'16px', right:'16px', display:'flex', gap:'6px' }}>
          <CtrlBtn label="+" onClick={() => { stRef.current.scale=Math.min(4,stRef.current.scale*1.2); }} />
          <CtrlBtn label="−" onClick={() => { stRef.current.scale=Math.max(0.3,stRef.current.scale*0.8); }} />
          <CtrlBtn label="⟳" onClick={() => { stRef.current.scale=1;stRef.current.tx=0;stRef.current.ty=0; }} />
        </div>
      </div>
    </div>
  );
};

const secTitle = { fontSize:'10px', letterSpacing:'2px', textTransform:'uppercase', color:'#7a7f94', fontFamily:'IBM Plex Mono,monospace', marginBottom:'10px' };

const StatCard = ({ num, label, color }) => (
  <div style={{ background:'#1a1e2a', borderRadius:'8px', padding:'10px 8px', textAlign:'center', border:'1px solid rgba(255,255,255,0.07)' }}>
    <div style={{ fontSize:'22px', fontWeight:700, fontFamily:'IBM Plex Mono,monospace', color }}>{num}</div>
    <div style={{ fontSize:'10px', color:'#7a7f94', marginTop:'2px' }}>{label}</div>
  </div>
);

const LegendDot = ({ color, label }) => (
  <div style={{ display:'flex', alignItems:'center', gap:'8px', fontSize:'12px' }}>
    <div style={{ width:'10px', height:'10px', borderRadius:'50%', background:color, flexShrink:0 }} />
    {label}
  </div>
);

const CtrlBtn = ({ label, onClick }) => (
  <button onClick={onClick} style={{ background:'#13161e', border:'1px solid rgba(255,255,255,0.07)', color:'#e8eaf0', borderRadius:'6px', padding:'6px 10px', cursor:'pointer', fontSize:'16px' }}>{label}</button>
);

export default SkillGraphPage;
