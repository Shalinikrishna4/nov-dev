import React, { useMemo } from 'react';
import { CodeBlock } from './CodeBlock.jsx';

// Lite markdown renderer: handles ```fenced blocks```, **bold**, `inline code`.
export function renderMarkdown(text) {
  if (!text) return null;
  const parts = text.split(/```(\w*)\n?([\s\S]*?)```/g);
  const out = [];
  for (let i = 0; i < parts.length; i += 3) {
    const prose = parts[i];
    const lang = parts[i + 1];
    const code = parts[i + 2];
    if (prose) {
      const segments = prose.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
      out.push(
        <div key={`p${i}`} style={{ whiteSpace: 'pre-wrap', lineHeight: 1.75, fontSize: '14px', color: 'rgba(255,255,255,0.85)' }}>
          {segments.map((seg, j) => {
            if (seg.startsWith('`') && seg.endsWith('`')) {
              return <code key={j} style={{
                fontFamily: 'JetBrains Mono, monospace',
                background: 'rgba(192, 132, 252, 0.12)',
                padding: '2px 7px',
                borderRadius: '4px',
                fontSize: '12.5px',
                color: '#c084fc',
                border: '1px solid rgba(192, 132, 252, 0.2)',
              }}>{seg.slice(1, -1)}</code>;
            }
            if (seg.startsWith('**') && seg.endsWith('**')) {
              return <strong key={j} style={{ color: '#22d3ee', fontWeight: 600 }}>{seg.slice(2, -2)}</strong>;
            }
            return <span key={j}>{seg}</span>;
          })}
        </div>
      );
    }
    if (code !== undefined) {
      out.push(<div key={`c${i}`} style={{ margin: '14px 0' }}><CodeBlock code={code.trimEnd()} lang={lang || undefined} /></div>);
    }
  }
  return out;
}

export function ResponseBlock({ text, accent }) {
  const sections = useMemo(() => {
    const lines = text.split('\n');
    const out = [];
    let current = { header: null, body: [] };
    for (const line of lines) {
      if (line.startsWith('### ')) {
        if (current.header || current.body.length) out.push(current);
        current = { header: line.slice(4).trim(), body: [] };
      } else {
        current.body.push(line);
      }
    }
    if (current.header || current.body.length) out.push(current);
    return out;
  }, [text]);

  return (
    <div>
      {sections.map((sec, i) => (
        <div key={i} style={{ marginBottom: '24px' }}>
          {sec.header && (
            <div style={{
              fontFamily: 'Space Grotesk, sans-serif',
              fontSize: '15px',
              fontWeight: 600,
              color: accent || '#fbbf24',
              marginBottom: '12px',
              paddingBottom: '8px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', gap: '10px',
              letterSpacing: '-0.01em',
            }}>
              <span style={{
                width: '6px', height: '6px', borderRadius: '50%',
                background: accent || '#fbbf24',
                boxShadow: `0 0 10px ${accent || '#fbbf24'}`,
              }} />
              {sec.header}
            </div>
          )}
          <div>{renderMarkdown(sec.body.join('\n'))}</div>
        </div>
      ))}
    </div>
  );
}
