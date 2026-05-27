import data from './changelog.json'

export interface ChangelogEntry {
  /** Semantic version, e.g. "1.0.0". */
  version: string
  /** Release date, ISO YYYY-MM-DD. */
  date: string
  changes: {
    new?: string[]
    improved?: string[]
    fixed?: string[]
  }
}

/**
 * Every release, newest first. To add an entry, prepend a new object to
 * `changelog.json` — that one edit is the entire release-note flow.
 */
export const CHANGELOG: ChangelogEntry[] = data as ChangelogEntry[]

/** Returns -1 / 0 / 1 if `a` is older than / same as / newer than `b`. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i += 1) {
    const va = pa[i] ?? 0
    const vb = pb[i] ?? 0
    if (va !== vb) return va < vb ? -1 : 1
  }
  return 0
}
