# Uni AI API - Python Integration Guide

This guide is for a Python client that needs to call the Uni AI API.

The client only needs to send HTTP JSON requests and read JSON responses.

## Base URL

Local testing:

```text
http://localhost:4000
```

Production:

```text
https://<your-production-domain>
```

## Authentication

The query endpoint requires a Uni AI API key.

Send the key in this header:

```http
Authorization: Bearer <uni_api_key>
```

Example:

```http
Authorization: Bearer uni_abc123...
```

Notes for the Python client:

- The key is a Uni AI key that starts with `uni_`.
- Do not modify or hash the key before sending it.
- Keep the key in an environment variable or secret manager.
- Send the key on every `/v1/query` request.

## Health Check

Use this to confirm the API is reachable.

```http
GET /health
```

Curl:

```bash
curl http://localhost:4000/health
```

Success response:

```json
{
  "status": "ok",
  "timestamp": "2026-06-30T16:30:32.368Z"
}
```

## Query

Send a prompt and receive the API response.

```http
POST /v1/query
Authorization: Bearer <uni_api_key>
Content-Type: application/json
```

Request body:

```json
{
  "prompt": "Say hello in one sentence."
}
```

Curl:

```bash
curl -X POST http://localhost:4000/v1/query \
  -H "Authorization: Bearer uni_abc123..." \
  -H "Content-Type: application/json" \
  -d "{\"prompt\":\"Say hello in one sentence.\"}"
```

Success response:

```json
{
  "answer": "Hello, it is great to meet you."
}
```

Fields the Python client should expect:

| Field | Type | Meaning |
| --- | --- | --- |
| `answer` | string | Final answer text. |
| `other fields` | n/a | Not exposed in the public response. |

## Error Responses

### `400` Invalid Request

Usually caused by a missing or empty `prompt`.

```json
{
  "error": {
    "issues": []
  }
}
```

### `401` Missing Or Invalid API Key

```json
{
  "error": "Missing or invalid Authorization header"
}
```

or:

```json
{
  "error": "Invalid or revoked API key"
}
```

### `402` Insufficient Compute Units

```json
{
  "error": "Insufficient Compute Units",
  "message": "Your API key has run out of compute units. Please top up to continue using Uni AI.",
  "computeUnitsRemaining": 0
}
```

### `429` Rate Limited

```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Max 60 requests per 60s window.",
  "retryAfter": 60
}
```

### `500` Server Error

```json
{
  "error": "Internal Server Error"
}
```

## Python Wrapper Example

Install dependency:

```bash
pip install requests
```

Client:

```python
from __future__ import annotations

import os
from typing import Any

import requests


class UniAIError(Exception):
    pass


class UniAIClient:
    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        timeout: int = 300,
    ) -> None:
        self.api_key = api_key or os.environ["UNI_AI_API_KEY"]
        self.base_url = (base_url or os.getenv("UNI_AI_BASE_URL", "http://localhost:4000")).rstrip("/")
        self.timeout = timeout

    def query(self, prompt: str) -> dict[str, Any]:
        if not prompt or not prompt.strip():
            raise ValueError("prompt must not be empty")

        response = requests.post(
            f"{self.base_url}/v1/query",
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            json={"prompt": prompt},
            timeout=self.timeout,
        )

        try:
            payload = response.json()
        except ValueError as exc:
            raise UniAIError(f"Non-JSON response: HTTP {response.status_code}") from exc

        if not response.ok:
            error = payload.get("error", "Unknown error")
            message = payload.get("message")
            detail = f"{error}: {message}" if message else str(error)
            raise UniAIError(f"Request failed with HTTP {response.status_code}: {detail}")

        return payload
```

Usage:

```python
client = UniAIClient(
    api_key="uni_abc123...",
    base_url="http://localhost:4000",
)

result = client.query("Say hello in one sentence.")

print(result["answer"])
```

## Minimal Smoke Test

```python
import os
import requests

base_url = os.getenv("UNI_AI_BASE_URL", "http://localhost:4000")
api_key = os.environ["UNI_AI_API_KEY"]

response = requests.post(
    f"{base_url}/v1/query",
    headers={"Authorization": f"Bearer {api_key}"},
    json={"prompt": "Say hello in one sentence."},
    timeout=300,
)

print("status:", response.status_code)
print(response.json())
response.raise_for_status()
```

Run with:

```bash
export UNI_AI_BASE_URL="http://localhost:4000"
export UNI_AI_API_KEY="uni_abc123..."
python smoke_test.py
```

PowerShell:

```powershell
$env:UNI_AI_BASE_URL="http://localhost:4000"
$env:UNI_AI_API_KEY="uni_abc123..."
python smoke_test.py
```

## Client Requirements

- Send JSON.
- Read JSON.
- Include the Bearer token on `/v1/query`.
- Use a timeout up to `300` seconds.
- Handle `400`, `401`, `402`, `429`, and `500`.
- The public response includes only the final `answer`.
