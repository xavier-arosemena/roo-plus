# Provider setup: LM Studio

LM Studio runs models locally and exposes an OpenAI-compatible server.

> Roo+ is a GitHub-only fork and links only to Roo+ GitHub resources. Open your
> provider's own console from the provider card in **Settings → Providers** to create
> credentials; this page does not restate third-party URLs.

## What this provider is

- **How you connect** — no credential — the server runs on your own machine.
- **Default endpoint** — `http://localhost:1234/v1`.

## Run the local LM Studio server

1. Open LM Studio and load a model.
2. Start the local server from the Developer tab.
3. Choose LM Studio in Roo+, confirm the base URL, and save.

> Keep credentials out of your repository. Roo+ stores provider secrets in VS Code
> secret storage, not in a committed settings file.

## Configure in Roo+

1. Open **Settings → Providers**.
2. Select **LM Studio** from the provider list.
3. Provide the credential or endpoint described above.
4. Confirm the base URL (default `http://localhost:1234/v1`) if the field is shown.
5. Choose a model (see below) and press **Save**.

## Recommended models

- `mistralai/devstral-small-2505`
- `(whatever you loaded in LM Studio)`

## Pricing notes

Free — inference runs on your own machine.
