// Accepts either a plain 11-char YouTube ID or a full YouTube / youtu.be URL.
// Returns the 11-char ID or null if not parsable.
export function extractYouTubeId(input?: string | null): string | null {
  if (!input) return null;

  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;

  try {
    const u = new URL(input);
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v');
    if (u.hostname === 'youtu.be') return u.pathname.slice(1) || null;
  } catch {
    // not a URL; ignore
  }
  return null;
}
