# Provider setup: Amazon Bedrock

Amazon Bedrock serves Amazon Bedrock foundation models through AWS credentials.

> Roo+ is a GitHub-only fork and links only to Roo+ GitHub resources. Open your
> provider's own console from the provider card in **Settings → Providers** to create
> credentials; this page does not restate third-party URLs.

## What this provider is

- **How you connect** — AWS credentials (access keys, or a profile/ARN) with Bedrock invoke permissions.

## Prepare AWS credentials

1. Request model access for the Bedrock models you need in the AWS console.
2. Create an IAM principal with Bedrock invoke permissions and obtain access keys.
3. In Roo+ enter the region and credentials, or a custom ARN.

> Keep credentials out of your repository. Roo+ stores provider secrets in VS Code
> secret storage, not in a committed settings file.

## Configure in Roo+

1. Open **Settings → Providers**.
2. Select **Amazon Bedrock** from the provider list.
3. Provide the credential or endpoint described above.
4. Choose a model (see below) and press **Save**.

## Recommended models

- `anthropic.claude-sonnet-4-5-20250929-v1:0`
- `anthropic.claude-sonnet-4-20250514-v1:0`
- `amazon.nova-pro-v1:0`

## Pricing notes

Billed by AWS per token / per provisioned throughput.
