export const MODELS = {
  HAIKU: "claude-3-haiku-20240307",
  SONNET: "claude-3-5-sonnet-20241022"
} as const;

// Costs per 1M tokens (in USD)
export const COSTS = {
  [MODELS.HAIKU]: {
    input: 0.25,
    output: 1.25
  },
  [MODELS.SONNET]: {
    input: 3.00,
    output: 15.00
  }
} as const;
