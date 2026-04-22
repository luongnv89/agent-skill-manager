/**
 * MiniSearch configuration shared between the build script and the
 * frontend loader. Kept in one place so a future edit to scoring or
 * tokenization can't drift silently between build-time serialization
 * and runtime deserialization — a mismatch corrupts search ranking
 * without any thrown error.
 *
 * The frontend (website/index.html) keeps its own inline copy of
 * these options because plain HTML can't import TypeScript. The
 * build-verification test compares the two against this module.
 */
export const MINISEARCH_OPTIONS = {
  idField: "id",
  fields: ["name", "description", "categoriesStr"],
  storeFields: [] as string[],
  searchOptions: {
    boost: { name: 3, description: 1, categoriesStr: 1 },
    prefix: true,
    fuzzy: 0.2,
  },
};
