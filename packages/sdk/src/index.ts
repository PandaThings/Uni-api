export type UniAIConfig = {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
};

export type UniAIScore = {
  accuracy: number;
  completeness: number;
  reasoning: number;
  security: number;
};

export type UniAIQueryResponse = {
  answer: string;
};

export type UniAIErrorPayload = {
  error?: unknown;
  message?: string;
  [key: string]: unknown;
};

export class UniAIError extends Error {
  readonly status: number;
  readonly payload: UniAIErrorPayload | unknown;

  constructor(message: string, status: number, payload: UniAIErrorPayload | unknown) {
    super(message);
    this.name = "UniAIError";
    this.status = status;
    this.payload = payload;
  }
}

export class UniAI {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(config: UniAIConfig) {
    if (!config.apiKey?.trim()) {
      throw new Error("apiKey is required");
    }

    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? "https://uni-ai.aquesa-solutions.com").replace(/\/+$/, "");
    this.timeoutMs = config.timeoutMs ?? 300_000;
  }

  async query(prompt: string): Promise<UniAIQueryResponse> {
    if (!prompt.trim()) {
      throw new Error("prompt must not be empty");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/v1/query`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
        signal: controller.signal,
      });

      const payload = await parseJson(response);

      if (!response.ok) {
        throw new UniAIError(getErrorMessage(payload), response.status, payload);
      }

      return payload as UniAIQueryResponse;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new UniAIError("Uni AI request timed out", 408, { message: "Request timed out" });
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

async function parseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new UniAIError("Uni AI returned a non-JSON response", response.status, null);
  }
}

function getErrorMessage(payload: unknown): string {
  if (payload && typeof payload === "object") {
    const value = payload as UniAIErrorPayload;

    if (typeof value.message === "string") {
      return value.message;
    }

    if (typeof value.error === "string") {
      return value.error;
    }
  }

  return "Uni AI request failed";
}
