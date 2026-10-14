# Provider setup: xAI (Grok)

xAI (Grok) serves the Grok models through the xAI API.

> Roo+ is a GitHub-only fork and links only to Roo+ GitHub resources. Open your
> provider's own console from the provider card in **Settings → Providers** to create
> credentials; this page does not restate third-party URLs.

## What this provider is

- **How you connect** — an xAI API key.
- **Default endpoint** — `https://api.x.ai/v1`.

## Get an xAI API key

1. Sign in to the xAI console.
2. Create an API key.
3. Copy the key for the next step.

> Keep credentials out of your repository. Roo+ stores provider secrets in VS Code
> secret storage, not in a committed settings file.

## Configure in Roo+

1. Open **Settings → Providers**.
2. Select **xAI (Grok)** from the provider list.
3. Provide the credential or endpoint described above.
4. Confirm the base URL (default `https://api.x.ai/v1`) if the field is shown.
5. Choose a model (see below) and press **Save**.

## Recommended models

- `grok-4.5`
- `grok-code-fast-1`
- `grok-4.20`

## Pricing notes

Per-token pricing published by xAI.
