# Provider setup: OpenAI - ChatGPT Plus/Pro

OpenAI - ChatGPT Plus/Pro signs in with your ChatGPT Plus or Pro subscription instead of an API key.

> Roo+ is a GitHub-only fork and links only to Roo+ GitHub resources. Open your
> provider's own console from the provider card in **Settings → Providers** to create
> credentials; this page does not restate third-party URLs.

## What this provider is

- **How you connect** — a ChatGPT Plus/Pro sign-in; no API key is stored.

## Sign in with ChatGPT

1. Choose OpenAI - ChatGPT Plus/Pro in Settings → Providers.
2. Click Sign in and complete the ChatGPT authorization flow in your browser.
3. Return to Roo+ once the sign-in succeeds; no API key is stored.

> Keep credentials out of your repository. Roo+ stores provider secrets in VS Code
> secret storage, not in a committed settings file.

## Configure in Roo+

1. Open **Settings → Providers**.
2. Select **OpenAI - ChatGPT Plus/Pro** from the provider list.
3. Provide the credential or endpoint described above.
4. Choose a model (see below) and press **Save**.

## Recommended models

- `gpt-5.6-sol`
- `gpt-5-codex`
- `gpt-5`

## Pricing notes

Uses your ChatGPT Plus/Pro subscription quota rather than per-token API billing.
