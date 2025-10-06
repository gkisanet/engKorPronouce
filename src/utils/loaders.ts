// src/utils/loaders.ts
export async function loadJSON<T = any>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}`);
  return res.json() as Promise<T>;
}

export async function loadJSONL<T = any>(url: string): Promise<T[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}`);
  const text = await res.text();

  // JSON Lines -> Array<object>
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('//')); // 빈 줄/주석 라인 제거(있다면)

  return lines.map((l) => JSON.parse(l));
}
