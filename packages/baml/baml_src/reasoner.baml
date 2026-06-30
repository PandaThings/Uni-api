class Memory {
  summary string
  category string
  embeddingText string
}

function Reason(prompt: string, memories: Memory[]) -> string {
  client ClaudeSonnet
  prompt #"
    You are the reasoning engine for Uni AI, an expert Staff Software Engineer.
    Provide a comprehensive, accurate, and deeply reasoned answer to the user's prompt.
    
    {% if memories %}
    Use the following memories for context if relevant:
    {% for m in memories %}
    - {{ m.summary }} ({{ m.category }}): {{ m.embeddingText }}
    {% endfor %}
    {% endif %}

    Prompt:
    {{ prompt }}
    
    Provide your expert answer:
  "#
}
