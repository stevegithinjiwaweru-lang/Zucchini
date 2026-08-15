/**
 * Offline tests for retry / backoff helpers.
 * Run: npx ts-node --transpile-only scripts/test-shopify-retry.ts
 */
import assert from "assert";

function backoffDelay(attempt: number, baseDelayMs: number, maxDelayMs: number): number {
  const exp = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, Math.max(0, attempt - 1)));
  const jitter = exp * (0.8 + Math.random() * 0.4);
  return Math.round(Math.min(maxDelayMs, jitter));
}

async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  opts: { attempts?: number; shouldRetry?: (err: unknown) => boolean } = {}
): Promise<T> {
  const attempts = opts.attempts ?? 3;
  const shouldRetry = opts.shouldRetry ?? (() => true);
  let last: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      last = err;
      if (attempt >= attempts || !shouldRetry(err)) throw err;
    }
  }
  throw last;
}

let passed = 0;
let failed = 0;
function test(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      console.log(`  PASS  ${name}`);
      passed++;
    })
    .catch((e: any) => {
      console.error(`  FAIL  ${name}: ${e.message}`);
      failed++;
    });
}

(async () => {
  console.log("Retry unit tests\n");

  await test("backoff increases with attempt", () => {
    const d1 = backoffDelay(1, 100, 10000);
    const d3 = backoffDelay(3, 100, 10000);
    assert.ok(d1 >= 80 && d1 <= 140);
    assert.ok(d3 >= d1);
  });

  await test("withRetry succeeds after transient failures", async () => {
    let n = 0;
    const result = await withRetry(async () => {
      n++;
      if (n < 3) throw new Error("transient");
      return "ok";
    }, { attempts: 4 });
    assert.strictEqual(result, "ok");
    assert.strictEqual(n, 3);
  });

  await test("withRetry does not retry permanent errors", async () => {
    let n = 0;
    try {
      await withRetry(
        async () => {
          n++;
          const e: any = new Error("bad");
          e.status = 400;
          throw e;
        },
        {
          attempts: 4,
          shouldRetry: (err) => {
            const s = (err as any)?.status;
            return !(typeof s === "number" && s < 500);
          },
        }
      );
      assert.fail("should have thrown");
    } catch {
      assert.strictEqual(n, 1);
    }
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
