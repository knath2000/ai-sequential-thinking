import type { Summary, ThoughtEntry, ThoughtInput } from './types';

const store = new Map<string, ThoughtEntry[]>();

function getSessionId(sessionId?: string) {
  return sessionId || 'default';
}

export function addThought(input: ThoughtInput, sessionId?: string) {
  const id = getSessionId(sessionId);
  const arr = store.get(id) || [];
  const entry: ThoughtEntry = { ...input, ts: Date.now() };
  arr.push(entry);
  store.set(id, arr);
  return entry;
}

export function clearHistory(sessionId?: string) {
  if (sessionId) {
    store.delete(sessionId);
  } else {
    store.clear();
  }
}

function classifyStage(text: string, index: number, isLast: boolean): string {
  const lower = text.toLowerCase();
  if (lower.includes('problem') || lower.includes('define')) return 'Problem Definition';
  if (lower.includes('research') || lower.includes('search')) return 'Research';
  if (lower.includes('analy')) return 'Analysis';
  if (lower.includes('synth') || lower.includes('plan')) return 'Synthesis';
  if (isLast) return 'Conclusion';
  return 'Analysis';
}

export function generateSummary(sessionId?: string): Summary {
  const id = getSessionId(sessionId);
  const arr = store.get(id) || [];
  const total = arr.length;
  const stages: Record<string, number> = {};
  const timeline = arr.map((t, i) => {
    const stage = classifyStage(t.thought, i, i === arr.length - 1);
    stages[stage] = (stages[stage] || 0) + 1;
    return { number: t.thought_number ?? i + 1, stage };
  });
  return { totalThoughts: total, stages, timeline };
}

export function getThoughts(sessionId?: string) {
  const id = getSessionId(sessionId);
  return store.get(id) || [];
}


