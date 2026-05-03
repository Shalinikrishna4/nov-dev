import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Atom, Sparkles, AlertCircle, Loader2, Check, Copy, Brain, Eye, EyeOff,
  Network, GitCompare, ArrowRight, Send, ChevronRight, Play, Plus,
  Search, History, Gauge, Activity, Microscope, Layers, Type, Box,
  Hash, Star, Wand2, Crosshair, FileCode, MessageSquare, Workflow,
  BarChart3, Zap as ZapIcon,
} from 'lucide-react';

import MeshBackground from './components/MeshBackground.jsx';
import { CodeBlock, DiffViewer } from './components/CodeBlock.jsx';
import HealthRadar from './components/HealthRadar.jsx';
import ReasoningGraph from './components/ReasoningGraph.jsx';
import { ResponseBlock } from './components/ResponseBlock.jsx';
import CommandPalette from './components/CommandPalette.jsx';
import HistoryDrawer from './components/HistoryDrawer.jsx';
import Dashboard from './components/Dashboard.jsx';

import { MODES, STARTER_SAMPLES } from './utils/modes.js';
import { detectLanguage, extractFirstCodeBlock } from './utils/syntax.jsx';
import { api, streamAnalyze } from './utils/api.js';

export default function App() {
  // Core state
  const [mode, setMode] = useState('debug');
  const [code, setCode] = useState('');
  const [errorText, setErrorText] = useState('');
  const [language, setLanguage] = useState('auto');
  const [response, setResponse] = useState(null);
  const [reasoning, setReasoning] = useState([]);
  const [activeStepIdx, setActiveStepIdx] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [followUp, setFollowUp] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [extractedFix, setExtractedFix] = useState(null);
  const [error, setError] = useState(null);
  const [view, setView] = useState('analysis');

  // Side panels
  const [showHistory, setShowHistory] = useState(false);
  const [showCommand, setShowCommand] = useState(false);
  const [showHealth, setShowHealth] = useState(true);
  const [showDashboard, setShowDashboard] = useState(false);

  // Sessions & telemetry
  const [sessions, setSessions] = useState([]);
  const [tokenUsage, setTokenUsage] = useState({ session: 0, total: 0 });
  const [copied, setCopied] = useState(null);
  const [healthMetrics, setHealthMetrics] = useState(null);
  const [complexityResult, setComplexityResult] = useState(null);
  const [analysingComplexity, setAnalysingComplexity] = useState(false);
  const [backendOnline, setBackendOnline] = useState(false);

  const detectedLang = language === 'auto' ? detectLanguage(code) : language;
  const currentMode = MODES[mode];
  const debounceRef = useRef(null);
  const cancelStreamRef = useRef(null);

  // Probe backend on mount
  useEffect(() => {
    fetch('/api/modes').then(r => setBackendOnline(r.ok)).catch(() => setBackendOnline(false));
    refreshSessions();
  }, []);

  async function refreshSessions() {
    try {
      const data = await api.listSessions();
      const sess = data.sessions || [];
      setSessions(sess);
      const total = sess.reduce((s, x) => s + (x.tokens || 0), 0);
      setTokenUsage(t => ({ ...t, total }));
    } catch {}
  }

  // Debounced health metrics whenever code changes
  useEffect(() => {
    if (!code.trim()) { setHealthMetrics(null); setComplexityResult(null); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const m = await api.health(code, detectedLang);
        setHealthMetrics(m);
      } catch {}
    }, 500);
    return () => clearTimeout(debounceRef.current);
  }, [code, detectedLang]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setShowCommand(true); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); runAnalysis(); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'h') { e.preventDefault(); setShowHistory(true); }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'N') { e.preventDefault(); newSession(); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') { e.preventDefault(); setShowDashboard(true); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [code, mode, errorText]);

  function loadSample() {
    const s = STARTER_SAMPLES[mode];
    setCode(s.code); setErrorText(s.error);
    setResponse(null); setReasoning([]); setActiveStepIdx(-1);
    setChatHistory([]); setExtractedFix(null); setError(null);
  }

  function newSession() {
    setCode(''); setErrorText('');
    setResponse(null); setReasoning([]); setActiveStepIdx(-1);
    setChatHistory([]); setExtractedFix(null);
    setActiveSessionId(null); setError(null);
    setShowHistory(false); setTokenUsage(t => ({ ...t, session: 0 }));
    setComplexityResult(null);
  }

  function loadSession(s) {
    setMode(s.mode);
    setCode(s.code);
    setErrorText(s.error_text);
    setLanguage(s.language || 'auto');
    setResponse(s.response);
    setChatHistory(s.chat_history || []);
    setActiveSessionId(s.id);
    setReasoning([]); setActiveStepIdx(-1);
    setExtractedFix(extractFirstCodeBlock(s.response));
    setShowHistory(false); setError(null);
    setTokenUsage(t => ({ ...t, session: s.tokens || 0 }));
  }

  async function deleteSession(id) {
    try {
      await api.deleteSession(id);
      setSessions(prev => prev.filter(s => s.id !== id));
      if (activeSessionId === id) newSession();
    } catch {}
  }

  async function runAnalysis() {
    if (!code.trim()) { setError('Provide some code to analyze.'); return; }
    if (currentMode.needsError && !errorText.trim()) {
      setError('Provide the error message or unexpected behavior.'); return;
    }
    setError(null); setLoading(true);
    setResponse(null); setReasoning([]); setActiveStepIdx(-1);
    setExtractedFix(null); setChatHistory([]);

    cancelStreamRef.current?.();

    cancelStreamRef.current = streamAnalyze(
      {
        code, error_text: errorText, language: detectedLang,
        mode, session_id: activeSessionId,
      },
      {
        onEvent: (event, data) => {
          if (event === 'pipeline_plan') {
            setReasoning(data.steps.map(s => ({ ...s, done: false })));
          } else if (event === 'pipeline_step') {
            setActiveStepIdx(data.index);
            setReasoning(prev => prev.map((s, i) => i < data.index ? { ...s, done: true } : s));
          } else if (event === 'llm_call_start') {
            setReasoning(prev => prev.map(s => ({ ...s, done: true })));
            setActiveStepIdx(-1);
          } else if (event === 'response') {
            setResponse(data.response);
            setExtractedFix(extractFirstCodeBlock(data.response));
            setActiveSessionId(data.session_id);
            setTokenUsage(t => ({ session: t.session + data.tokens, total: t.total + data.tokens }));
            setChatHistory([
              { role: 'user', content: '' },
              { role: 'assistant', content: data.response },
            ]);
            refreshSessions();
          } else if (event === 'done') {
            setLoading(false);
          } else if (event === 'error') {
            setError(data.message || 'Stream error');
            setLoading(false);
          }
        },
        onError: (e) => {
          setError(`Backend connection failed: ${e.message}. Ensure the API server is running and VITE_API_URL is configured.`);
          setLoading(false);
        },
      }
    );
  }

  async function sendFollowUp() {
    if (!followUp.trim() || loading || !activeSessionId) return;
    const newUserMsg = followUp.trim();
    setFollowUp('');
    setLoading(true); setError(null);

    const newHistory = [...chatHistory, { role: 'user', content: newUserMsg }];
    setChatHistory(newHistory);

    try {
      const data = await api.followup(activeSessionId, newUserMsg);
      setTokenUsage(t => ({ session: t.session + data.tokens, total: t.total + data.tokens }));
      setChatHistory([...newHistory, { role: 'assistant', content: data.response }]);
      refreshSessions();
    } catch (e) {
      setError(`Follow-up failed: ${e.message}`);
      setChatHistory(chatHistory);
    } finally {
      setLoading(false);
    }
  }

  async function runComplexity() {
    if (!code.trim()) return;
    setAnalysingComplexity(true);
    setComplexityResult(null);
    try {
      const data = await api.complexity(code, detectedLang);
      setComplexityResult(data);
    } catch (e) {
      setError(`Complexity analysis failed: ${e.message}`);
    } finally {
      setAnalysingComplexity(false);
    }
  }

  function copyToClipboard(text, key) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  async function applyQuickAction(actionMode) {
    if (!extractedFix) return;
    setCode(extractedFix);
    setMode(actionMode);
    setErrorText('');
    setResponse(null); setReasoning([]); setExtractedFix(null);
    setChatHistory([]); setActiveSessionId(null);
    setView('analysis');
    setTimeout(() => runAnalysis(), 100);
  }

  const codeStats = useMemo(() => ({
    lines: code.split('\n').length,
    chars: code.length,
  }), [code]);

  const commands = [
    { label: 'Run Analysis', icon: Play, color: '#34d399', shortcut: '⌘↵', hint: 'Execute the current mode', action: runAnalysis },
    { label: 'New Session', icon: Plus, color: '#22d3ee', shortcut: '⌘⇧N', hint: 'Clear and start fresh', action: newSession },
    { label: 'Toggle History', icon: History, color: '#c084fc', shortcut: '⌘H', hint: `${sessions.length} saved sessions`, action: () => setShowHistory(true) },
    { label: 'Open Dashboard', icon: BarChart3, color: '#22d3ee', shortcut: '⌘D', hint: 'Aggregate analytics', action: () => setShowDashboard(true) },
    { label: 'Analyze Complexity', icon: ZapIcon, color: '#fbbf24', hint: 'Big-O time/space estimate', action: runComplexity },
    { label: 'Switch to Debug', icon: MODES.debug.icon, color: MODES.debug.accent, action: () => setMode('debug') },
    { label: 'Switch to Explain', icon: MODES.explain.icon, color: MODES.explain.accent, action: () => setMode('explain') },
    { label: 'Switch to Optimize', icon: MODES.optimize.icon, color: MODES.optimize.accent, action: () => setMode('optimize') },
    { label: 'Switch to Refactor', icon: MODES.refactor.icon, color: MODES.refactor.accent, action: () => setMode('refactor') },
    { label: 'Switch to Tests', icon: MODES.test.icon, color: MODES.test.accent, action: () => setMode('test') },
    { label: 'Load Sample Code', icon: FileCode, color: '#fbbf24', hint: 'Try a demo for current mode', action: loadSample },
    { label: 'Toggle Health Panel', icon: Activity, color: '#34d399', action: () => setShowHealth(h => !h) },
  ];


  // Floating Action Button handler (opens command palette)
  function handleFab() {
    setShowCommand(true);
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 60% 0%, #18181b 0%, #050508 100%)',
      color: '#e2e8f0',
      position: 'relative',
      overflow: 'hidden',
      fontSmoothing: 'antialiased',
    }}>
      <MeshBackground />

      {/* HEADER */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(5, 5, 8, 0.7)',
        backdropFilter: 'blur(24px)',
        boxShadow: '0 2px 24px 0 rgba(139,92,246,0.10)',
      }}>
        <div style={{
          maxWidth: '1700px', margin: '0 auto',
          padding: '14px 28px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '40px', height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 50%, #f59e0b 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 20px rgba(139, 92, 246, 0.5)',
            }}>
              <Atom size={20} color="#fff" strokeWidth={2.5} />
            </div>
            <div>
              <div style={{
                fontFamily: 'Instrument Serif, serif',
                fontSize: '24px',
                color: '#fff',
                lineHeight: 1,
                letterSpacing: '-0.01em',
              }}>
                <span style={{ fontStyle: 'italic' }}>nova</span>
                <span style={{
                  fontFamily: 'JetBrains Mono',
                  fontStyle: 'normal',
                  fontWeight: 700,
                  fontSize: '20px',
                  background: 'linear-gradient(135deg, #c084fc, #ec4899)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                }}>.dev</span>
              </div>
              <div style={{
                fontFamily: 'JetBrains Mono',
                fontSize: '9.5px',
                color: 'rgba(255,255,255,0.4)',
                textTransform: 'uppercase', letterSpacing: '0.2em',
                marginTop: '2px',
              }}>
                AI Code Intelligence • v3.0 • python · fastapi · react
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '7px 14px', borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.02)',
            }}>
              <Gauge size={13} style={{ color: '#34d399' }} />
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: '11px' }}>
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>SESSION </span>
                <span style={{ color: '#34d399', fontWeight: 600 }}>{tokenUsage.session.toLocaleString()}</span>
                <span style={{ color: 'rgba(255,255,255,0.3)', margin: '0 6px' }}>·</span>
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>TOTAL </span>
                <span style={{ color: '#22d3ee', fontWeight: 600 }}>{tokenUsage.total.toLocaleString()}</span>
              </div>
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '7px 14px', borderRadius: '8px',
              border: `1px solid ${backendOnline ? 'rgba(52, 211, 153, 0.3)' : 'rgba(248, 113, 113, 0.3)'}`,
              background: backendOnline ? 'rgba(52, 211, 153, 0.06)' : 'rgba(248, 113, 113, 0.06)',
            }}>
              <span style={{
                width: '6px', height: '6px', borderRadius: '50%',
                background: backendOnline ? '#34d399' : '#f87171',
                boxShadow: `0 0 8px ${backendOnline ? '#34d399' : '#f87171'}`,
                animation: 'pulse-glow 2s ease-in-out infinite',
              }} />
              <span style={{
                fontFamily: 'JetBrains Mono', fontSize: '10.5px',
                color: backendOnline ? '#34d399' : '#f87171', fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '0.1em',
              }}>
                {backendOnline ? 'Backend Online' : 'Backend Offline'}
              </span>
            </div>

            <button onClick={() => setShowDashboard(true)} className="hover-lift" style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.8)',
              padding: '8px', borderRadius: '8px',
            }} title="Dashboard (⌘D)">
              <BarChart3 size={14} />
            </button>

            <button onClick={() => setShowCommand(true)} className="hover-lift" style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.7)',
              padding: '7px 14px', borderRadius: '8px',
              fontSize: '12px', fontFamily: 'JetBrains Mono',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <Search size={13} />
              <span>Command</span>
              <kbd style={{
                fontSize: '10px', padding: '1px 5px',
                border: '1px solid rgba(255,255,255,0.15)', borderRadius: '3px',
                color: 'rgba(255,255,255,0.5)',
              }}>⌘K</kbd>
            </button>

            <button onClick={() => setShowHistory(true)} className="hover-lift" style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.8)',
              padding: '8px 14px', borderRadius: '8px',
              fontSize: '12px', fontFamily: 'JetBrains Mono',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              <History size={13} /> {sessions.length}
            </button>

            <button onClick={newSession} className="hover-lift" style={{
              background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
              border: 'none',
              color: '#fff',
              padding: '8px 16px', borderRadius: '8px',
              fontSize: '12px', fontWeight: 600, fontFamily: 'JetBrains Mono',
              display: 'flex', alignItems: 'center', gap: '6px',
              textTransform: 'uppercase', letterSpacing: '0.05em',
              boxShadow: '0 4px 14px rgba(139, 92, 246, 0.4)',
            }}>
              <Plus size={13} /> New
            </button>
          </div>
        </div>
      </header>

      {/* Mode selector */}
      <div style={{
        maxWidth: '1700px', margin: '0 auto',
        padding: '32px 28px 0',
        position: 'relative', zIndex: 1,
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '12px',
          marginBottom: '24px',
        }}>
          {Object.values(MODES).map(m => {
            const Icon = m.icon;
            const active = mode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => { setMode(m.id); setError(null); }}
                className="mode-card"
                style={{
                  background: active
                    ? `linear-gradient(135deg, rgba(${m.accentRgb}, 0.18) 0%, rgba(${m.accentRgb}, 0.04) 100%)`
                    : 'rgba(15, 15, 25, 0.45)',
                  backdropFilter: 'blur(16px)',
                  border: active
                    ? `1px solid ${m.accent}`
                    : '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '12px',
                  padding: '18px 16px',
                  textAlign: 'left',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: active ? `0 8px 32px rgba(${m.accentRgb}, 0.25), inset 0 1px 0 rgba(255,255,255,0.08)` : 'none',
                  transform: active ? 'translateY(-2px)' : 'none',
                }}
              >
                {active && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: `radial-gradient(circle at top right, rgba(${m.accentRgb}, 0.15), transparent 70%)`,
                    pointerEvents: 'none',
                  }} />
                )}
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{
                    width: '36px', height: '36px',
                    borderRadius: '8px',
                    background: active ? `rgba(${m.accentRgb}, 0.2)` : 'rgba(255,255,255,0.04)',
                    border: active ? `1px solid rgba(${m.accentRgb}, 0.3)` : '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: '12px',
                  }}>
                    <Icon size={16} style={{ color: active ? m.accent : 'rgba(255,255,255,0.6)' }} />
                  </div>
                  <div style={{
                    fontFamily: 'Space Grotesk, sans-serif',
                    fontSize: '14px', fontWeight: 600,
                    color: active ? '#fff' : 'rgba(255,255,255,0.8)',
                    marginBottom: '3px',
                    letterSpacing: '-0.01em',
                  }}>{m.label}</div>
                  <div style={{
                    fontSize: '11px',
                    color: active ? `rgba(${m.accentRgb}, 0.9)` : 'rgba(255,255,255,0.4)',
                    fontFamily: 'JetBrains Mono',
                  }}>{m.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main grid */}
      <main style={{
        maxWidth: '1700px', margin: '0 auto',
        padding: '0 28px 28px',
        display: 'grid',
        gridTemplateColumns: showHealth ? '1fr 1fr 320px' : '1fr 1.2fr',
        gap: '28px',
        position: 'relative', zIndex: 1,
        minHeight: '600px',
      }}>
              {/* Floating Action Button */}
              <button className="fab" title="Command Palette (⌘K)" onClick={handleFab}>
                <Sparkles size={28} />
              </button>
        {/* LEFT - INPUT */}
        <section style={{ animation: 'slideRight 0.4s ease-out' }}>
          <div className="glass" style={{
            borderRadius: '12px',
            overflow: 'hidden',
            marginBottom: '14px',
          }}>
            <div style={{
              padding: '12px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'rgba(255,255,255,0.02)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f87171' }} />
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#fbbf24' }} />
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#34d399' }} />
                </div>
                <span style={{
                  fontFamily: 'JetBrains Mono', fontSize: '11px',
                  color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.12em',
                }}>source</span>
                <span style={{
                  fontFamily: 'JetBrains Mono', fontSize: '10px',
                  color: '#22d3ee',
                  padding: '2px 8px', borderRadius: '4px',
                  border: '1px solid rgba(34, 211, 238, 0.25)',
                  background: 'rgba(34, 211, 238, 0.08)',
                }}>{detectedLang}</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <select
                  value={language}
                  onChange={e => setLanguage(e.target.value)}
                  style={{
                    background: 'rgba(15,23,42,0.8)', color: 'rgba(255,255,255,0.9)',
                    border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px',
                    padding: '4px 8px', fontFamily: 'JetBrains Mono', fontSize: '11px',
                  }}
                >
                  <option value="auto">auto</option>
                  <option value="javascript">javascript</option>
                  <option value="typescript">typescript</option>
                  <option value="python">python</option>
                  <option value="java">java</option>
                  <option value="go">go</option>
                  <option value="rust">rust</option>
                </select>
                <button onClick={loadSample} className="hover-lift" style={{
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.7)', padding: '4px 10px', borderRadius: '6px',
                  fontFamily: 'JetBrains Mono', fontSize: '11px',
                  display: 'flex', alignItems: 'center', gap: '5px',
                }}>
                  <Wand2 size={11} /> sample
                </button>
              </div>
            </div>
            <div style={{ position: 'relative' }}>
              <textarea
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder={`// paste your code here\n// or click "sample" to try a demo\n//\n// press ⌘K for command palette\n// press ⌘↵ to run analysis`}
                spellCheck="false"
                style={{
                  width: '100%', minHeight: '300px',
                  background: 'transparent',
                  color: '#e2e8f0', border: 'none',
                  padding: '16px',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '13px',
                  lineHeight: 1.6,
                  resize: 'vertical',
                  caretColor: '#c084fc',
                }}
                onKeyDown={e => {
                  if (e.key === 'Tab') {
                    e.preventDefault();
                    const ta = e.target;
                    const s = ta.selectionStart;
                    const newCode = code.slice(0, s) + '  ' + code.slice(ta.selectionEnd);
                    setCode(newCode);
                    setTimeout(() => { ta.selectionStart = ta.selectionEnd = s + 2; }, 0);
                  }
                }}
              />
              <div style={{
                position: 'absolute', bottom: '10px', right: '14px',
                fontFamily: 'JetBrains Mono', fontSize: '10px',
                color: 'rgba(255,255,255,0.3)',
                display: 'flex', gap: '12px',
                pointerEvents: 'none',
              }}>
                <span>{codeStats.lines}L</span>
                <span>{codeStats.chars}c</span>
              </div>
            </div>
          </div>

          {/* Error / context */}
          <div className="glass" style={{ borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{
              padding: '10px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', gap: '10px',
              background: 'rgba(255,255,255,0.02)',
            }}>
              {currentMode.needsError ? (
                <AlertCircle size={13} style={{ color: '#f87171' }} />
              ) : (
                <MessageSquare size={13} style={{ color: 'rgba(255,255,255,0.4)' }} />
              )}
              <span style={{
                fontFamily: 'JetBrains Mono', fontSize: '11px',
                color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.12em',
              }}>
                {currentMode.needsError ? 'error / context' : 'optional context'}
              </span>
              {currentMode.needsError && (
                <span style={{
                  fontFamily: 'JetBrains Mono', fontSize: '9px',
                  color: '#f87171',
                  padding: '1px 6px', borderRadius: '3px',
                  background: 'rgba(248, 113, 113, 0.1)',
                  border: '1px solid rgba(248, 113, 113, 0.2)',
                }}>required</span>
              )}
            </div>
            <textarea
              value={errorText}
              onChange={e => setErrorText(e.target.value)}
              placeholder={currentMode.placeholder}
              spellCheck="false"
              style={{
                width: '100%', minHeight: '90px',
                background: 'transparent',
                color: '#e2e8f0', border: 'none',
                padding: '14px 16px',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '12.5px',
                lineHeight: 1.6,
                resize: 'vertical',
                caretColor: '#f87171',
              }}
            />
          </div>

          {error && (
            <div style={{
              marginTop: '12px',
              padding: '12px 14px',
              borderRadius: '8px',
              border: '1px solid rgba(248, 113, 113, 0.3)',
              background: 'rgba(248, 113, 113, 0.06)',
              color: '#fca5a5',
              fontSize: '12.5px',
              fontFamily: 'JetBrains Mono',
              display: 'flex', alignItems: 'center', gap: '10px',
            }}>
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          <button
            onClick={runAnalysis}
            disabled={loading}
            className="hover-lift"
            style={{
              marginTop: '16px',
              width: '100%',
              background: loading
                ? 'rgba(255,255,255,0.06)'
                : `linear-gradient(135deg, rgba(${currentMode.accentRgb}, 0.25) 0%, rgba(${currentMode.accentRgb}, 0.1) 100%)`,
              border: `1px solid ${currentMode.accent}`,
              color: '#fff',
              padding: '16px',
              borderRadius: '10px',
              fontFamily: 'Space Grotesk', fontSize: '14px', fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              letterSpacing: '0.02em',
              boxShadow: !loading ? `0 8px 24px rgba(${currentMode.accentRgb}, 0.3)` : 'none',
            }}
          >
            {loading ? (
              <><Loader2 size={16} className="spin" /> <span className="shimmer-text">Running pipeline...</span></>
            ) : (
              <><Play size={15} fill="currentColor" /> Execute {currentMode.label} <kbd style={{
                fontSize: '10px', padding: '2px 6px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '4px',
                marginLeft: '6px',
              }}>⌘↵</kbd></>
            )}
          </button>
        </section>

        {/* CENTER - OUTPUT */}
        <section style={{ animation: 'slideLeft 0.4s ease-out 0.1s backwards' }}>
          <div className="glass" style={{
            borderRadius: '12px',
            overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
            minHeight: '600px', height: '100%',
          }}>
            <div style={{
              padding: '12px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'rgba(255,255,255,0.02)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Brain size={14} style={{ color: '#c084fc' }} />
                <span style={{
                  fontFamily: 'JetBrains Mono', fontSize: '11px',
                  color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.12em',
                }}>nova response</span>
              </div>
              {response && (
                <div style={{
                  display: 'flex', gap: '4px', padding: '3px',
                  background: 'rgba(255,255,255,0.04)', borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <ViewTab active={view === 'analysis'} onClick={() => setView('analysis')} icon={Eye} label="analysis" color="#c084fc" />
                  {extractedFix && <ViewTab active={view === 'diff'} onClick={() => setView('diff')} icon={GitCompare} label="diff" color="#fbbf24" />}
                  <ViewTab active={view === 'graph'} onClick={() => setView('graph')} icon={Network} label="graph" color="#22d3ee" />
                </div>
              )}
            </div>

            <div style={{ padding: '20px', flex: 1, overflow: 'auto' }}>
              {!loading && !response && reasoning.length === 0 && (
                <EmptyState />
              )}

              {(reasoning.length > 0 && (loading || view === 'graph')) && (
                <div style={{ marginBottom: response && view === 'analysis' ? '24px' : 0 }}>
                  <div style={{
                    fontFamily: 'JetBrains Mono', fontSize: '10px',
                    color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.15em',
                    marginBottom: '14px',
                    display: 'flex', alignItems: 'center', gap: '8px',
                  }}>
                    <Workflow size={12} /> server pipeline trace
                  </div>
                  <ReasoningGraph steps={reasoning} activeIdx={activeStepIdx} mode={mode} />
                </div>
              )}

              {response && view === 'analysis' && (
                <div style={{
                  borderTop: reasoning.length > 0 && !loading ? '1px solid rgba(255,255,255,0.06)' : 'none',
                  paddingTop: reasoning.length > 0 && !loading ? '20px' : 0,
                }}>
                  {chatHistory.slice(1).map((msg, i) => (
                    <div key={i} style={{ marginBottom: '24px' }}>
                      {msg.role === 'user' ? (
                        <div style={{
                          padding: '12px 16px', borderRadius: '10px',
                          border: '1px solid rgba(192, 132, 252, 0.2)',
                          background: 'rgba(192, 132, 252, 0.06)',
                          fontSize: '13px', color: 'rgba(255,255,255,0.85)',
                          fontFamily: 'JetBrains Mono',
                          display: 'flex', alignItems: 'flex-start', gap: '10px',
                        }}>
                          <span style={{
                            color: '#c084fc', fontSize: '10px', textTransform: 'uppercase',
                            letterSpacing: '0.1em', paddingTop: '2px', fontWeight: 600,
                          }}>YOU →</span>
                          <span>{msg.content}</span>
                        </div>
                      ) : (
                        <div>
                          <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            marginBottom: '14px',
                          }}>
                            <div style={{
                              display: 'flex', alignItems: 'center', gap: '8px',
                              fontFamily: 'JetBrains Mono', fontSize: '10px',
                              color: currentMode.accent, textTransform: 'uppercase', letterSpacing: '0.15em',
                              fontWeight: 600,
                            }}>
                              <span style={{
                                width: '6px', height: '6px', borderRadius: '50%',
                                background: currentMode.accent,
                                boxShadow: `0 0 8px ${currentMode.accent}`,
                              }} />
                              nova → {currentMode.label}
                            </div>
                            <button
                              onClick={() => copyToClipboard(msg.content, `msg-${i}`)}
                              className="hover-lift"
                              style={{
                                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                                color: 'rgba(255,255,255,0.7)',
                                padding: '4px 10px', borderRadius: '6px',
                                fontFamily: 'JetBrains Mono', fontSize: '10px',
                                display: 'flex', alignItems: 'center', gap: '5px',
                                textTransform: 'uppercase', letterSpacing: '0.08em',
                              }}
                            >
                              {copied === `msg-${i}` ? <><Check size={11} /> copied</> : <><Copy size={11} /> copy</>}
                            </button>
                          </div>
                          <ResponseBlock text={msg.content} accent={currentMode.accent} />

                          {i === 0 && extractedFix && (
                            <div style={{
                              marginTop: '20px', padding: '14px',
                              borderRadius: '10px',
                              background: 'rgba(255,255,255,0.02)',
                              border: '1px dashed rgba(255,255,255,0.1)',
                            }}>
                              <div style={{
                                fontFamily: 'JetBrains Mono', fontSize: '10px',
                                color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.12em',
                                marginBottom: '10px',
                                display: 'flex', alignItems: 'center', gap: '6px',
                              }}>
                                <Crosshair size={11} /> chain next action
                              </div>
                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {Object.values(MODES).filter(m => m.id !== mode).map(m => {
                                  const Icon = m.icon;
                                  return (
                                    <button
                                      key={m.id}
                                      onClick={() => applyQuickAction(m.id)}
                                      className="hover-lift"
                                      style={{
                                        background: 'rgba(255,255,255,0.04)',
                                        border: `1px solid rgba(${m.accentRgb}, 0.3)`,
                                        color: m.accent,
                                        padding: '6px 12px', borderRadius: '6px',
                                        fontFamily: 'JetBrains Mono', fontSize: '11px',
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                      }}
                                    >
                                      <Icon size={11} />
                                      {m.label} this fix
                                      <ArrowRight size={11} />
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {loading && chatHistory.length > 2 && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      color: 'rgba(255,255,255,0.5)',
                      fontFamily: 'JetBrains Mono', fontSize: '12px',
                    }}>
                      <Loader2 size={14} className="spin" />
                      <span className="shimmer-text">Thinking...</span>
                    </div>
                  )}
                </div>
              )}

              {extractedFix && view === 'diff' && (
                <div>
                  <div style={{
                    fontFamily: 'JetBrains Mono', fontSize: '10px',
                    color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.15em',
                    marginBottom: '14px',
                    display: 'flex', alignItems: 'center', gap: '12px',
                  }}>
                    <span>original</span>
                    <ArrowRight size={12} />
                    <span style={{ color: '#34d399' }}>{
                      currentMode.id === 'optimize' ? 'optimized'
                      : currentMode.id === 'debug' ? 'fixed'
                      : 'modified'
                    }</span>
                  </div>
                  <DiffViewer oldCode={code} newCode={extractedFix} lang={detectedLang} />
                  <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => copyToClipboard(extractedFix, 'fix')}
                      className="hover-lift"
                      style={{
                        background: 'rgba(52, 211, 153, 0.1)',
                        border: '1px solid rgba(52, 211, 153, 0.4)',
                        color: '#34d399',
                        padding: '8px 16px', borderRadius: '8px',
                        fontFamily: 'JetBrains Mono', fontSize: '11px',
                        display: 'flex', alignItems: 'center', gap: '6px',
                        textTransform: 'uppercase', letterSpacing: '0.08em',
                      }}
                    >
                      {copied === 'fix' ? <><Check size={12} /> copied</> : <><Copy size={12} /> copy fix</>}
                    </button>
                    <button
                      onClick={() => setCode(extractedFix)}
                      className="hover-lift"
                      style={{
                        background: 'rgba(192, 132, 252, 0.1)',
                        border: '1px solid rgba(192, 132, 252, 0.4)',
                        color: '#c084fc',
                        padding: '8px 16px', borderRadius: '8px',
                        fontFamily: 'JetBrains Mono', fontSize: '11px',
                        display: 'flex', alignItems: 'center', gap: '6px',
                        textTransform: 'uppercase', letterSpacing: '0.08em',
                      }}
                    >
                      <Wand2 size={12} /> apply to editor
                    </button>
                  </div>
                </div>
              )}
            </div>

            {response && (
              <div style={{
                borderTop: '1px solid rgba(255,255,255,0.06)',
                padding: '14px 16px',
                background: 'rgba(255,255,255,0.02)',
              }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <ChevronRight size={14} style={{ color: '#c084fc' }} />
                  <input
                    value={followUp}
                    onChange={e => setFollowUp(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendFollowUp()}
                    placeholder="ask a follow-up about this code..."
                    disabled={loading}
                    style={{
                      flex: 1,
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '8px',
                      color: '#fff',
                      padding: '9px 14px',
                      fontFamily: 'JetBrains Mono', fontSize: '12.5px',
                    }}
                  />
                  <button
                    onClick={sendFollowUp}
                    disabled={loading || !followUp.trim()}
                    className="hover-lift"
                    style={{
                      background: followUp.trim()
                        ? 'linear-gradient(135deg, #8b5cf6, #ec4899)'
                        : 'rgba(255,255,255,0.04)',
                      border: 'none',
                      color: followUp.trim() ? '#fff' : 'rgba(255,255,255,0.4)',
                      padding: '9px 16px', borderRadius: '8px',
                      fontFamily: 'JetBrains Mono',
                      display: 'flex', alignItems: 'center', gap: '6px',
                      fontSize: '11px', fontWeight: 600,
                      textTransform: 'uppercase', letterSpacing: '0.08em',
                    }}
                  >
                    <Send size={12} /> send
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* RIGHT - HEALTH & METRICS */}
        {showHealth && (
          <aside style={{ animation: 'slideLeft 0.4s ease-out 0.2s backwards' }}>
            <div className="glass" style={{
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '14px',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: '16px',
              }}>
                <div style={{
                  fontFamily: 'JetBrains Mono', fontSize: '10px',
                  color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.15em',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}>
                  <Activity size={11} /> code health
                </div>
                <button
                  onClick={() => setShowHealth(false)}
                  style={{
                    background: 'transparent', border: 'none',
                    color: 'rgba(255,255,255,0.4)', padding: '2px',
                  }}
                >
                  <EyeOff size={12} />
                </button>
              </div>
              {healthMetrics ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <HealthRadar metrics={healthMetrics} />
                  <div style={{
                    fontFamily: 'Instrument Serif, serif',
                    fontStyle: 'italic',
                    fontSize: '20px',
                    color: 'rgba(255,255,255,0.85)',
                    marginTop: '12px',
                  }}>
                    score <span style={{ color: '#c084fc', fontWeight: 600 }}>{healthMetrics.overall}</span>/100
                  </div>
                </div>
              ) : (
                <div style={{
                  padding: '40px 20px', textAlign: 'center',
                  color: 'rgba(255,255,255,0.3)', fontSize: '12px',
                  fontFamily: 'JetBrains Mono',
                }}>// awaiting code...</div>
              )}
            </div>

            {/* Complexity card (NEW) */}
            <div className="glass" style={{
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '14px',
            }}>
              <div style={{
                fontFamily: 'JetBrains Mono', fontSize: '10px',
                color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.15em',
                marginBottom: '12px',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}>
                <ZapIcon size={11} /> complexity
              </div>
              {complexityResult ? (
                <div>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                    <div style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '8px',
                      background: 'rgba(251, 191, 36, 0.06)',
                      border: '1px solid rgba(251, 191, 36, 0.25)',
                    }}>
                      <div style={{
                        fontFamily: 'JetBrains Mono', fontSize: '9px',
                        color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em',
                        marginBottom: '4px',
                      }}>time</div>
                      <div style={{
                        fontFamily: 'JetBrains Mono', fontSize: '14px',
                        color: '#fbbf24', fontWeight: 600,
                      }}>{complexityResult.time}</div>
                    </div>
                    <div style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '8px',
                      background: 'rgba(34, 211, 238, 0.06)',
                      border: '1px solid rgba(34, 211, 238, 0.25)',
                    }}>
                      <div style={{
                        fontFamily: 'JetBrains Mono', fontSize: '9px',
                        color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em',
                        marginBottom: '4px',
                      }}>space</div>
                      <div style={{
                        fontFamily: 'JetBrains Mono', fontSize: '14px',
                        color: '#22d3ee', fontWeight: 600,
                      }}>{complexityResult.space}</div>
                    </div>
                  </div>
                  <div style={{
                    fontSize: '11.5px',
                    color: 'rgba(255,255,255,0.65)',
                    lineHeight: 1.5,
                    fontFamily: 'JetBrains Mono',
                  }}>{complexityResult.explanation}</div>
                  <div style={{
                    marginTop: '8px', fontSize: '9.5px',
                    fontFamily: 'JetBrains Mono', color: 'rgba(255,255,255,0.4)',
                    textTransform: 'uppercase', letterSpacing: '0.1em',
                  }}>
                    confidence: {complexityResult.confidence}
                  </div>
                </div>
              ) : (
                <button
                  onClick={runComplexity}
                  disabled={!code.trim() || analysingComplexity}
                  className="hover-lift"
                  style={{
                    width: '100%', padding: '10px',
                    background: 'rgba(251, 191, 36, 0.06)',
                    border: '1px solid rgba(251, 191, 36, 0.3)',
                    borderRadius: '8px',
                    color: '#fbbf24',
                    fontFamily: 'JetBrains Mono', fontSize: '11px',
                    textTransform: 'uppercase', letterSpacing: '0.1em',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  }}
                >
                  {analysingComplexity ? <><Loader2 size={12} className="spin" /> analysing...</> : <><ZapIcon size={12} /> Estimate big-O</>}
                </button>
              )}
            </div>

            {healthMetrics && (
              <div className="glass" style={{
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '14px',
              }}>
                <div style={{
                  fontFamily: 'JetBrains Mono', fontSize: '10px',
                  color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.15em',
                  marginBottom: '12px',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}>
                  <Microscope size={11} /> metrics
                </div>
                {[
                  { label: 'lines', value: healthMetrics.raw.lines, icon: Hash },
                  { label: 'functions', value: healthMetrics.raw.fn_count, icon: Box },
                  { label: 'complexity', value: healthMetrics.raw.complexity, icon: Network },
                  { label: 'max nesting', value: healthMetrics.raw.max_depth, icon: Layers },
                  { label: 'comments', value: healthMetrics.raw.comment_lines, icon: Type },
                ].map((m, i) => {
                  const Icon = m.icon;
                  return (
                    <div key={m.label} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 0',
                      borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Icon size={11} style={{ color: 'rgba(255,255,255,0.4)' }} />
                        <span style={{
                          fontFamily: 'JetBrains Mono', fontSize: '11px',
                          color: 'rgba(255,255,255,0.65)',
                        }}>{m.label}</span>
                      </div>
                      <span style={{
                        fontFamily: 'JetBrains Mono', fontSize: '13px',
                        color: '#fff', fontWeight: 600,
                      }}>{m.value}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="glass" style={{
              borderRadius: '12px',
              padding: '16px',
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.04), rgba(236, 72, 153, 0.04))',
            }}>
              <div style={{
                fontFamily: 'JetBrains Mono', fontSize: '10px',
                color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.15em',
                marginBottom: '12px',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}>
                <Star size={11} /> shortcuts
              </div>
              {[
                { keys: ['⌘', 'K'], label: 'Command palette' },
                { keys: ['⌘', '↵'], label: 'Run analysis' },
                { keys: ['⌘', 'H'], label: 'History' },
                { keys: ['⌘', 'D'], label: 'Dashboard' },
                { keys: ['⌘', '⇧', 'N'], label: 'New session' },
              ].map(s => (
                <div key={s.label} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '6px 0',
                }}>
                  <span style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.7)' }}>{s.label}</span>
                  <div style={{ display: 'flex', gap: '3px' }}>
                    {s.keys.map((k, i) => (
                      <kbd key={i} style={{
                        fontSize: '10px',
                        color: 'rgba(255,255,255,0.6)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(255,255,255,0.04)',
                        padding: '2px 6px', borderRadius: '3px',
                      }}>{k}</kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </aside>
        )}

        {!showHealth && (
          <button
            onClick={() => setShowHealth(true)}
            style={{
              position: 'fixed', right: '28px', top: '120px',
              background: 'rgba(15, 15, 25, 0.8)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.7)',
              padding: '10px',
              borderRadius: '10px',
              zIndex: 10,
            }}
          >
            <Eye size={14} />
          </button>
        )}
      </main>

      <HistoryDrawer
        open={showHistory}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onClose={() => setShowHistory(false)}
        onLoad={loadSession}
        onDelete={deleteSession}
      />

      <Dashboard open={showDashboard} onClose={() => setShowDashboard(false)} />

      <CommandPalette
        open={showCommand}
        onClose={() => setShowCommand(false)}
        commands={commands}
      />

      <footer style={{
        textAlign: 'center', padding: '40px 20px 30px',
        fontFamily: 'JetBrains Mono', fontSize: '10px',
        color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.2em',
        position: 'relative', zIndex: 1,
      }}>
        <span style={{
          background: 'linear-gradient(90deg, #8b5cf6, #ec4899, #f59e0b)',
          WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
          fontWeight: 600,
        }}>nova.dev</span>
        <span style={{ margin: '0 12px' }}>·</span>
        full-stack: python · fastapi · react · llm intelligence
      </footer>
    </div>
  );
}

function ViewTab({ active, onClick, icon: Icon, label, color }) {
  return (
    <button onClick={onClick} style={{
      background: active ? `rgba(${hexToRgb(color)}, 0.15)` : 'transparent',
      border: 'none',
      color: active ? color : 'rgba(255,255,255,0.5)',
      padding: '5px 12px', borderRadius: '5px',
      fontFamily: 'JetBrains Mono',
      fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.08em',
      display: 'flex', alignItems: 'center', gap: '5px',
    }}>
      <Icon size={11} /> {label}
    </button>
  );
}

function hexToRgb(hex) {
  const m = hex.replace('#', '').match(/.{1,2}/g);
  return m ? `${parseInt(m[0],16)}, ${parseInt(m[1],16)}, ${parseInt(m[2],16)}` : '255,255,255';
}

function EmptyState() {
  return (
    <div style={{
      height: '100%', minHeight: '500px',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      color: 'rgba(255,255,255,0.4)',
      textAlign: 'center', padding: '40px 20px',
    }}>
      <div style={{
        width: '80px', height: '80px', borderRadius: '20px',
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(236, 72, 153, 0.15))',
        border: '1px solid rgba(139, 92, 246, 0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: '24px', position: 'relative',
      }}>
        <Sparkles size={32} style={{ color: '#c084fc' }} />
        <div style={{
          position: 'absolute', inset: '-3px', borderRadius: '23px',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          animation: 'ripple 3s ease-out infinite',
        }} />
      </div>
      <div style={{
        fontFamily: 'Instrument Serif, serif',
        fontSize: '28px', fontStyle: 'italic',
        color: 'rgba(255,255,255,0.85)',
        marginBottom: '8px', letterSpacing: '-0.01em',
      }}>Ready to analyze</div>
      <div style={{
        fontSize: '13px', maxWidth: '340px', lineHeight: 1.7,
        color: 'rgba(255,255,255,0.5)', marginBottom: '32px',
      }}>
        Drop in code, choose a mode, and watch the FastAPI pipeline stream a live trace from server to browser via SSE.
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px',
        width: '100%', maxWidth: '420px',
      }}>
        {Object.values(MODES).map(m => {
          const Icon = m.icon;
          return (
            <div key={m.id} style={{
              padding: '12px 6px', borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(255,255,255,0.02)',
              fontFamily: 'JetBrains Mono', fontSize: '9px',
              color: 'rgba(255,255,255,0.5)',
              textTransform: 'uppercase', letterSpacing: '0.08em',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
            }}>
              <Icon size={14} style={{ color: m.accent }} />
              {m.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
