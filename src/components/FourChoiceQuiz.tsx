import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * Pronunciation Quiz Starter (EN<->KO)
 * - 4 difficulty levels (L1~L4)
 * - 4-choice MCQ
 * - TTS (Web Speech API)
 * - STT check (webkitSpeechRecognition)
 * - Tailwind styles (optional)
 *
 * Pass `items` via props or wire up a fetch to your JSONL/CSV parser.
 * A record in `items` should include at least:
 * {
 *   qid: string,
 *   level: number,
 *   level_tag: "L1"|"L2"|"L3"|"L4",
 *   direction: "EN->KO"|"KO->EN",
 *   prompt: string,
 *   choiceA: string, choiceB: string, choiceC: string, choiceD: string,
 *   correct_index: 0|1|2|3,
 *   tts_lang_prompt: "en-US"|"ko-KR",
 *   tts_text_prompt: string,
 *   tts_lang_answer: "en-US"|"ko-KR",
 *   tts_text_answer: string,
 *   audio_prompt: string, // mp3 file name if you have pre-rendered audio
 *   audio_answer: string  // mp3 file name if you have pre-rendered audio
 * }
 */

export type QuizItem = {
    qid: string;
    level: number;
    level_tag: "L1" | "L2" | "L3" | "L4";
    direction: "EN->KO" | "KO->EN";
    prompt: string;
    choiceA: string;
    choiceB: string;
    choiceC: string;
    choiceD: string;
    correct_index: 0 | 1 | 2 | 3;
    tts_lang_prompt: string; // e.g. en-US, ko-KR
    tts_text_prompt: string;
    tts_lang_answer: string;
    tts_text_answer: string;
    audio_prompt?: string; // optional local audio file
    audio_answer?: string; // optional local audio file
    type: string;
};

const useSpeech = () => {
    const synth = useMemo(() => (typeof window !== "undefined" ? window.speechSynthesis : undefined), []);
    const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

    const speak = (text: string, lang = "en-US", rate = 0.9) => {
        if (!synth) return;
        if (utterRef.current) {
            try { synth.cancel(); } catch { }
        }
        const u = new SpeechSynthesisUtterance(text);
        u.lang = lang;
        u.rate = rate; // kid-friendly slow-ish
        utterRef.current = u;
        synth.speak(u);
    };

    const cancel = () => {
        if (!synth) return;
        try { synth.cancel(); } catch { }
    };

    return { speak, cancel };
};

const useSTT = (opts?: { lang?: string; interimResults?: boolean }) => {
    const [supported, setSupported] = useState(false);
    const [listening, setListening] = useState(false);
    const [transcript, setTranscript] = useState("");
    const recRef = useRef<any>(null);

    useEffect(() => {
        const w: any = typeof window !== "undefined" ? window : {};
        const Rec = w.webkitSpeechRecognition || w.SpeechRecognition;
        if (Rec) setSupported(true);
    }, []);

    const start = (lang = "en-US") => {
        const w: any = typeof window !== "undefined" ? window : {};
        const Rec = w.webkitSpeechRecognition || w.SpeechRecognition;
        if (!Rec) return;
        const rec = new Rec();
        rec.lang = lang;
        rec.interimResults = opts?.interimResults ?? false;
        rec.onresult = (e: any) => {
            const t = Array.from(e.results)
                .map((r: any) => r[0]?.transcript)
                .filter(Boolean)
                .join(" ");
            setTranscript(t);
        };
        rec.onend = () => setListening(false);
        rec.onerror = () => setListening(false);
        recRef.current = rec;
        setTranscript("");
        setListening(true);
        rec.start();
    };

    const stop = () => {
        if (recRef.current) {
            try { recRef.current.stop(); } catch { }
            setListening(false);
        }
    };

    return { supported, listening, transcript, start, stop };
};

const Tag: React.FC<{ label: string }> = ({ label }) => (
    <span className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{label}</span>
);

const ChoiceButton: React.FC<{
    text: string;
    index: number;
    selectedIdx?: number | null;
    correctIdx: number;
    onSelect: (i: number) => void;
}> = ({ text, index, selectedIdx, correctIdx, onSelect }) => {
    const isSelected = selectedIdx === index;
    const isCorrect = selectedIdx != null && index === correctIdx;
    const isWrong = selectedIdx != null && isSelected && index !== correctIdx;
    let cls = "w-full rounded-2xl border p-3 text-left transition shadow-sm";
    if (isCorrect) cls += " border-green-500 bg-green-50";
    else if (isWrong) cls += " border-red-500 bg-red-50";
    else cls += " hover:bg-gray-50";
    return (
        <button className={cls} onClick={() => onSelect(index)}>
            <div className="flex items-center gap-3">
                <span className="font-semibold">{"ABCD"[index]}</span>
                <span className="text-base">{text}</span>
            </div>
        </button>
    );
};

