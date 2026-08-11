import { z } from "zod"

export interface GitRepositoryInfo {
	repositoryUrl?: string
	repositoryName?: string
	defaultBranch?: string
}

export interface GitCommit {
	hash: string
	shortHash: string
	subject: string
	author: string
	date: string
}

/**
 * Zod schema mirroring `GitCommit` for payload validation at the outbound
 * message boundary (e.g. the `commitSearchResults` extension message).
 */
export const gitCommitSchema = z.object({
	hash: z.string(),
	shortHash: z.string(),
	subject: z.string(),
	author: z.string(),
	date: z.string(),
})
