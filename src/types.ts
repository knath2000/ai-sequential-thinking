export interface ThoughtInput {
  thought: string;
  thought_number: number;
  total_thoughts: number;
  next_thought_needed: boolean;
  is_revision?: boolean;
  revises_thought?: number;
  branch_from_thought?: number;
  branch_id?: string;
  needs_more_thoughts?: boolean;
}

export interface ThoughtEntry extends ThoughtInput {
  ts: number;
}

export interface SummaryStageCounts {
  [stage: string]: number;
}

export interface TimelineEntry {
  number: number;
  stage: string;
}

export interface Summary {
  totalThoughts: number;
  stages: SummaryStageCounts;
  timeline: TimelineEntry[];
}


