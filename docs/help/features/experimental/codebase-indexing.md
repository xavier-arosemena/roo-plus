# Codebase Indexing

Codebase indexing builds a semantic index of your project so Roo+ can find relevant code
by meaning, not just by exact text. It powers search that understands intent — "where do
we validate webhook signatures?" — across large repositories.

> Codebase indexing is an experimental feature. Behavior and settings may change between
> releases.

## What it does

Roo+ splits your source files into blocks, converts each block into a vector embedding,
and stores the vectors in a vector database. When it searches, it embeds your query and
retrieves the closest blocks. The result is context that is relevant even when it does not
share your exact wording.

## Quick start

1. Open the codebase-indexing popover from the chat (the database icon) or from settings.
2. Choose an **embedder** — the provider that turns text into vectors. Roo+ supports
   OpenAI, Ollama, an OpenAI-compatible endpoint, Gemini, Mistral, Vercel AI Gateway,
   Amazon Bedrock, OpenRouter, and Semble.
3. Provide a **vector store**: either a local or hosted Qdrant instance.
4. Save, then start indexing.
5. Watch the indexer report progress until the initial pass completes.

Once indexed, Roo+ uses the index automatically when it needs repository context. As you
edit files, the indexer keeps the index up to date.

## Managing the indexer

The popover is also the control panel:

- **Start / pause** indexing.
- **Re-index** to rebuild after large changes or an embedder switch.
- **Clear** the index to start clean.
- **View state** — counts of indexed blocks and files, and the current activity.

## Configuration fields

| Field                       | Purpose                                                                                                                                                     |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Embedder provider           | Which service creates embeddings: OpenAI, Ollama, an OpenAI-compatible endpoint, Gemini, Mistral, Vercel AI Gateway, Amazon Bedrock, OpenRouter, or Semble. |
| Embedder model / dimensions | The specific embedding model and its vector size.                                                                                                           |
| Vector store URL            | Address of the Qdrant instance used to store vectors.                                                                                                       |
| API key                     | Credential for a hosted embedder, when required.                                                                                                            |
| Search minimum score        | How similar a block must be to count as a match.                                                                                                            |
| Max search results          | How many blocks the search returns.                                                                                                                         |

Changing the embedder or its dimensions requires re-indexing, because vectors from
different models are not comparable.

## How files are processed

Roo+ walks the workspace, applies your ignore rules and default exclusions, and skips very
large files. Remaining files are split into overlapping blocks so that context spanning a
boundary is still findable. Each block is embedded and stored with its file path and line
range, which is what lets a result point back to the exact code.

## Best practices

- Keep the index scoped to source: rely on your ignore files to exclude builds, vendored
  dependencies, and generated code.
- Prefer a local embedder for privacy or offline work; prefer a hosted embedder for speed
  on large repositories.
- Re-index after switching embedding models or dimensions.
- Tune the minimum search score rather than returning many weak matches.

## Troubleshooting

- **Indexing never finishes.** Check that the vector store is reachable and that the
  embedder credential is valid.
- **Search returns nothing useful.** Confirm the index reports indexed files, and lower
  the minimum score slightly.
- **Errors after changing the model.** Re-index — the existing vectors were produced by a
  different model.
- **Files are missing from the index.** They may be ignored by an ignore rule or exceed
  the size limit.

## Privacy

What leaves your machine depends entirely on the embedder you choose:

- **Local embedder** — embeddings are computed on your machine; source text does not leave
  it, only the vectors are stored locally.
- **Hosted embedder** — the text of indexed blocks is sent to that provider to be
  embedded.

Choose the embedder that matches your privacy requirements, and remember that the index
can be cleared at any time.
