// Server-side, opt-in timings. Callers use fixed operation/stage names only;
// never pass account IDs, emails, filenames, URLs, tokens or request payloads.
export function createPerformanceTrace(operation: string) {
  const enabled = process.env.NUSC_PERFORMANCE_LOGS === 'true';
  const started = performance.now();
  const stages: Record<string, number> = {};
  let finished = false;
  return {
    async measure<T>(stage: string, work: () => PromiseLike<T>): Promise<T> {
      const start = performance.now();
      try { return await work(); }
      finally { if (enabled) stages[stage] = Math.round(performance.now() - start); }
    },
    finish() {
      if (enabled && !finished) {
        finished = true;
        console.info('[nusc-performance]', JSON.stringify({ operation, totalMs: Math.round(performance.now() - started), stages }));
      }
    },
  };
}
