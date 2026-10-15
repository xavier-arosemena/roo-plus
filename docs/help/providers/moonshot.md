# Provider setup: Moonshot

Moonshot serves Moonshot's Kimi language models through the Moonshot API.

> Roo+ is a GitHub-only fork and links only to Roo+ GitHub resources. Open your
> provider's own console from the provider card in **Settings → Providers** to create
> credentials; this page does not restate third-party URLs.

## What this provider is

- **How you connect** — a Moonshot API key.
- **Default endpoint** — `https://api.moonshot.ai/v1`.

## Get a Moonshot API key

1. Sign in to the Moonshot platform.
2. Create an API key.
3. Copy the key for the next step.

> Keep credentials out of your repository. Roo+ stores provider secrets in VS Code
> secret storage, not in a committed settings file.

## Configure in Roo+

1. Open **Settings → Providers**.
2. Select **Moonshot** from the provider list.
3. Provide the credential or endpoint described above.
4. Confirm the base URL (default `https://api.moonshot.ai/v1`) if the field is shown.
5. Choose a model (see below) and press **Save**.

## Recommended models

- `kimi-k2-0905-preview`
- `kimi-k2-thinking`
- `kimi-k2.7-code`

## Pricing notes

Per-token pricing tiered by context length.
