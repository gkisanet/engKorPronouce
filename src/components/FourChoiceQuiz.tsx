import React, { useEffect, useMemo, useRef, useState } from "react"
import { motion } from "framer-motion"
import { Volume2, Mic, MicOff, Star } from "lucide-react"

export type QuizItem = {
    qid: string
    level: number
    level_tag: "L1" | "L2" | "L3" | "L4"
    direction: "EN->KO" | "KO->EN"
    prompt: string
    choiceA: string
    choiceB: string
    choiceC: string
    choiceD: string
    correct_index: 0 | 1 | 2 | 3
    tts_lang_prompt: string
    tts_text_prompt: string
    tts_lang_answer: string
    tts_text_answer: string
    audio_prompt?: string
    audio_answer?: string
    type: string
}

const useSpeech = () => {
    const synth = useMemo(() => (typeof window !== "undefined" ? window.speechSynthesis : undefined), [])
    const utterRef = useRef<SpeechSynthesisUtterance | null>(null)

    const speak = (text: string, lang = "en-US", rate = 0.9) => {
        if (!synth) return
        synth.cancel()
        const u = new SpeechSynthesisUtterance(text)
        u.lang = lang
        u.rate = rate
        utterRef.current = u
        synth.speak(u)
    }
    return { speak }
}

const useSTT = (opts?: { lang?: string }) => {
    const [supported, setSupported] = useState(false)
    const [listening, setListening] = useState(false)
    const [transcript, setTranscript] = useState("")
    const recRef = useRef<any>(null)

    useEffect(() => {
        const w: any = window
        const Rec = w.webkitSpeechRecognition || w.SpeechRecognition
        if (Rec) setSupported(true)
    }, [])

    const start = (lang = "en-US") => {
        const w: any = window
        const Rec = w.webkitSpeechRecognition || w.SpeechRecognition
        if (!Rec) return
        const rec = new Rec()
        rec.lang = lang
        rec.onresult = (e: any) => {
            const t = Array.from(e.results).map((r: any) => r[0]?.transcript).join(" ")
            setTranscript(t)
        }
        rec.onend = () => setListening(false)
        recRef.current = rec
        setTranscript("")
        setListening(true)
        rec.start()
    }

    const stop = () => {
        if (recRef.current) {
            recRef.current.stop()
            setListening(false)
        }
    }

    return { supported, listening, transcript, start, stop }
}

const LevelBadge = ({ tag }: { tag: string }) => {
    const colors: Record<string, string> = {
        L1: "bg-green-200 text-green-800",
        L2: "bg-sky-200 text-sky-800",
        L3: "bg-purple-200 text-purple-800",
        L4: "bg-orange-200 text-orange-800",
    }
    return <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors[tag]}`}>{tag}</span>
}

const ChoiceButton = ({ text, index, selectedIdx, correctIdx, onSelect }: any) => {
    const isSelected = selectedIdx === index
    const isCorrect = selectedIdx !== null && index === correctIdx
    const isWrong = selectedIdx !== null && isSelected && index !== correctIdx

    return (
        <motion.button
            whileTap={{ scale: 0.95 }}
            className={`w-full rounded-2xl border-4 p-4 text-lg font-semibold shadow transition-all duration-300 ${isCorrect
                    ? "bg-green-300 border-green-400 text-green-900"
                    : isWrong
                        ? "bg-red-300 border-red-400 text-red-900"
                        : "bg-yellow-100 border-yellow-200 hover:bg-yellow-200"
                }`}
            onClick={() => onSelect(index)}
        >
            <span className="mr-2 text-xl">{"ABCD"[index]}</span>
            {text}
        </motion.button>
    )
}

const TTSButton = ({ text, lang, label }: any) => {
    const { speak } = useSpeech()
    return (
        <button
            className="flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-800 hover:bg-blue-200"
            onClick={() => speak(text, lang)}
        >
            <Volume2 className="w-4 h-4" /> {label}
        </button>
    )
}

const STTBar = ({ expectedLang, onHeard }: any) => {
    const { supported, listening, transcript, start, stop } = useSTT({ lang: expectedLang })
    useEffect(() => {
        onHeard(transcript)
    }, [transcript])

    return (
        <div className="flex items-center gap-3">
            {!supported && <span className="text-sm text-gray-400">🎤 브라우저가 음성인식을 지원하지 않아요</span>}
            {supported && (
                <button
                    className={`flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-semibold transition-all ${listening ? "bg-red-200 text-red-800" : "bg-pink-100 text-pink-800 hover:bg-pink-200"
                        }`}
                    onClick={() => (listening ? stop() : start(expectedLang))}
                >
                    {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />} {listening ? "멈춰요" : "말해요"}
                </button>
            )}
            <span className="text-sm text-gray-600">{transcript}</span>
        </div>
    )
}

export const FourChoiceQuiz = ({ items }: { items: QuizItem[] }) => {
    const [idx, setIdx] = useState(0)
    const [selected, setSelected] = useState<number | null>(null)
    const [heard, setHeard] = useState("")
    const [score, setScore] = useState(0)

    const item = items[idx]
    const choices = [item.choiceA, item.choiceB, item.choiceC, item.choiceD]
    const correctText = choices[item.correct_index]
    const expectedLangForSTT = item.direction === "EN->KO" ? "ko-KR" : "en-US"

    const next = () => {
        setSelected(null)
        setHeard("")
        setIdx((p) => (p + 1) % items.length)
    }

    const onSelect = (i: number) => {
        if (selected != null) return
        setSelected(i)
        if (i === item.correct_index) setScore((s) => s + 1)
    }

    return (
        <div className="mx-auto max-w-xl bg-gradient-to-br from-yellow-50 to-pink-50 p-6 rounded-3xl shadow-lg border-2 border-yellow-200">
            <div className="flex justify-between mb-4 items-center">
                <LevelBadge tag={item.level_tag} />
                <div className="flex items-center gap-2 text-pink-600 font-bold">
                    <Star className="w-5 h-5 fill-yellow-400 stroke-yellow-500" /> {score}
                </div>
            </div>

            <motion.div className="mb-4 text-3xl font-bold text-center text-purple-800" initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
                {item.prompt}
            </motion.div>

            <div className="flex justify-center gap-3 mb-4">
                <TTSButton text={item.tts_text_prompt} lang={item.tts_lang_prompt} label="문제 듣기" />
                <TTSButton text={correctText} lang={item.tts_lang_answer} label="정답 듣기" />
            </div>

            <div className="grid grid-cols-1 gap-3 mb-4">
                {choices.map((c, i) => (
                    <ChoiceButton key={i} text={c} index={i} selectedIdx={selected} correctIdx={item.correct_index} onSelect={onSelect} />
                ))}
            </div>

            <div className="flex justify-between items-center mb-4">
                <STTBar expectedLang={expectedLangForSTT} onHeard={setHeard} />
                <button
                    className="rounded-full bg-purple-200 text-purple-800 font-semibold px-4 py-2 hover:bg-purple-300 transition"
                    onClick={next}
                >
                    다음 ▶
                </button>
            </div>

            {selected != null && (
                <motion.div
                    className="rounded-2xl border-2 border-dashed border-yellow-300 bg-white p-4 text-sm text-gray-700"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="font-bold mb-1 text-pink-700">피드백 🎉</div>
                    <div>정답: <span className="font-mono text-green-700">{correctText}</span></div>
                    <div>내가 말한 것: <span className="font-mono text-blue-700">{heard || "(미입력)"}</span></div>
                </motion.div>
            )}
        </div>
    )
}
