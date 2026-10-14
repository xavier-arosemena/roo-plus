# Provider setup: GCP Vertex AI

GCP Vertex AI serves Google and partner models through a Google Cloud Vertex AI project.

> Roo+ is a GitHub-only fork and links only to Roo+ GitHub resources. Open your
> provider's own console from the provider card in **Settings → Providers** to create
> credentials; this page does not restate third-party URLs.

## What this provider is

- **How you connect** — a Google Cloud service-account JSON key plus the project id and region.

## Prepare a Vertex AI project

1. Enable the Vertex AI API in your Google Cloud project.
2. Create a service account with the Vertex AI User role and download its JSON key.
3. In Roo+ paste the JSON key and set the project id and region.

> Keep credentials out of your repository. Roo+ stores provider secrets in VS Code
> secret storage, not in a committed settings file.

## Configure in Roo+

1. Open **Settings → Providers**.
2. Select **GCP Vertex AI** from the provider list.
3. Provide the credential or endpoint described above.
4. Choose a model (see below) and press **Save**.

## Recommended models

- `claude-sonnet-4-5@20250929`
- `gemini-3.1-pro-preview`
- `gemini-2.5-pro`

## Pricing notes

Billed by Google Cloud per token / per model.
