# Provider setup: Qwen Code

Qwen Code serves Qwen's coding models through the Qwen Code endpoint.

> Roo+ is a GitHub-only fork and links only to Roo+ GitHub resources. Open your
> provider's own console from the provider card in **Settings → Providers** to create
> credentials; this page does not restate third-party URLs.

## What this provider is

- **How you connect** — a Qwen Code (DashScope) API key, or the Qwen OAuth sign-in.
- **Default endpoint** — `https://dashscope.aliyuncs.com/compatible-mode/v1`.

## Get a Qwen Code API key

1. Sign in to the Qwen Code / DashScope console.
2. Create an API key.
3. Copy the key for the next step.

> Keep credentials out of your repository. Roo+ stores provider secrets in VS Code
> secret storage, not in a committed settings file.

## Configure in Roo+

1. Open **Settings → Providers**.
2. Select **Qwen Code** from the provider list.
3. Provide the credential or endpoint described above.
4. Confirm the base URL (default `https://dashscope.aliyuncs.com/compatible-mode/v1`) if the field is shown.
5. Choose a model (see below) and press **Save**.

## Recommended models

- `qwen3-coder-plus`
- `qwen3-coder-flash`

## Pricing notes

Per-token pricing published by Alibaba Cloud.
