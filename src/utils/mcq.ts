import type { MasterRow, QuizItem } from '../types';

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickNeighbors(
  master: MasterRow[],
  row: MasterRow,
  direction: 'EN->KO' | 'KO->EN',
  k = 3
) {
  const key = direction === 'EN->KO' ? 'ko' : 'en';
  const conf = new Set(row.conf_groups || []);
  const sameLevel = master.filter(
    (r) => r.level === row.level && r.id !== row.id
  );

  const pool = sameLevel.filter(
    (r) => r.type === row.type || r.conf_groups?.some((g) => conf.has(g))
  );

  const seen = new Set<string>([(row as any)[key]]);
  const out: MasterRow[] = [];
  shuffle(pool);
  for (const r of pool) {
    const val = (r as any)[key];
    if (!seen.has(val)) {
      seen.add(val);
      out.push(r);
      if (out.length >= k) break;
    }
  }
  if (out.length < k) {
    const fb = sameLevel.filter((r) => !seen.has((r as any)[key]));
    shuffle(fb);
    out.push(...fb.slice(0, k - out.length));
  }
  if (out.length < k) {
    const fb = master.filter(
      (r) => r.id !== row.id && !seen.has((r as any)[key])
    );
    shuffle(fb);
    out.push(...fb.slice(0, k - out.length));
  }
  return out.slice(0, k);
}

export function buildDynamicMCQ(
  master: MasterRow[],
  count = 20,
  levelFilter?: 1 | 2 | 3 | 4
): QuizItem[] {
  const base = levelFilter
    ? master.filter((m) => m.level === levelFilter)
    : master.slice();
  shuffle(base);

  const items: QuizItem[] = [];
  for (const row of base.slice(0, count)) {
    for (const direction of ['EN->KO', 'KO->EN'] as const) {
      const prompt = direction === 'EN->KO' ? row.en : row.ko;
      const answer = direction === 'EN->KO' ? row.ko : row.en;
      const neigh = pickNeighbors(master, row, direction, 3);
      const choices = [
        answer,
        ...neigh.map((r) => (direction === 'EN->KO' ? r.ko : r.en)),
      ];
      shuffle(choices);
      const correct_index = choices.indexOf(answer) as 0 | 1 | 2 | 3;

      items.push({
        qid: `${row.id}_${direction.replace('>', '_')}`,
        level: row.level,
        level_tag: row.level_tag,
        type: row.type,
        direction,
        prompt,
        choiceA: choices[0],
        choiceB: choices[1],
        choiceC: choices[2],
        choiceD: choices[3],
        correct_index,
        tts_lang_prompt:
          direction === 'EN->KO' ? row.tts_en_lang : row.tts_ko_lang,
        tts_text_prompt:
          direction === 'EN->KO' ? row.tts_en_text : row.tts_ko_text,
        tts_lang_answer:
          direction === 'EN->KO' ? row.tts_ko_lang : row.tts_en_lang,
        tts_text_answer:
          direction === 'EN->KO' ? row.tts_ko_text : row.tts_en_text,
        audio_prompt:
          direction === 'EN->KO' ? row.audio_en_prompt : row.audio_ko_prompt,
        audio_answer:
          direction === 'EN->KO' ? row.audio_ko_answer : row.audio_en_answer,
      });
    }
  }
  return items;
}
