class MemoryEntry {
  summary string
  category string
  embeddingText string
}

function WriteMemory(prompt: string, response: string) -> MemoryEntry {
  client ClaudeHaiku
  prompt #"
    Extract the key architectural decisions, facts, or code patterns from this interaction to store in memory.
    The summary should be a brief label.
    The category should be one of: backend, frontend, architecture, devops, coding.
    The embeddingText should be a dense, factual paragraph containing all the important details to remember.

    Prompt:
    {{ prompt }}

    Response:
    {{ response }}

    Extract memory exactly matching this JSON schema:
    {{ ctx.output_format }}
  "#
}
