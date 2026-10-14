# Provider setup: Baseten

Baseten hosts and serves models through the Baseten inference API.

> Roo+ is a GitHub-only fork and links only to Roo+ GitHub resources. Open your
> provider's own console from the provider card in **Settings → Providers** to create
> credentials; this page does not restate third-party URLs.

## What this provider is

- **How you connect** — a Baseten API key.
- **Default endpoint** — `https://inference.baseten.co/v1`.

## Get a Baseten API key

1. Sign in to Baseten.
2. Create an API key.
3. Copy the key for the next step.

> Keep credentials out of your repository. Roo+ stores provider secrets in VS Code
> secret storage, not in a committed settings file.

## Configure in Roo+

1. Open **Settings → Providers**.
2. Select **Baseten** from the provider list.
3. Provide the credential or endpoint described above.
4. Confirm the base URL (default `https://inference.baseten.co/v1`) if the field is shown.
5. Choose a model (see below) and press **Save**.

## Recommended models

- `zai-org/GLM-4.6`
- `moonshotai/Kimi-K2-Thinking`
- `(the rest of your deployments)`

## Pricing notes

Billed by Baseten per deployment / per token.
