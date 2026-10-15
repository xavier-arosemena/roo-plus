# Provider setup: OpenRouter

OpenRouter an aggregation gateway that routes one API key to hundreds of models from many vendors.

> Roo+ is a GitHub-only fork and links only to Roo+ GitHub resources. Open your
> provider's own console from the provider card in **Settings → Providers** to create
> credentials; this page does not restate third-party URLs.

## What this provider is

- **How you connect** — an OpenRouter API key.
- **Default endpoint** — `https://openrouter.ai/api/v1`.

## Get an OpenRouter API key

1. Sign in to your OpenRouter account.
2. Create an API key on the Keys page.
3. Copy the key for the next step.

> Keep credentials out of your repository. Roo+ stores provider secrets in VS Code
> secret storage, not in a committed settings file.

## Configure in Roo+

1. Open **Settings → Providers**.
2. Select **OpenRouter** from the provider list.
3. Provide the credential or endpoint described above.
4. Confirm the base URL (default `https://openrouter.ai/api/v1`) if the field is shown.
5. Choose a model (see below) and press **Save**.

## Recommended models

- `anthropic/claude-sonnet-4.5`
- `(the rest of the catalog is fetched from OpenRouter)`

## Pricing notes

Pass-through per-token pricing per model; some models are free.
