import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';

export default function CommandPalette({ open, onClose, commands }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const filtered = useMemo(() => {
    if (!query) return commands;
    const q = query.toLowerCase();
    return commands.filter(c => c.label.toLowerCase().includes(q) || c.hint?.toLowerCase().includes(q));
  }, [query, commands]);

  useEffect(() => { setSelected(0); }, [query]);

  if (!open) return null;

  const handleKey = (e) => {
    if (e.key === 'Escape') onClose();
    else if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    else if (e.key === 'Enter' && filtered[selected]) { filtered[selected].action(); onClose(); }
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      paddingTop: '15vh',
      animation: 'fadeIn 0.15s ease-out',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '600px', maxWidth: '90vw',
        background: 'rgba(15, 15, 25, 0.95)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '14px',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(139, 92, 246, 0.2), 0 0 0 1px rgba(255,255,255,0.05)',
        animation: 'slideDown 0.2s ease-out',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          <Search size={16} style={{ color: 'rgba(255,255,255,0.5)' }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Type a command or search..."
            style={{
              flex: 1, background: 'transparent', border: 'none',
              color: '#fff', fontSize: '15px',
              fontFamily: 'Inter, sans-serif',
              outline: 'none',
            }}
          />
          <kbd style={{
            fontSize: '10px',
            color: 'rgba(255,255,255,0.4)',
            border: '1px solid rgba(255,255,255,0.15)',
            padding: '2px 6px', borderRadius: '4px',
          }}>ESC</kbd>
        </div>
        <div style={{ maxHeight: '50vh', overflow: 'auto' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
              No commands found
            </div>
          ) : filtered.map((cmd, i) => {
            const Icon = cmd.icon;
            return (
              <div
                key={cmd.label}
                onClick={() => { cmd.action(); onClose(); }}
                onMouseEnter={() => setSelected(i)}
                style={{
                  padding: '12px 20px',
                  display: 'flex', alignItems: 'center', gap: '12px',
                  background: i === selected ? 'rgba(139, 92, 246, 0.12)' : 'transparent',
                  borderLeft: i === selected ? '2px solid #c084fc' : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.1s',
                }}
              >
                {Icon && <Icon size={15} style={{ color: cmd.color || 'rgba(255,255,255,0.7)' }} />}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13.5px', color: '#fff' }}>{cmd.label}</div>
                  {cmd.hint && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{cmd.hint}</div>}
                </div>
                {cmd.shortcut && (
                  <kbd style={{
                    fontSize: '10px',
                    color: 'rgba(255,255,255,0.5)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    padding: '2px 6px', borderRadius: '3px',
                  }}>{cmd.shortcut}</kbd>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
