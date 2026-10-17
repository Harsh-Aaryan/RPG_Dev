export function shortId(len = 8): string {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => (b % 36).toString(36)).join('');
}

export function clientId(): string {
  try {
    let id = localStorage.getItem('reporaid:client');
    if (!id) {
      id = shortId(12);
      localStorage.setItem('reporaid:client', id);
    }
    return id;
  } catch {
    return 'guest';
  }
}
