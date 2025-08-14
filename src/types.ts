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

export interface RecommendedTool {
  tool_name: string;
  confidence: number; // 0..1
  rationale?: string;
  priority?: number; // 1 = highest
  alternative_tools?: Array<{ tool_name: string; confidence: number }>;
  suggested_params?: Record<string, unknown>;
}

export interface CurrentStep {
  step_description: string;
  expected_outcome?: string;
  recommended_tools?: RecommendedTool[];
  next_step_conditions?: string[];
}

export interface SequentialThinkingOutput {
  thought: string;
  thought_number: number;
  total_thoughts: number;
  next_thought_needed: boolean;
  current_step?: CurrentStep;
  previous_steps?: ThoughtEntry[];
  remaining_steps?: string[];
}


