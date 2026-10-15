# Provider setup: Ollama

Ollama runs open models locally and exposes them over a local HTTP API.

> Roo+ is a GitHub-only fork and links only to Roo+ GitHub resources. Open your
> provider's own console from the provider card in **Settings → Providers** to create
> credentials; this page does not restate third-party URLs.

## What this provider is

- **How you connect** — no credential — the server runs on your own machine.
- **Default endpoint** — `http://localhost:11434`.

## Run Ollama locally

1. Install Ollama and pull a model, for example a coding model.
2. Confirm the Ollama server is running.
3. Choose Ollama in Roo+, confirm the base URL, and save.

> Keep credentials out of your repository. Roo+ stores provider secrets in VS Code
> secret storage, not in a committed settings file.

## Configure in Roo+

1. Open **Settings → Providers**.
2. Select **Ollama** from the provider list.
3. Provide the credential or endpoint described above.
4. Confirm the base URL (default `http://localhost:11434`) if the field is shown.
5. Choose a model (see below) and press **Save**.

## Recommended models

- `devstral:24b`
- `(any model you have pulled with Ollama)`

## Pricing notes

Free — inference runs on your own machine.
