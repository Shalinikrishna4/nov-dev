import React from 'react';
import { X, Trash2 } from 'lucide-react';
import { MODES } from '../utils/modes.js';

export default function HistoryDrawer({ open, sessions, activeSessionId, onClose, onLoad, onDelete }) {
  if (!open) return null;

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
      display: 'flex', justifyContent: 'flex-end',
      animation: 'fadeIn 0.2s ease-out',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '440px', maxWidth: '90vw',
        background: 'rgba(10, 10, 18, 0.95)',
        backdropFilter: 'blur(24px)',
        borderLeft: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', flexDirection: 'column',
        animation: 'slideRight 0.25s ease-out',
      }}>
        <div style={{
          padding: '24px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{
              fontFamily: 'Instrument Serif, serif',
              fontStyle: 'italic',
              fontSize: '24px',
              color: '#fff',
            }}>Sessions</div>
            <div style={{
              fontFamily: 'JetBrains Mono', fontSize: '10px',
              color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.12em',
              marginTop: '4px',
            }}>{sessions.length} saved</div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.7)', padding: '8px',
            borderRadius: '6px',
          }}><X size={14} /></button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '14px' }}>
          {sessions.length === 0 ? (
            <div style={{
              padding: '60px 20px', textAlign: 'center',
              color: 'rgba(255,255,255,0.4)', fontSize: '12px',
              fontFamily: 'JetBrains Mono',
            }}>// no sessions yet</div>
          ) : sessions.map(s => {
            const m = MODES[s.mode];
            const Icon = m.icon;
            const time = new Date(s.timestamp);
            const preview = (s.error_text?.split('\n')[0]) || s.code.split('\n')[0];
            return (
              <div
                key={s.id}
                onClick={() => onLoad(s)}
                className="hover-lift"
                style={{
                  padding: '14px',
                  borderRadius: '10px',
                  border: `1px solid ${activeSessionId === s.id ? m.accent : 'rgba(255,255,255,0.06)'}`,
                  background: activeSessionId === s.id ? `rgba(${m.accentRgb}, 0.06)` : 'rgba(255,255,255,0.02)',
                  marginBottom: '8px',
                  cursor: 'pointer',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    color: m.accent, fontFamily: 'JetBrains Mono',
                    fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em',
                    fontWeight: 600,
                  }}>
                    <Icon size={11} /> {m.label}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}
                    style={{
                      background: 'transparent', border: 'none',
                      color: 'rgba(255,255,255,0.4)', padding: '2px',
                    }}
                  ><Trash2 size={11} /></button>
                </div>
                <div style={{
                  fontFamily: 'JetBrains Mono', fontSize: '11.5px',
                  color: 'rgba(255,255,255,0.85)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  marginBottom: '8px',
                }}>{preview}</div>
                <div style={{
                  fontFamily: 'JetBrains Mono', fontSize: '9.5px',
                  color: 'rgba(255,255,255,0.35)',
                  display: 'flex', justifyContent: 'space-between',
                }}>
                  <span>{s.language} • {s.tokens || 0}tk</span>
                  <span>{time.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
