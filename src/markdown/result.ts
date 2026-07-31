import type { Diagnostic } from "../contracts/diagnostics.ts";
export type MarkdownResult<Value> =
  | { readonly ok: true; readonly value: Value; readonly diagnostics: readonly [] }
  | { readonly ok: false; readonly diagnostics: readonly Diagnostic[] };
