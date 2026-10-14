# Provider setup: MiniMax

MiniMax serves the MiniMax text models through the MiniMax API.

> Roo+ is a GitHub-only fork and links only to Roo+ GitHub resources. Open your
> provider's own console from the provider card in **Settings → Providers** to create
> credentials; this page does not restate third-party URLs.

## What this provider is

- **How you connect** — a MiniMax API key.
- **Default endpoint** — `https://api.minimax.io/anthropic`.

## Get a MiniMax API key

1. Sign in to the MiniMax platform.
2. Create an API key and note the group id if required.
3. Copy the key for the next step.

> Keep credentials out of your repository. Roo+ stores provider secrets in VS Code
> secret storage, not in a committed settings file.

## Configure in Roo+

1. Open **Settings → Providers**.
2. Select **MiniMax** from the provider list.
3. Provide the credential or endpoint described above.
4. Confirm the base URL (default `https://api.minimax.io/anthropic`) if the field is shown.
5. Choose a model (see below) and press **Save**.

## Recommended models

- `MiniMax-M3`
- `MiniMax-M2.7`
- `MiniMax-M2.5`

## Pricing notes

Per-token pricing published by MiniMax.
