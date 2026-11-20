export function detectTimestampsInText(transcript: string): boolean {
  if (!transcript.trim()) return false;
  // Match patterns like [10:02], 10:02, 10:02:15, 09.30 น., 2026-11-18 10:02
  const patterns = [
    /\[\d{1,2}[:.]\d{2}(?:[:.]\d{2})?\]/,
    /(?:^|\s)\d{1,2}:\d{2}(?::\d{2})?(?:\s*(?:AM|PM|น\.))?(?=\s|$|\]|\))/m,
    /\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}/,
  ];
  return patterns.some((re) => re.test(transcript));
}
