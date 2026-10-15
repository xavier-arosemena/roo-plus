# Provider setup: Google Gemini

Google Gemini serves Google's Gemini models through the Gemini API.

> Roo+ is a GitHub-only fork and links only to Roo+ GitHub resources. Open your
> provider's own console from the provider card in **Settings → Providers** to create
> credentials; this page does not restate third-party URLs.

## What this provider is

- **How you connect** — a Google AI Studio (Gemini) API key.

## Get a Gemini API key

1. Open Google AI Studio with your Google account.
2. Create an API key.
3. Copy the key for the next step.

> Keep credentials out of your repository. Roo+ stores provider secrets in VS Code
> secret storage, not in a committed settings file.

## Configure in Roo+

1. Open **Settings → Providers**.
2. Select **Google Gemini** from the provider list.
3. Provide the credential or endpoint described above.
4. Choose a model (see below) and press **Save**.

## Recommended models

- `gemini-3.1-pro-preview`
- `gemini-2.5-pro`
- `gemini-2.5-flash`

## Pricing notes

Free tier plus paid per-token pricing per Google's published rates.
