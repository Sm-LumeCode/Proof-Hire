import React from 'react';

export const Roadmap = ({ data }) => {
  const gaps = data?.gap_analysis?.gaps || [];

  if (!data || gaps.length === 0) {
    return (
      <div className="roadmap-empty-box" style={{ 
        textAlign: 'center', 
        padding: '80px', 
        background: 'white', 
        borderRadius: '24px', 
        border: '1px solid #E2E8F0',
        margin: '20px'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🌟</div>
        <h3 style={{ color: '#2D3748', fontWeight: 800 }}>Mastery Achieved</h3>
        <p style={{ color: '#718096' }}>No technical gaps identified for this role.</p>
      </div>
    );
  }

  const roadNodes = [];
  gaps.forEach((gap) => {
    roadNodes.push({ type: 'basics', skill: gap.skill, label: `Basics: ${gap.skill}`, week: 'Week 1', color: '#38A3A5', gap });
    roadNodes.push({ type: 'advanced', skill: gap.skill, label: `Advanced: ${gap.skill}`, week: 'Week 2', color: '#e63946', gap });
    roadNodes.push({ type: 'integration', skill: gap.skill, label: `Integration: ${data?.job_title}`, week: 'Week 3', color: '#f39c12', gap });
    roadNodes.push({ type: 'crown', skill: gap.skill, label: `${gap.skill} Mastery`, week: 'Done', color: '#FFD700', gap });
  });

  const stepY = 280; 
  const amplitude = 300; // Slightly reduced to guarantee space
  const svgHeight = roadNodes.length * stepY + 200;

  const generatePath = () => {
    let d = "M 0,0 L 0,80";
    for (let i = 0; i < roadNodes.length; i++) {
      const y0 = 80 + i * stepY;
      const y1 = 80 + (i + 1) * stepY;
      const xSign = i % 2 === 0 ? 1 : -1;
      const xApex = xSign * amplitude;
      const yApex = y0 + stepY / 2;
      d += ` C 0,${y0 + 70} ${xApex},${y0 + 70} ${xApex},${yApex}`;
      d += ` C ${xApex},${y1 - 70} 0,${y1 - 70} 0,${y1}`;
    }
    return d;
  };

  return (
    <div className="roadmap-outer-container" style={{ padding: '20px' }}>
      <div className="roadmap-main-box" style={{ 
        background: '#fff', 
        borderRadius: '32px', 
        border: '1px solid #E2E8F0', 
        boxShadow: '0 10px 40px rgba(0,0,0,0.03)',
        overflow: 'hidden',
        position: 'relative'
      }}>
        <div className="roadmap-header" style={{ padding: '40px', borderBottom: '1px solid #F7FAFC', textAlign: 'center', background: '#F8FCFC' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 900, color: '#38A3A5', letterSpacing: '2px' }}>EVOLUTION PATH</span>
          <h2 style={{ margin: '12px 0 4px', fontSize: '2rem', fontWeight: 900, color: '#2D3748' }}>Technical Odyssey</h2>
          <p style={{ color: '#718096', fontSize: '1rem' }}>Personalized roadmap for <b>{data?.job_title}</b></p>
        </div>

        <div className="road-scroll-area" style={{ padding: '40px 0' }}>
          <svg 
            width="100%" 
            height={svgHeight} 
            viewBox={`-800 0 1600 ${svgHeight}`} 
            style={{ display: 'block', overflow: 'visible' }}
            preserveAspectRatio="xMidYMin meet"
          >
            <path d={generatePath()} stroke="#2D3748" strokeWidth="90" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d={generatePath()} stroke="rgba(255,255,255,0.2)" strokeWidth="3" strokeDasharray="15,20" fill="none" />

            {roadNodes.map((node, i) => {
              const yStart = 80 + i * stepY;
              const yApex = yStart + stepY / 2;
              const xSign = i % 2 === 0 ? 1 : -1;
              const xApex = xSign * amplitude;

              return (
                <g key={i} transform={`translate(${xApex}, ${yApex})`}>
                  <circle r="38" fill="white" stroke={node.color} strokeWidth="8" />
                  {node.type === 'crown' ? (
                    <text y="10" textAnchor="middle" fontSize="30">👑</text>
                  ) : (
                    <text y="8" textAnchor="middle" fontSize="16" fontWeight="900" fill={node.color}>
                      {i % 4 + 1}
                    </text>
                  )}

                  <g transform="translate(0, -65)">
                     <rect x="-35" y="-12" width="70" height="24" rx="12" fill="#1A202C" />
                     <text textAnchor="middle" y="4" fontSize="9" fill="white" fontWeight="900">{node.week.toUpperCase()}</text>
                  </g>

                  <foreignObject 
                    x={xSign > 0 ? 80 : -460} 
                    y={-110} 
                    width="380" 
                    height="280"
                    style={{ overflow: 'visible' }}
                  >
                    <div className="roadmap-card-v2" style={{ 
                      padding: '28px', 
                      background: 'white', 
                      borderRadius: '24px', 
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 8px 25px rgba(0,0,0,0.06)',
                      textAlign: xSign > 0 ? 'left' : 'right',
                      position: 'relative'
                    }}>
                      <div style={{ position: 'absolute', top: 0, left: xSign > 0 ? 0 : 'auto', right: xSign < 0 ? 0 : 'auto', height: '100%', width: '4px', background: node.color, borderRadius: '4px 0 0 4px' }} />
                      <span style={{ fontSize: '0.65rem', fontWeight: 800, color: node.color, textTransform: 'uppercase', letterSpacing: '1px' }}>{node.skill}</span>
                      <h4 style={{ margin: '8px 0', fontSize: '1.25rem', fontWeight: 800, color: '#1A202C' }}>{node.label}</h4>
                      <p style={{ fontSize: '0.88rem', color: '#4A5568', margin: 0, lineHeight: 1.6 }}>Bridge your expertise with targeted practice in {node.skill}.</p>
                    </div>
                  </foreignObject>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .roadmap-card-v2 { transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s; cursor: default; }
        .roadmap-card-v2:hover { transform: translateY(-8px) scale(1.02); boxShadow: 0 20px 40px rgba(0,0,0,0.1) !important; }
      `}} />
    </div>
  );
};
