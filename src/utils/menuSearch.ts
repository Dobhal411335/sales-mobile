/** Lower score = better match. `null` means no match. */

function levenshtein(a: string, b: string): number {
  if (a === b) {
    return 0;
  }
  if (!a.length) {
    return b.length;
  }
  if (!b.length) {
    return a.length;
  }

  const rows = a.length + 1;
  const cols = b.length + 1;
  const prev = new Array<number>(cols);
  const curr = new Array<number>(cols);

  for (let j = 0; j < cols; j += 1) {
    prev[j] = j;
  }

  for (let i = 1; i < rows; i += 1) {
    curr[0] = i;
    const ca = a.charCodeAt(i - 1);
    for (let j = 1; j < cols; j += 1) {
      const cost = ca === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + cost,
      );
    }
    for (let j = 0; j < cols; j += 1) {
      prev[j] = curr[j];
    }
  }

  return prev[b.length];
}

function allowedDistance(queryLength: number): number {
  if (queryLength <= 3) {
    return 1;
  }
  if (queryLength <= 6) {
    return 2;
  }
  return 3;
}

function scoreToken(token: string, query: string): number | null {
  if (!token || !query) {
    return null;
  }
  if (token === query) {
    return 0;
  }
  if (token.startsWith(query)) {
    return 1;
  }
  if (token.includes(query)) {
    return 2;
  }

  const maxAllowed = allowedDistance(query.length);
  // Prefer comparing query to token prefixes of similar length (typos mid-word).
  const window = Math.min(token.length, query.length + maxAllowed);
  const candidates = [token];
  if (window < token.length) {
    candidates.push(token.slice(0, window));
  }

  let best: number | null = null;
  for (const candidate of candidates) {
    const dist = levenshtein(candidate, query);
    if (dist > maxAllowed) {
      continue;
    }
    const maxLen = Math.max(candidate.length, query.length);
    if (dist / maxLen > 0.45) {
      continue;
    }
    const score = 5 + dist;
    if (best === null || score < best) {
      best = score;
    }
  }
  return best;
}

function scoreText(text: string, query: string): number | null {
  const normalized = text.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const whole = scoreToken(normalized, query);
  let best = whole;

  for (const word of normalized.split(/[^a-z0-9]+/).filter(Boolean)) {
    const wordScore = scoreToken(word, query);
    if (wordScore === null) {
      continue;
    }
    if (best === null || wordScore < best) {
      best = wordScore;
    }
  }

  return best;
}

export function scoreMenuSearch(
  fields: Array<string | undefined | null>,
  query: string,
): number | null {
  const q = query.trim().toLowerCase();
  if (!q) {
    return 0;
  }

  let best: number | null = null;
  for (const field of fields) {
    if (!field) {
      continue;
    }
    const score = scoreText(field, q);
    if (score === null) {
      continue;
    }
    if (best === null || score < best) {
      best = score;
    }
  }
  return best;
}
