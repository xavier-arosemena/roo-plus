# Provider setup: Mistral

Mistral serves the Mistral and Codestral models through the Mistral API.

> Roo+ is a GitHub-only fork and links only to Roo+ GitHub resources. Open your
> provider's own console from the provider card in **Settings → Providers** to create
> credentials; this page does not restate third-party URLs.

## What this provider is

- **How you connect** — a Mistral API key.
- **Default endpoint** — `https://api.mistral.ai`.

## Get a Mistral API key

1. Sign in to the Mistral console.
2. Create an API key under API Keys.
3. Copy the key for the next step.

> Keep credentials out of your repository. Roo+ stores provider secrets in VS Code
> secret storage, not in a committed settings file.

## Configure in Roo+

1. Open **Settings → Providers**.
2. Select **Mistral** from the provider list.
3. Provide the credential or endpoint described above.
4. Confirm the base URL (default `https://api.mistral.ai`) if the field is shown.
5. Choose a model (see below) and press **Save**.

## Recommended models

- `codestral-latest`
- `mistral-large-latest`
- `devstral-medium-latest`

## Pricing notes

Per-token pricing published by Mistral.
