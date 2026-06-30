class EvaluationResult {
  accuracy float
  completeness float
  reasoning float
  security float
  overall float
  needsRevision bool
}

function Evaluate(prompt: string, response: string) -> EvaluationResult {
  client ClaudeHaiku
  prompt #"
    Evaluate the following AI response against the user prompt.
    Score accuracy, completeness, reasoning, and security on a scale of 0.0 to 1.0.
    Calculate the overall score as the average of the 4 scores.
    If the overall score is less than 0.85, set needsRevision to true.

    User Prompt:
    {{ prompt }}

    AI Response:
    {{ response }}

    Provide the evaluation exactly matching this JSON schema:
    {{ ctx.output_format }}
  "#
}
