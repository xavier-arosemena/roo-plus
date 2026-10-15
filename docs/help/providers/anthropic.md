# Provider setup: Anthropic

Anthropic serves the Claude family of models directly through the Anthropic API.

> Roo+ is a GitHub-only fork and links only to Roo+ GitHub resources. Open your
> provider's own console from the provider card in **Settings → Providers** to create
> credentials; this page does not restate third-party URLs.

## What this provider is

- **How you connect** — an Anthropic API key (or an auth token when you set a custom base URL).

## Get an Anthropic API key

1. Sign in to your Anthropic account console.
2. Create an API key.
3. Copy the key for the next step.

> Keep credentials out of your repository. Roo+ stores provider secrets in VS Code
> secret storage, not in a committed settings file.

## Configure in Roo+

1. Open **Settings → Providers**.
2. Select **Anthropic** from the provider list.
3. Provide the credential or endpoint described above.
4. Choose a model (see below) and press **Save**.

## Recommended models

- `claude-sonnet-4-5`
- `claude-opus-4-1-20250805`
- `claude-haiku-4-5-20251001`

## Pricing notes

Priced per token by Anthropic; see your Anthropic account for current rates.
