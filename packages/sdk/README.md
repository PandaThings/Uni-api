# Uni AI Client

Official JavaScript and TypeScript client for Uni AI.

## Install

```bash
npm install @uni-ai/client
```

## Usage

```ts
import { UniAI } from "@uni-ai/client";

const client = new UniAI({
  apiKey: process.env.UNI_AI_API_KEY!,
});

const result = await client.query("Review this backend design.");

console.log(result.answer);
```

## Configuration

```ts
const client = new UniAI({
  apiKey: "uni_your_key_here",
  baseUrl: "https://uni-ai.aquesa-solutions.com",
  timeoutMs: 300_000,
});
```

## Response

```ts
type UniAIQueryResponse = {
  answer: string;
};
```

## Errors

Non-success responses throw `UniAIError`.

```ts
import { UniAI, UniAIError } from "@uni-ai/client";

try {
  const result = await client.query("Explain rate limiting.");
  console.log(result.answer);
} catch (error) {
  if (error instanceof UniAIError) {
    console.error(error.status);
    console.error(error.payload);
  }
}
```

## API Key

Use a Uni AI API key that starts with `uni_`.

Do not publish API keys in source code, npm packages, examples, or public repositories.
