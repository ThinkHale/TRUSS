/**
 * Lets Node run the app's TypeScript directly for scripts: resolves the `@/`
 * path alias and extensionless relative imports the way the bundler does.
 * Node strips the types itself. Registered by scripts/ts-register.mjs.
 */

export async function resolve(specifier, context, next) {
  if (specifier.startsWith('@/')) {
    specifier = new URL(`../src/${specifier.slice(2)}`, import.meta.url).href;
  }
  try {
    return await next(specifier, context);
  } catch (err) {
    const relative = specifier.startsWith('.') || specifier.startsWith('file:');
    if (!relative) throw err;
    for (const suffix of ['.ts', '.tsx', '/index.ts']) {
      try {
        return await next(`${specifier}${suffix}`, context);
      } catch {
        // try the next candidate
      }
    }
    throw err;
  }
}
