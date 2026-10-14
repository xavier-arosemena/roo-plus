# Provider setup: Requesty

Requesty is a routing gateway that offers one key for many models with failover and analytics.

> Roo+ is a GitHub-only fork and links only to Roo+ GitHub resources. Open your
> provider's own console from the provider card in **Settings → Providers** to create
> credentials; this page does not restate third-party URLs.

## What this provider is

- **How you connect** — a Requesty API key.
- **Default endpoint** — `https://router.requesty.ai/v1`.

## Get a Requesty API key

1. Sign in to Requesty.
2. Create an API key.
3. Copy the key for the next step.

> Keep credentials out of your repository. Roo+ stores provider secrets in VS Code
> secret storage, not in a committed settings file.

## Configure in Roo+

1. Open **Settings → Providers**.
2. Select **Requesty** from the provider list.
3. Provide the credential or endpoint described above.
4. Confirm the base URL (default `https://router.requesty.ai/v1`) if the field is shown.
5. Choose a model (see below) and press **Save**.

## Recommended models

- `coding/claude-4-sonnet`
- `(the routed models enabled on your key)`

## Pricing notes

Pass-through routing; see Requesty for current rates.
