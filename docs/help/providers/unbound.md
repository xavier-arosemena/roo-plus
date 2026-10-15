# Provider setup: Unbound

Unbound is a gateway that provides one key for a curated set of models.

> Roo+ is a GitHub-only fork and links only to Roo+ GitHub resources. Open your
> provider's own console from the provider card in **Settings → Providers** to create
> credentials; this page does not restate third-party URLs.

## What this provider is

- **How you connect** — an Unbound API key.
- **Default endpoint** — `https://api.getunbound.ai/v1`.

## Get an Unbound API key

1. Sign in to Unbound.
2. Create an API key.
3. Choose Unbound in Roo+, paste the key, and save.

> Keep credentials out of your repository. Roo+ stores provider secrets in VS Code
> secret storage, not in a committed settings file.

## Configure in Roo+

1. Open **Settings → Providers**.
2. Select **Unbound** from the provider list.
3. Provide the credential or endpoint described above.
4. Confirm the base URL (default `https://api.getunbound.ai/v1`) if the field is shown.
5. Choose a model (see below) and press **Save**.

## Recommended models

- `anthropic/claude-sonnet-4-5`
- `(the models enabled on your key)`

## Pricing notes

Pass-through gateway pricing; see Unbound for current rates.
