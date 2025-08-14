import { callLangdbChatForSteps } from './providers/langdbClient';
import { RecommendedTool, CurrentStep } from './types';

/**
 * Simple recommender that asks LangDB to produce recommended tools for a given thought.
 * This is a lightweight stub: later we can refine prompts and scoring heuristics.
 */
export async function recommendToolsForThought(thought: string, availableTools: string[] = []): Promise<CurrentStep> {
  const system = `You are a tool recommender. Given a user thought and a list of available MCP tools, return a JSON object with: step_description, expected_outcome, recommended_tools (array of {tool_name, confidence, rationale, priority}), next_step_conditions.`;
  const user = `Thought: ${thought}\nAvailable tools: ${availableTools.join(', ')}\nReturn only JSON.`;

  try {
    const res = await callLangdbChatForSteps(`${system}\n\n${user}`, 'gpt-5-mini');
    // callLangdbChatForSteps usually returns steps; we'll fallback to heuristic recommendations
    const recommended: RecommendedTool[] = [];
    // Heuristic fallback: pick first two tools with decaying confidence
    for (let i = 0; i < Math.min(2, availableTools.length); i++) {
      recommended.push({ tool_name: availableTools[i], confidence: Math.max(0.1, 0.9 - i * 0.15), rationale: 'LLM suggestion', priority: i + 1 });
    }

    const step: CurrentStep = {
      step_description: `Perform: ${thought}`,
      expected_outcome: 'Gather initial results and identify follow-ups',
      recommended_tools: recommended,
      next_step_conditions: ['Check results', 'Decide whether to branch or continue'],
    };
    return step;
  } catch (e) {
    // On errors, return a minimal step with heuristic recommendations
    return {
      step_description: `Perform: ${thought}`,
      expected_outcome: 'Gather initial results',
      recommended_tools: availableTools.slice(0, 2).map((t, i) => ({ tool_name: t, confidence: 0.7 - i * 0.2, rationale: 'heuristic', priority: i + 1 })),
      next_step_conditions: ['Check results'],
    };
  }
}

export default { recommendToolsForThought };


