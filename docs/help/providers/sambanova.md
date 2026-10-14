# Provider setup: SambaNova

SambaNova serves fast open-model inference through the SambaNova Cloud API.

> Roo+ is a GitHub-only fork and links only to Roo+ GitHub resources. Open your
> provider's own console from the provider card in **Settings → Providers** to create
> credentials; this page does not restate third-party URLs.

## What this provider is

- **How you connect** — a SambaNova Cloud API key.
- **Default endpoint** — `https://api.sambanova.ai/v1`.

## Get a SambaNova API key

1. Sign in to SambaNova Cloud.
2. Create an API key.
3. Copy the key for the next step.

> Keep credentials out of your repository. Roo+ stores provider secrets in VS Code
> secret storage, not in a committed settings file.

## Configure in Roo+

1. Open **Settings → Providers**.
2. Select **SambaNova** from the provider list.
3. Provide the credential or endpoint described above.
4. Confirm the base URL (default `https://api.sambanova.ai/v1`) if the field is shown.
5. Choose a model (see below) and press **Save**.

## Recommended models

- `Meta-Llama-3.3-70B-Instruct`
- `DeepSeek-R1`
- `Llama-4-Maverick-17B-128E-Instruct`

## Pricing notes

Per-token pricing published by SambaNova.
