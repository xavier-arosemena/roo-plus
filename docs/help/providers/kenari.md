# Provider setup: Kenari

Kenari is a model provider exposed through an OpenAI-compatible endpoint.

> Roo+ is a GitHub-only fork and links only to Roo+ GitHub resources. Open your
> provider's own console from the provider card in **Settings → Providers** to create
> credentials; this page does not restate third-party URLs.

## What this provider is

- **How you connect** — a Kenari API key.
- **Default endpoint** — `https://kenari.id/v1`.

## Get a Kenari API key

1. Sign in to Kenari.
2. Create an API key.
3. Copy the key for the next step.

> Keep credentials out of your repository. Roo+ stores provider secrets in VS Code
> secret storage, not in a committed settings file.

## Configure in Roo+

1. Open **Settings → Providers**.
2. Select **Kenari** from the provider list.
3. Provide the credential or endpoint described above.
4. Confirm the base URL (default `https://kenari.id/v1`) if the field is shown.
5. Choose a model (see below) and press **Save**.

## Recommended models

- `glm-5-2`
- `(the rest of the catalog is fetched from the Kenari endpoint)`

## Pricing notes

Per the Kenari service terms.
