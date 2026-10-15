# Provider setup: LiteLLM

LiteLLM is a self-hosted proxy that presents one OpenAI-compatible API over many providers.

> Roo+ is a GitHub-only fork and links only to Roo+ GitHub resources. Open your
> provider's own console from the provider card in **Settings → Providers** to create
> credentials; this page does not restate third-party URLs.

## What this provider is

- **How you connect** — your proxy base URL and its master/virtual key.
- **Default endpoint** — `http://localhost:4000`.

## Run your LiteLLM proxy

1. Deploy the LiteLLM proxy and configure the models you want to expose.
2. Note the proxy base URL and its master/virtual key.
3. Choose LiteLLM in Roo+, enter both, and save.

> Keep credentials out of your repository. Roo+ stores provider secrets in VS Code
> secret storage, not in a committed settings file.

## Configure in Roo+

1. Open **Settings → Providers**.
2. Select **LiteLLM** from the provider list.
3. Provide the credential or endpoint described above.
4. Confirm the base URL (default `http://localhost:4000`) if the field is shown.
5. Choose a model (see below) and press **Save**.

## Recommended models

- `claude-3-7-sonnet-20250219`
- `(the models configured in your proxy)`

## Pricing notes

Whatever the underlying providers charge; the proxy adds no markup.
