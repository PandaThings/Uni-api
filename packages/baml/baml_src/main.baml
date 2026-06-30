generator client {
  output_type "typescript"
  output_dir "../"
  version "0.67.0"
}

client<llm> ClaudeHaiku {
  provider anthropic
  options {
    model "claude-haiku-4-5"
    api_key env.ANTHROPIC_API_KEY
  }
}

client<llm> ClaudeSonnet {
  provider anthropic
  options {
    model "claude-sonnet-4-5"
    api_key env.ANTHROPIC_API_KEY
  }
}
