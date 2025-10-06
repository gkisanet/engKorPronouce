export type MasterRow = {
  id: number;
  level: 1 | 2 | 3 | 4;
  level_tag: 'L1' | 'L2' | 'L3' | 'L4';
  type: 'letter' | 'cv' | 'word' | 'cvc' | 'digraph_word' | 'mixed';
  en: string;
  ko: string;
  primary: string;
  conf_groups: string[];
  tts_en_text: string;
  tts_ko_text: string;
  tts_en_lang: string;
  tts_ko_lang: string;
  audio_en_prompt: string;
  audio_ko_prompt: string;
  audio_en_answer: string;
  audio_ko_answer: string;
  notes?: string;
};

export type QuizItem = {
  qid: string;
  level: MasterRow['level'];
  level_tag: MasterRow['level_tag'];
  type: MasterRow['type'];
  direction: 'EN->KO' | 'KO->EN';
  prompt: string;
  choiceA: string;
  choiceB: string;
  choiceC: string;
  choiceD: string;
  correct_index: 0 | 1 | 2 | 3;
  tts_lang_prompt: string;
  tts_text_prompt: string;
  tts_lang_answer: string;
  tts_text_answer: string;
  audio_prompt?: string;
  audio_answer?: string;
};

export type ConfusionSets = Record<string, string[]>;
