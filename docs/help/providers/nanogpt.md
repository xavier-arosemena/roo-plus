# Provider setup: NanoGPT

NanoGPT is a lightweight gateway that offers one key for a range of hosted models.

> Roo+ is a GitHub-only fork and links only to Roo+ GitHub resources. Open your
> provider's own console from the provider card in **Settings → Providers** to create
> credentials; this page does not restate third-party URLs.

## What this provider is

- **How you connect** — a NanoGPT API key.
- **Default endpoint** — `https://nano-gpt.com/api/v1`.

## Get a NanoGPT API key

1. Sign in to NanoGPT.
2. Create an API key.
3. Choose NanoGPT in Roo+, paste the key, and save.

> Keep credentials out of your repository. Roo+ stores provider secrets in VS Code
> secret storage, not in a committed settings file.

## Configure in Roo+

1. Open **Settings → Providers**.
2. Select **NanoGPT** from the provider list.
3. Provide the credential or endpoint described above.
4. Confirm the base URL (default `https://nano-gpt.com/api/v1`) if the field is shown.
5. Choose a model (see below) and press **Save**.

## Recommended models

- `openai/gpt-5.6-sol`
- `(the rest of the catalog is fetched from the NanoGPT endpoint)`

## Pricing notes

Pass-through gateway pricing; see NanoGPT for current rates.
