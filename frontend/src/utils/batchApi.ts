export async function runInBatches<T, R>(items: T[], handler: (item: T) => Promise<R>, concurrency = 6) {
  const results: PromiseSettledResult<R>[] = [];
  let i = 0;
  const runBatch = async () => {
    while (i < items.length) {
      const start = i;
      i += concurrency;
      const batch = items.slice(start, Math.min(start + concurrency, items.length));
      // eslint-disable-next-line no-await-in-loop
      const res = await Promise.allSettled(batch.map((it) => handler(it)));
      results.push(...res);
    }
  };
  await runBatch();
  return results;
}
