class Classification {
  complexity "low" | "medium" | "high"
  category "backend" | "frontend" | "architecture" | "devops" | "coding"
  needsMemory bool
  route "haiku" | "sonnet"
}

function ClassifyQuery(prompt: string) -> Classification {
  client ClaudeHaiku
  prompt #"
    You are an AI router for a developer reasoning engine.
    Analyze the following user prompt and classify it.
    
    If the prompt is simple, factual, or requests simple code generation, set route to "haiku" and complexity to "low".
    If the prompt requires complex reasoning, architecture design, or deep debugging, set route to "sonnet" and complexity to "high" or "medium".
    If the prompt references past context or needs architectural history, set needsMemory to true.
    Select the most appropriate category for the task.

    Prompt:
    {{ prompt }}

    Return the classification exactly matching this schema:
    {{ ctx.output_format }}
  "#
}
