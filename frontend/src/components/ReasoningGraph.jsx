import React from 'react';
import { Check, Loader2 } from 'lucide-react';

// Vertical pipeline visualization with rippling glow on the active step.
export default function ReasoningGraph({ steps, activeIdx, mode }) {
  const accent = mode === 'debug' ? '#f87171'
                : mode === 'optimize' ? '#fbbf24'
                : mode === 'refactor' ? '#c084fc'
                : mode === 'test' ? '#34d399'
                : '#22d3ee';

  return (
    <div style={{ position: 'relative', padding: '16px 0' }}>
      {steps.map((step, i) => {
        const isActive = i === activeIdx;
        const isDone = step.done;
        return (
          <div key={i} style={{
            display: 'flex',
            gap: '16px',
            position: 'relative',
            marginBottom: i < steps.length - 1 ? '14px' : 0,
          }}>
            {i < steps.length - 1 && (
              <div style={{
                position: 'absolute',
                left: '17px', top: '36px', bottom: '-14px',
                width: '1px',
                background: isDone ? accent : 'rgba(255,255,255,0.1)',
                transition: 'background 0.4s',
                opacity: isDone ? 0.6 : 0.3,
              }} />
            )}
            <div style={{
              width: '36px', height: '36px',
              borderRadius: '50%',
              background: isDone ? `${accent}22` : 'rgba(255,255,255,0.04)',
              border: `1.5px solid ${isDone ? accent : isActive ? accent : 'rgba(255,255,255,0.15)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              position: 'relative',
              transition: 'all 0.3s',
              boxShadow: isActive ? `0 0 0 4px ${accent}22, 0 0 20px ${accent}66` : 'none',
            }}>
              {isDone ? (
                <Check size={14} style={{ color: accent }} />
              ) : isActive ? (
                <Loader2 size={14} className="spin" style={{ color: accent }} />
              ) : (
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>{i + 1}</span>
              )}
              {isActive && (
                <span style={{
                  position: 'absolute', inset: '-4px',
                  borderRadius: '50%',
                  border: `1.5px solid ${accent}`,
                  animation: 'ripple 1.4s ease-out infinite',
                }} />
              )}
            </div>
            <div style={{ flex: 1, paddingTop: '4px' }}>
              <div style={{
                fontFamily: 'JetBrains Mono',
                fontSize: '10px',
                color: isDone ? accent : 'rgba(255,255,255,0.4)',
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                fontWeight: 600,
                marginBottom: '3px',
                transition: 'color 0.3s',
              }}>{step.label}</div>
              <div style={{
                fontSize: '13px',
                color: isDone || isActive ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.4)',
                lineHeight: 1.5,
                transition: 'color 0.3s',
              }}>{step.text}</div>
              {isActive && step.subtask && (
                <div style={{
                  fontFamily: 'JetBrains Mono',
                  fontSize: '11px',
                  color: 'rgba(255,255,255,0.5)',
                  marginTop: '4px',
                  paddingLeft: '10px',
                  borderLeft: `2px solid ${accent}66`,
                }}>↳ {step.subtask}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
