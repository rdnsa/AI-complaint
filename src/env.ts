import type { Peran } from './domain/types';

/**
 * Infrastructure bindings and configuration.
 *
 * Kept apart from the domain layer: nothing under `domain/` may import this
 * file, which is what stops database and platform concerns from leaking into
 * the business rules.
 */
export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  ASSETS: Fetcher;

  // vars (wrangler.jsonc)
  LLM_BASE_URL: string;
  LLM_MODEL: string;

  // secrets (wrangler secret put)
  LLM_API_KEY: string;
  AUTH_SECRET: string;
}

/** Shared Hono types: bindings plus the variables the auth middleware fills in. */
export type AppEnv = {
  Bindings: Env;
  Variables: { sesi: { id: string; nama: string; peran: Peran } };
};