const TTSButton: React.FC<{ text: string; lang: string; label?: string }> = ({ text, lang, label }) => {
    const { speak } = useSpeech();
    return (
        <button className="rounded-xl border px-3 py-1 text-sm shadow-sm hover:bg-gray-50" onClick={() => speak(text, lang)}>
            🔊 {label ?? "Hear"}
        </button>
    );
};

const STTBar: React.FC<{ expectedLang: string; onHeard: (t: string) => void }> = ({ expectedLang, onHeard }) => {
    const { supported, listening, transcript, start, stop } = useSTT({ lang: expectedLang });
    useEffect(() => { onHeard(transcript); }, [transcript]);
    return (
        <div className="flex items-center gap-2">
            {!supported && <span className="text-sm text-gray-500">🎤 STT 미지원(크롬 권장)</span>}
            {supported && (
                <button
                    className={`rounded-xl px-3 py-1 text-sm shadow-sm border ${listening ? "bg-red-50" : "hover:bg-gray-50"}`}
                    onClick={() => (listening ? stop() : start(expectedLang))}
                >
                    {listening ? "■ Stop" : "🎤 Speak"}
                </button>
            )}
            <span className="text-sm text-gray-600">{transcript || ""}</span>
        </div>
    );
};

export const FourChoiceQuiz: React.FC<{ items: QuizItem[] }> = ({ items }) => {
    const [idx, setIdx] = useState(0);
    const [selected, setSelected] = useState<number | null>(null);
    const [heard, setHeard] = useState("");
    const [score, setScore] = useState(0);

    const item = items[idx];
    const choices = [item.choiceA, item.choiceB, item.choiceC, item.choiceD];

    const correctText = choices[item.correct_index];
    const expectedLangForSTT = item.direction === "EN->KO" ? "ko-KR" : "en-US";

    const next = () => {
        setSelected(null);
        setHeard("");
        setIdx((p) => (p + 1) % items.length);
    };

    const onSelect = (i: number) => {
        if (selected != null) return; // lock after first choice
        setSelected(i);
        if (i === item.correct_index) setScore((s) => s + 1);
    };

    const levelColor = useMemo(() => ({
        L1: "bg-emerald-50 border-emerald-200",
        L2: "bg-sky-50 border-sky-200",
        L3: "bg-violet-50 border-violet-200",
        L4: "bg-amber-50 border-amber-200",
    } as Record<QuizItem["level_tag"], string>), []);

    return (
        <div className="mx-auto max-w-2xl p-4">
            <div className={`mb-4 rounded-2xl border p-3 ${levelColor[item.level_tag]}`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Tag label={item.level_tag} />
                        <Tag label={item.direction} />
                        <Tag label={item.type} />
                    </div>
                    <div className="text-sm text-gray-600">Score: {score}</div>
                </div>
            </div>

            <div className="mb-3 flex items-center justify-between">
                <div className="text-2xl font-bold">{item.prompt}</div>
                <div className="flex gap-2">
                    <TTSButton text={item.tts_text_prompt} lang={item.tts_lang_prompt} label="Prompt" />
                    <TTSButton text={correctText} lang={item.tts_lang_answer} label="Answer" />
                </div>
            </div>

            <div className="mb-4">
                <div className="grid grid-cols-1 gap-3">
                    {choices.map((c, i) => (
                        <ChoiceButton
                            key={i}
                            text={c}
                            index={i}
                            selectedIdx={selected}
                            correctIdx={item.correct_index}
                            onSelect={onSelect}
                        />
                    ))}
                </div>
            </div>

            <div className="mb-6 flex items-center justify-between">
                <STTBar expectedLang={expectedLangForSTT} onHeard={setHeard} />
                <button className="rounded-xl border px-3 py-1 text-sm shadow-sm hover:bg-gray-50" onClick={next}>
                    Next ▶
                </button>
            </div>

            {selected != null && (
                <div className="rounded-2xl border bg-white p-3 text-sm text-gray-700">
                    <div className="mb-1 font-semibold">Feedback</div>
                    <div>정답: <span className="font-mono">{correctText}</span> ({"ABCD"[item.correct_index]})</div>
                    <div>내가 말한 것: <span className="font-mono">{heard || "(미입력)"}</span></div>
                    <div className="mt-1 text-gray-500">※ 간단 비교: 정답 문자열이 내 발화에 포함되는지 여부만 체크합니다. 필요하면 편집 거리(Levenshtein) 등으로 고도화하세요.</div>
                </div>
            )}
        </div>
    );
};

// // Demo wrapper: inject your dataset via props or replace with fetch logic
// export default function App() {
//     const [items, setItems] = useState<QuizItem[]>([]);
//     const [all, setAll] = useState<QuizItem[]>([]);

//     // Load master + build dynamic MCQs on the fly
//     useEffect(() => {
//         // In production, fetch these from your server or /public files
//         // Here we use a tiny demo pool; see dataset files for full content
//         const master: any[] = [
//             { id: 1, level: 1, level_tag: 'L1', type: 'cv', en: 'ka', ko: '카', conf_groups: ['CG_K_G_C'], tts_en_text: 'ka', tts_ko_text: '카' },
//             { id: 2, level: 1, level_tag: 'L1', type: 'cv', en: 'ga', ko: '가', conf_groups: ['CG_K_G_C'], tts_en_text: 'ga', tts_ko_text: '가' },
//             { id: 3, level: 1, level_tag: 'L1', type: 'cv', en: 'sa', ko: '사', conf_groups: ['CG_S_Z'], tts_en_text: 'sa', tts_ko_text: '사' },
//             { id: 4, level: 3, level_tag: 'L3', type: 'digraph_word', en: 'ship', ko: '십', conf_groups: ['CG_S_SH_Z'], tts_en_text: 'ship', tts_ko_text: '십' },
//             { id: 5, level: 3, level_tag: 'L3', type: 'digraph_word', en: 'chip', ko: '칩', conf_groups: ['CG_CH_J'], tts_en_text: 'chip', tts_ko_text: '칩' },
//             { id: 6, level: 3, level_tag: 'L3', type: 'digraph_word', en: 'this', ko: '디스', conf_groups: ['CG_TH_VD'], tts_en_text: 'this', tts_ko_text: '디스' },
//             { id: 7, level: 3, level_tag: 'L3', type: 'digraph_word', en: 'thin', ko: '씬', conf_groups: ['CG_TH_VL'], tts_en_text: 'thin', tts_ko_text: '씬' },
//         ];

//         // Save raw master for future filtering
//         setAll(master as any);

//         // Build a small dynamic MCQ set now
//         const sample = buildDynamicMCQ(master as any, 10);
//         setItems(sample);
//     }, []);

//     return (
//         <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
//             <div className="mx-auto max-w-3xl py-6">
//                 <h1 className="mb-2 text-3xl font-bold">EN↔KO Pronunciation Quiz</h1>
//                 <p className="mb-2 text-gray-600">L1~L4, 4지선다(랜덤 오답 생성), TTS/STT</p>
//                 <p className="mb-6 text-gray-600">※ 실제 서비스에서는 ek_v2_master.jsonl & ek_v2_confusion_sets.json을 로드하여 아래처럼 동적 출제를 구성하세요.</p>
//                 {items.length > 0 ? (
//                     <FourChoiceQuiz items={items} />
//                 ) : (
//                     <div className="rounded-xl border bg-white p-4 text-gray-600">데이터 로딩 중…</div>
//                 )}
//             </div>
//         </div>
//     );
// }

// // ---- Dynamic MCQ generator (runtime) ----
// function buildDynamicMCQ(master: any[], count = 20): QuizItem[] {
//     const out: QuizItem[] = [];

//     const pickNeighbors = (row: any, direction: 'EN->KO' | 'KO->EN') => {
//         const key = direction === 'EN->KO' ? 'ko' : 'en';
//         const conf = new Set(row.conf_groups || []);
//         const sameLevel = master.filter(r => r.level === row.level && r.id !== row.id);
//         const pool = sameLevel.filter(r => r.type === row.type || r.conf_groups?.some((g: string) => conf.has(g)));
//         const uniq: Record<string, boolean> = { [row[key]]: true };
//         const res: any[] = [];
//         shuffle(pool);
//         for (const r of pool) {
//             const val = r[key];
//             if (!uniq[val]) { uniq[val] = true; res.push(r); }
//             if (res.length >= 3) break;
//         }
//         if (res.length < 3) {
//             const fb = sameLevel.filter(r => !uniq[r[key]]);
//             shuffle(fb);
//             res.push(...fb.slice(0, 3 - res.length));
//         }
//         return res;
//     };

//     const base = [...master];
//     shuffle(base);
//     for (const row of base.slice(0, count)) {
//         for (const direction of ['EN->KO', 'KO->EN'] as const) {
//             const prompt = direction === 'EN->KO' ? row.en : row.ko;
//             const answer = direction === 'EN->KO' ? row.ko : row.en;
//             const neigh = pickNeighbors(row, direction);
//             const choicePool = [answer, ...neigh.map(r => direction === 'EN->KO' ? r.ko : r.en)];
//             shuffle(choicePool);
//             const correct_index = choicePool.indexOf(answer) as 0 | 1 | 2 | 3;
//             out.push({
//                 qid: `${row.id}_${direction.replace('>', '_')}`,
//                 level: row.level,
//                 level_tag: row.level_tag,
//                 direction,
//                 prompt,
//                 choiceA: choicePool[0], choiceB: choicePool[1], choiceC: choicePool[2], choiceD: choicePool[3],
//                 correct_index,
//                 tts_lang_prompt: direction === 'EN->KO' ? 'en-US' : 'ko-KR',
//                 tts_text_prompt: direction === 'EN->KO' ? row.en : row.ko,
//                 tts_lang_answer: direction === 'EN->KO' ? 'ko-KR' : 'en-US',
//                 tts_text_answer: direction === 'EN->KO' ? row.ko : row.en,
//                 audio_prompt: '',
//                 audio_answer: '',
//                 type: row.type,
//             });
//         }
//     }
//     return out;
// }

// function shuffle<T>(arr: T[]): T[] { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }
