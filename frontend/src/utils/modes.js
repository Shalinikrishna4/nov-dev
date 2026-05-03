import { Bug, BookOpen, Zap, Wand2, ShieldCheck } from 'lucide-react';

export const MODES = {
  debug: {
    id: 'debug', label: 'Debug', icon: Bug, accent: '#f87171', accentRgb: '248,113,113',
    description: 'Find and fix runtime errors',
    placeholder: 'Paste the runtime error, stack trace, or unexpected behavior...',
    needsError: true,
  },
  explain: {
    id: 'explain', label: 'Explain', icon: BookOpen, accent: '#22d3ee', accentRgb: '34,211,238',
    description: 'Understand any codebase',
    placeholder: 'Optional: ask a specific question about the code...',
    needsError: false,
  },
  optimize: {
    id: 'optimize', label: 'Optimize', icon: Zap, accent: '#fbbf24', accentRgb: '251,191,36',
    description: 'Speed up & simplify code',
    placeholder: 'Optional: specify what to optimize for...',
    needsError: false,
  },
  refactor: {
    id: 'refactor', label: 'Refactor', icon: Wand2, accent: '#c084fc', accentRgb: '192,132,252',
    description: 'Clean up code structure',
    placeholder: 'Optional: specify refactoring goals...',
    needsError: false,
  },
  test: {
    id: 'test', label: 'Tests', icon: ShieldCheck, accent: '#34d399', accentRgb: '52,211,153',
    description: 'Generate unit tests',
    placeholder: 'Optional: specify test framework or focus areas...',
    needsError: false,
  },
};

export const STARTER_SAMPLES = {
  debug: {
    code: `def get_user_score(users, user_id):
    for user in users:
        if user.id == user_id:
            return user.scores[-1]
    return 0

users = [
    {"id": 1, "scores": [85, 92]},
    {"id": 2, "scores": []},
]
print(get_user_score(users, 1))`,
    error: `AttributeError: 'dict' object has no attribute 'id'
  File "main.py", line 3, in get_user_score
    if user.id == user_id:`,
  },
  explain: {
    code: `function debounce(fn, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}`,
    error: '',
  },
  optimize: {
    code: `def find_duplicates(arr):
    duplicates = []
    for i in range(len(arr)):
        for j in range(i + 1, len(arr)):
            if arr[i] == arr[j] and arr[i] not in duplicates:
                duplicates.append(arr[i])
    return duplicates`,
    error: '',
  },
  refactor: {
    code: `function processData(d) {
  var r = [];
  for (var i = 0; i < d.length; i++) {
    if (d[i].active == true) {
      var x = d[i].value * 2;
      if (x > 10) {
        r.push({id: d[i].id, val: x});
      }
    }
  }
  return r;
}`,
    error: '',
  },
  test: {
    code: `function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const regex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  return regex.test(email.trim().toLowerCase());
}`,
    error: '',
  },
};
