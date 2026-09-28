export async function runWithConcurrency(items, maximum, worker) {
  const values = Array.from(items || []);
  const limit = Math.max(1, Math.min(values.length || 1, Math.floor(Number(maximum) || 1)));
  const results = new Array(values.length);
  let cursor = 0;

  async function runNext() {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(values[index], index);
    }
  }

  await Promise.all(Array.from({ length: limit }, () => runNext()));
  return results;
}
