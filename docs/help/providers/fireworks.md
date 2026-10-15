# Provider setup: Fireworks AI

Fireworks AI serves fast hosted inference for popular open models.

> Roo+ is a GitHub-only fork and links only to Roo+ GitHub resources. Open your
> provider's own console from the provider card in **Settings → Providers** to create
> credentials; this page does not restate third-party URLs.

## What this provider is

- **How you connect** — a Fireworks AI API key.
- **Default endpoint** — `https://api.fireworks.ai/inference/v1`.

## Get a Fireworks API key

1. Sign in to Fireworks AI.
2. Create an API key.
3. Copy the key for the next step.

> Keep credentials out of your repository. Roo+ stores provider secrets in VS Code
> secret storage, not in a committed settings file.

## Configure in Roo+

1. Open **Settings → Providers**.
2. Select **Fireworks AI** from the provider list.
3. Provide the credential or endpoint described above.
4. Confirm the base URL (default `https://api.fireworks.ai/inference/v1`) if the field is shown.
5. Choose a model (see below) and press **Save**.

## Recommended models

- `accounts/fireworks/models/kimi-k2-instruct-0905`
- `accounts/fireworks/models/deepseek-v3`
- `accounts/fireworks/models/qwen3-coder-480b-a35b-instruct`

## Pricing notes

Per-token pricing published by Fireworks.
