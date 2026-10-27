export function createKeyFactory(prefix: string) {
  // Drafts built on the server reach the client with their keys, so each runtime needs its own namespace to avoid
  // colliding with keys the browser generates for items added later.
  const runtime = Math.random().toString(36).slice(2, 10);
  let seed = 0;
  return () => {
    seed += 1;
    return `${prefix}-${runtime}-${seed}`;
  };
}
