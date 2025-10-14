import type { MasterRow, QuizItem } from '../types';

// Fisher-Yates shuffle is a classic algorithm for shuffling an array in place
// array length 만큼 랜덤하게 섞음
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
// k개의 이웃을 고르는 함수
// 같은 레벨에서 시작해서, 같은 타입이나 혼동그룹이 겹치는 것 우선으로 고르고
// 부족하면 같은 레벨에서 랜덤하게, 그래도 부족하면 전체에서 랜덤하게 고름
// direction에 따라 영어->한국어, 한국어->영어로 구분
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

// buildDynamicMCQ

// Parameters:
//    master: MasterRow[] — full source dataset.
//    count = 20 — how many source rows to pick (not final items).
//    levelFilter?: 1|2|3|4 — optional level restriction.
// base = levelFilter ? master.filter(...) : master.slice() — if filtering by level, create a new filtered array; otherwise clone master so we can shuffle without mutating the original master reference.
// shuffle(base) — randomize base order so you pick a random sample of rows.
// for (const row of base.slice(0, count)) — use the first count rows after shuffle.
// for (const direction of ['EN->KO', 'KO->EN'] as const) — produce two quiz items per row (forward and reverse).
// prompt / answer selection — choose which text appears as the prompt and which is the correct answer depending on direction.
// const neigh = pickNeighbors(master, row, direction, 3) — pick 3 neighbor rows from the whole master set to serve as distractors (implementation not shown).
// choices = [answer, ...neigh.map(...)] — build an array where the first element is the correct answer, then the neighbors transformed to the current answer language.
// shuffle(choices) — randomize choice order.
// correct_index = choices.indexOf(answer) as 0|1|2|3 — compute the index of the correct answer in the shuffled choices.
// push QuizItem — produce a QuizItem with metadata (qid, level, type, tts/audio fields) and four choice fields: choiceA..D.

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
