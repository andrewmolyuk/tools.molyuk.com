// Vite resolves extensionless relative imports; node's ESM loader does not. This hook
// closes that gap so the suites import the shipped sources directly rather than copies,
// which would be free to drift out of step with them.
export async function resolve(specifier, context, nextResolve) {
  if (/^\.{1,2}\//.test(specifier) && !/\.[a-z]+$/i.test(specifier)) {
    return nextResolve(specifier + '.ts', context)
  }
  return nextResolve(specifier, context)
}
