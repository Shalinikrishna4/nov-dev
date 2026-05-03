import React, { useMemo } from 'react';
import { highlight, detectLanguage, computeDiff } from '../utils/syntax.jsx';

export function CodeBlock({ code, lang, maxHeight = 'none', highlightLines = [] }) {
  const lines = code.split('\n');
  const detectedLang = lang || detectLanguage(code);
  return (
    <div style={{
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '12.5px',
      lineHeight: '1.65',
      background: 'rgba(5, 5, 10, 0.6)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '8px',
      overflow: 'auto',
      maxHeight,
      backdropFilter: 'blur(8px)',
    }}>
      <div style={{ display: 'flex' }}>
        <div style={{
          padding: '14px 12px',
          color: 'rgba(255,255,255,0.25)',
          textAlign: 'right',
          userSelect: 'none',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          fontVariantNumeric: 'tabular-nums',
          fontSize: '11px',
        }}>
          {lines.map((_, i) => <div key={i} style={{
            background: highlightLines.includes(i + 1) ? 'rgba(248, 113, 113, 0.15)' : 'transparent',
            padding: '0 4px',
            margin: '0 -4px',
          }}>{i + 1}</div>)}
        </div>
        <pre style={{ margin: 0, padding: '14px 16px', flex: 1, overflow: 'auto', whiteSpace: 'pre' }}>
          <code>{highlight(code, detectedLang)}</code>
        </pre>
      </div>
    </div>
  );
}

export function DiffViewer({ oldCode, newCode, lang }) {
  const diff = useMemo(() => computeDiff(oldCode, newCode), [oldCode, newCode]);
  const detectedLang = lang || detectLanguage(newCode);
  const stats = diff.reduce((a, l) => {
    if (l.type === 'add') a.add++;
    else if (l.type === 'del') a.del++;
    return a;
  }, { add: 0, del: 0 });

  return (
    <div>
      <div style={{ display: 'flex', gap: '16px', marginBottom: '10px', fontFamily: 'JetBrains Mono', fontSize: '11px' }}>
        <span style={{ color: '#34d399' }}>+{stats.add} additions</span>
        <span style={{ color: '#f87171' }}>−{stats.del} deletions</span>
      </div>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '12px',
        lineHeight: '1.65',
        background: 'rgba(5, 5, 10, 0.6)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '8px',
        overflow: 'auto',
        maxHeight: '500px',
      }}>
        {diff.map((line, idx) => {
          const bg = line.type === 'add' ? 'rgba(52, 211, 153, 0.08)'
                  : line.type === 'del' ? 'rgba(248, 113, 113, 0.08)'
                  : 'transparent';
          const marker = line.type === 'add' ? '+' : line.type === 'del' ? '−' : ' ';
          const markerColor = line.type === 'add' ? '#34d399'
                            : line.type === 'del' ? '#f87171'
                            : 'rgba(255,255,255,0.3)';
          const text = line.type === 'del' ? line.old : line.new;
          return (
            <div key={idx} style={{ display: 'flex', background: bg }}>
              <div style={{
                width: '32px', textAlign: 'center', color: markerColor,
                userSelect: 'none', borderRight: '1px solid rgba(255,255,255,0.06)',
                padding: '0 4px', fontWeight: 700,
              }}>{marker}</div>
              <pre style={{ margin: 0, padding: '0 12px', flex: 1, whiteSpace: 'pre', overflow: 'auto' }}>
                <code>{highlight(text || '', detectedLang)}</code>
              </pre>
            </div>
          );
        })}
      </div>
    </div>
  );
}
