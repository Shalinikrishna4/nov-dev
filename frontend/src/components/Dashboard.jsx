import React, { useEffect, useState } from 'react';
import { X, BarChart3, Hash, Layers, Code2, Activity } from 'lucide-react';
import { api } from '../utils/api.js';
import { MODES } from '../utils/modes.js';

export default function Dashboard({ open, onClose }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setLoading(true);
      api.stats().then(setStats).catch(() => {}).finally(() => setLoading(false));
    }
  }, [open]);

  if (!open) return null;

  const maxModeCount = stats ? Math.max(1, ...Object.values(stats.by_mode || {})) : 1;
  const maxLangCount = stats ? Math.max(1, ...Object.values(stats.by_language || {})) : 1;

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn 0.2s ease-out',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '720px', maxWidth: '92vw', maxHeight: '85vh',
        background: 'rgba(10, 10, 18, 0.95)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px',
        overflow: 'hidden',
        animation: 'slideUp 0.25s ease-out',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          padding: '24px 28px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{
              fontFamily: 'Instrument Serif, serif',
              fontStyle: 'italic',
              fontSize: '28px',
              color: '#fff',
              letterSpacing: '-0.01em',
            }}>Dashboard</div>
            <div style={{
              fontFamily: 'JetBrains Mono', fontSize: '10px',
              color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.12em',
              marginTop: '4px',
            }}>aggregate analytics across all sessions</div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.7)', padding: '8px',
            borderRadius: '6px',
          }}><X size={14} /></button>
        </div>

        <div style={{ padding: '28px', overflow: 'auto' }}>
          {loading && (
            <div style={{
              padding: '60px', textAlign: 'center',
              color: 'rgba(255,255,255,0.5)', fontFamily: 'JetBrains Mono', fontSize: '12px',
            }}>Loading stats...</div>
          )}
          {stats && !loading && (
            <>
              {/* Top counters */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', marginBottom: '28px' }}>
                <StatCard
                  icon={Layers}
                  label="Total Sessions"
                  value={stats.total_sessions.toLocaleString()}
                  color="#c084fc"
                  subtitle="all-time analyses run"
                />
                <StatCard
                  icon={Activity}
                  label="Tokens Used"
                  value={stats.total_tokens.toLocaleString()}
                  color="#22d3ee"
                  subtitle={`≈ $${(stats.total_tokens * 0.000003).toFixed(4)} estimated`}
                />
              </div>

              {/* By Mode */}
              <div style={{ marginBottom: '28px' }}>
                <div style={{
                  fontFamily: 'JetBrains Mono', fontSize: '11px',
                  color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.12em',
                  marginBottom: '14px',
                  display: 'flex', alignItems: 'center', gap: '8px',
                }}><BarChart3 size={12} /> usage by mode</div>
                {Object.keys(stats.by_mode || {}).length === 0 ? (
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontFamily: 'JetBrains Mono' }}>
                    // no data yet — run an analysis
                  </div>
                ) : Object.entries(stats.by_mode).sort((a, b) => b[1] - a[1]).map(([mode, count]) => {
                  const m = MODES[mode];
                  const Icon = m?.icon || Code2;
                  const pct = (count / maxModeCount) * 100;
                  return (
                    <div key={mode} style={{ marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Icon size={12} style={{ color: m?.accent || '#fff' }} />
                          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', textTransform: 'capitalize' }}>{mode}</span>
                        </div>
                        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '12px', color: m?.accent || '#fff', fontWeight: 600 }}>{count}</span>
                      </div>
                      <div style={{
                        height: '6px',
                        background: 'rgba(255,255,255,0.04)',
                        borderRadius: '3px',
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${pct}%`,
                          background: `linear-gradient(90deg, ${m?.accent || '#fff'}88, ${m?.accent || '#fff'})`,
                          transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                          boxShadow: `0 0 12px ${m?.accent || '#fff'}66`,
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* By Language */}
              <div>
                <div style={{
                  fontFamily: 'JetBrains Mono', fontSize: '11px',
                  color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.12em',
                  marginBottom: '14px',
                  display: 'flex', alignItems: 'center', gap: '8px',
                }}><Hash size={12} /> by language</div>
                {Object.keys(stats.by_language || {}).length === 0 ? (
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontFamily: 'JetBrains Mono' }}>
                    // no data yet
                  </div>
                ) : Object.entries(stats.by_language).sort((a, b) => b[1] - a[1]).map(([lang, count]) => {
                  const pct = (count / maxLangCount) * 100;
                  return (
                    <div key={lang} style={{ marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', fontFamily: 'JetBrains Mono' }}>{lang}</span>
                        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '12px', color: '#34d399', fontWeight: 600 }}>{count}</span>
                      </div>
                      <div style={{
                        height: '6px',
                        background: 'rgba(255,255,255,0.04)',
                        borderRadius: '3px',
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${pct}%`,
                          background: 'linear-gradient(90deg, #34d39988, #34d399)',
                          transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                          boxShadow: '0 0 12px #34d39966',
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, subtitle }) {
  return (
    <div style={{
      padding: '20px',
      borderRadius: '12px',
      border: `1px solid ${color}33`,
      background: `linear-gradient(135deg, ${color}0a, ${color}03)`,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        fontFamily: 'JetBrains Mono', fontSize: '10px',
        color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.12em',
        marginBottom: '12px',
      }}>
        <Icon size={11} style={{ color }} />
        {label}
      </div>
      <div style={{
        fontFamily: 'Space Grotesk, sans-serif',
        fontSize: '32px',
        fontWeight: 600,
        color: '#fff',
        letterSpacing: '-0.02em',
        marginBottom: '4px',
      }}>{value}</div>
      <div style={{
        fontFamily: 'JetBrains Mono',
        fontSize: '10.5px',
        color: 'rgba(255,255,255,0.4)',
      }}>{subtitle}</div>
    </div>
  );
}
