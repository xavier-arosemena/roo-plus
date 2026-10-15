# Provider setup: OpenAI

OpenAI serves the official OpenAI GPT models through the OpenAI API.

> Roo+ is a GitHub-only fork and links only to Roo+ GitHub resources. Open your
> provider's own console from the provider card in **Settings → Providers** to create
> credentials; this page does not restate third-party URLs.

## What this provider is

- **How you connect** — an OpenAI API key.
- **Default endpoint** — `https://api.openai.com/v1`.

## Get an OpenAI API key

1. Sign in to the OpenAI platform.
2. Create an API key under API keys.
3. Copy the key for the next step.

> Keep credentials out of your repository. Roo+ stores provider secrets in VS Code
> secret storage, not in a committed settings file.

## Configure in Roo+

1. Open **Settings → Providers**.
2. Select **OpenAI** from the provider list.
3. Provide the credential or endpoint described above.
4. Confirm the base URL (default `https://api.openai.com/v1`) if the field is shown.
5. Choose a model (see below) and press **Save**.

## Recommended models

- `gpt-5.6-sol`
- `gpt-5`
- `o4-mini`

## Pricing notes

Priced per token by OpenAI; see your account for current rates.
