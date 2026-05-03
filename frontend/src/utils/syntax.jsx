// Lightweight, dependency-free syntax highlighter for 6 languages.

import React from 'react';

export const LANG_PATTERNS = {
  javascript: {
    keywords: /\b(const|let|var|function|return|if|else|for|while|class|extends|new|this|import|export|from|default|async|await|try|catch|finally|throw|typeof|instanceof|null|undefined|true|false|of|in|switch|case|break|continue)\b/g,
    string: /(["'`])(?:\\.|(?!\1)[^\\\n])*\1/g,
    comment: /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g,
    number: /\b(\d+\.?\d*)\b/g,
    fn: /\b([a-zA-Z_$][\w$]*)\s*(?=\()/g,
  },
  python: {
    keywords: /\b(def|class|return|if|elif|else|for|while|import|from|as|with|try|except|finally|raise|pass|break|continue|None|True|False|and|or|not|in|is|lambda|yield|async|await|self)\b/g,
    string: /(["'])(?:\\.|(?!\1)[^\\\n])*\1|"""[\s\S]*?"""|'''[\s\S]*?'''/g,
    comment: /(#[^\n]*)/g,
    number: /\b(\d+\.?\d*)\b/g,
    fn: /\b([a-zA-Z_][\w]*)\s*(?=\()/g,
  },
  typescript: {
    keywords: /\b(const|let|var|function|return|if|else|for|while|class|extends|new|this|import|export|from|default|async|await|try|catch|finally|throw|typeof|instanceof|null|undefined|true|false|interface|type|enum|public|private|protected|readonly|of|in)\b/g,
    string: /(["'`])(?:\\.|(?!\1)[^\\\n])*\1/g,
    comment: /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g,
    number: /\b(\d+\.?\d*)\b/g,
    fn: /\b([a-zA-Z_$][\w$]*)\s*(?=\()/g,
  },
  java: {
    keywords: /\b(public|private|protected|class|interface|extends|implements|static|final|void|int|String|boolean|double|float|char|long|new|this|return|if|else|for|while|try|catch|finally|throw|throws|null|true|false|package|import)\b/g,
    string: /(["'])(?:\\.|(?!\1)[^\\\n])*\1/g,
    comment: /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g,
    number: /\b(\d+\.?\d*)\b/g,
    fn: /\b([a-zA-Z_$][\w$]*)\s*(?=\()/g,
  },
  go: {
    keywords: /\b(func|var|const|type|struct|interface|package|import|return|if|else|for|range|switch|case|default|break|continue|go|defer|chan|map|nil|true|false)\b/g,
    string: /(["`])(?:\\.|(?!\1)[^\\\n])*\1/g,
    comment: /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g,
    number: /\b(\d+\.?\d*)\b/g,
    fn: /\b([a-zA-Z_][\w]*)\s*(?=\()/g,
  },
  rust: {
    keywords: /\b(fn|let|mut|const|struct|enum|impl|trait|pub|use|mod|return|if|else|for|while|loop|match|break|continue|self|Self|Some|None|Ok|Err|true|false|as|ref|move)\b/g,
    string: /(["'])(?:\\.|(?!\1)[^\\\n])*\1/g,
    comment: /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g,
    number: /\b(\d+\.?\d*)\b/g,
    fn: /\b([a-zA-Z_][\w]*)\s*(?=\()/g,
  },
};

export function detectLanguage(code) {
  if (!code) return 'javascript';
  if (/^\s*(def |class |import |from |if __name__)/m.test(code)) return 'python';
  if (/\b(interface|type)\s+\w+/.test(code) && /:\s*(string|number|boolean)/.test(code)) return 'typescript';
  if (/^\s*(public|private)\s+(static\s+)?(class|void|int|String)/m.test(code)) return 'java';
  if (/^\s*(func|package)\s+\w+/m.test(code)) return 'go';
  if (/\bfn\s+\w+|let\s+mut\b/.test(code)) return 'rust';
  return 'javascript';
}

const COLOR_MAP = {
  keywords: '#c084fc',
  string: '#34d399',
  comment: '#64748b',
  number: '#fbbf24',
  fn: '#f472b6',
  plain: '#e2e8f0',
};

export function highlight(code, lang) {
  const patterns = LANG_PATTERNS[lang] || LANG_PATTERNS.javascript;
  const tokens = [];
  let pos = 0;
  const types = ['comment', 'string', 'keywords', 'fn', 'number'];

  while (pos < code.length) {
    let earliest = null;
    for (const t of types) {
      patterns[t].lastIndex = pos;
      const m = patterns[t].exec(code);
      if (m && (!earliest || m.index < earliest.index)) {
        earliest = { type: t, match: m[0], index: m.index };
      }
    }
    if (!earliest) {
      tokens.push({ type: 'plain', text: code.slice(pos) });
      break;
    }
    if (earliest.index > pos) {
      tokens.push({ type: 'plain', text: code.slice(pos, earliest.index) });
    }
    tokens.push({ type: earliest.type, text: earliest.match });
    pos = earliest.index + earliest.match.length;
  }

  return tokens.map((t, i) => (
    <span key={i} style={{ color: COLOR_MAP[t.type], fontStyle: t.type === 'comment' ? 'italic' : 'normal' }}>
      {t.text}
    </span>
  ));
}

// Simple LCS-based diff between two strings (line granularity).
export function computeDiff(oldStr, newStr) {
  const oldLines = oldStr.split('\n');
  const newLines = newStr.split('\n');
  const m = oldLines.length, n = newLines.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = oldLines[i - 1] === newLines[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  const result = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (oldLines[i - 1] === newLines[j - 1]) {
      result.unshift({ type: 'same', old: oldLines[i - 1], new: newLines[j - 1] });
      i--; j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      result.unshift({ type: 'del', old: oldLines[i - 1], new: null });
      i--;
    } else {
      result.unshift({ type: 'add', old: null, new: newLines[j - 1] });
      j--;
    }
  }
  while (i > 0) { result.unshift({ type: 'del', old: oldLines[i - 1], new: null }); i--; }
  while (j > 0) { result.unshift({ type: 'add', old: null, new: newLines[j - 1] }); j--; }
  return result;
}

export function extractFirstCodeBlock(text) {
  if (!text) return null;
  const m = text.match(/```\w*\n?([\s\S]*?)```/);
  return m ? m[1].trimEnd() : null;
}
