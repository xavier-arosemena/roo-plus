# Provider setup: VS Code LM API

VS Code LM API uses the language models exposed by your VS Code installation (for example Copilot).

> Roo+ is a GitHub-only fork and links only to Roo+ GitHub resources. Open your
> provider's own console from the provider card in **Settings → Providers** to create
> credentials; this page does not restate third-party URLs.

## What this provider is

- **How you connect** — no credential — Roo+ uses the models your VS Code extensions expose.

## Enable the VS Code language model API

1. Install and sign in to an extension that provides VS Code language models.
2. Choose VS Code LM API in Settings → Providers.
3. Select one of the models VS Code reports.

> Keep credentials out of your repository. Roo+ stores provider secrets in VS Code
> secret storage, not in a committed settings file.

## Configure in Roo+

1. Open **Settings → Providers**.
2. Select **VS Code LM API** from the provider list.
3. Provide the credential or endpoint described above.
4. Choose a model (see below) and press **Save**.

## Recommended models

- `(models provided by your VS Code extensions)`

## Pricing notes

Billed by the extension that provides the model; Roo+ adds no markup.
