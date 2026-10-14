# Provider setup: Vercel AI Gateway

Vercel AI Gateway routes one credential to many providers through Vercel's AI Gateway.

> Roo+ is a GitHub-only fork and links only to Roo+ GitHub resources. Open your
> provider's own console from the provider card in **Settings → Providers** to create
> credentials; this page does not restate third-party URLs.

## What this provider is

- **How you connect** — a Vercel AI Gateway API key.
- **Default endpoint** — `https://ai-gateway.vercel.sh/v1`.

## Get a Vercel AI Gateway key

1. Open the AI Gateway section of your Vercel dashboard.
2. Create an API key.
3. Copy the key for the next step.

> Keep credentials out of your repository. Roo+ stores provider secrets in VS Code
> secret storage, not in a committed settings file.

## Configure in Roo+

1. Open **Settings → Providers**.
2. Select **Vercel AI Gateway** from the provider list.
3. Provide the credential or endpoint described above.
4. Confirm the base URL (default `https://ai-gateway.vercel.sh/v1`) if the field is shown.
5. Choose a model (see below) and press **Save**.

## Recommended models

- `anthropic/claude-sonnet-4`
- `anthropic/claude-sonnet-4.5`
- `openai/gpt-5`

## Pricing notes

Pass-through provider pricing plus Vercel gateway terms.
