# Provider setup: DeepSeek

DeepSeek serves the DeepSeek chat and reasoning models through the DeepSeek API.

> Roo+ is a GitHub-only fork and links only to Roo+ GitHub resources. Open your
> provider's own console from the provider card in **Settings → Providers** to create
> credentials; this page does not restate third-party URLs.

## What this provider is

- **How you connect** — a DeepSeek API key.
- **Default endpoint** — `https://api.deepseek.com`.

## Get a DeepSeek API key

1. Sign in to the DeepSeek platform.
2. Create an API key under API Keys.
3. Copy the key for the next step.

> Keep credentials out of your repository. Roo+ stores provider secrets in VS Code
> secret storage, not in a committed settings file.

## Configure in Roo+

1. Open **Settings → Providers**.
2. Select **DeepSeek** from the provider list.
3. Provide the credential or endpoint described above.
4. Confirm the base URL (default `https://api.deepseek.com`) if the field is shown.
5. Choose a model (see below) and press **Save**.

## Recommended models

- `deepseek-v4-flash`
- `deepseek-v4-pro`
- `deepseek-v4-flash-vision-exp`

## Pricing notes

Low per-token pricing; see the DeepSeek platform for current rates.
