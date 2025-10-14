import React, { useEffect, useMemo, useRef, useState } from "react"
import { motion } from "framer-motion"
import { Volume2, Mic, MicOff, Star } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

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
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
        L1: "default",
        L2: "secondary",
        L3: "destructive",
        L4: "outline",
    }
    return <Badge variant={variants[tag]}>{tag}</Badge>
}

const ChoiceButton = ({ text, index, selectedIdx, correctIdx, onSelect }: any) => {
    const isSelected = selectedIdx === index
    const isCorrect = selectedIdx !== null && index === correctIdx
    const isWrong = selectedIdx !== null && isSelected && index !== correctIdx

    const getVariant = () => {
        if (isCorrect) return "default"
        if (isWrong) return "destructive"
        if (isSelected) return "secondary"
        return "outline"
    }

    return (
        <motion.button
            whileTap={{ scale: 0.95 }}
            className={cn(buttonVariants({ variant: getVariant(), className: "w-full h-auto p-4 text-lg font-semibold justify-start" }))}
            onClick={() => onSelect(index)}
        >
            <span className="mr-2 text-xl">{["1번", "2번", "3번", "4번"][index]}</span>
            {text}
        </motion.button>
    )
}

const TTSButton = ({ text, lang, label }: any) => {
    const { speak } = useSpeech()
    return (
        <Button variant="outline" size="sm" onClick={() => speak(text, lang)}>
            <Volume2 className="w-4 h-4 mr-2" /> {label}
        </Button>
    )
}

const STTBar = ({ expectedLang, onHeard }: any) => {
    const { supported, listening, transcript, start, stop } = useSTT({ lang: expectedLang })
    useEffect(() => {
        onHeard(transcript)
    }, [transcript])

    return (
        <div className="flex items-center gap-3">
            {!supported && <span className="text-sm text-muted-foreground">🎤 Your browser does not support speech recognition.</span>}
            {supported && (
                <Button
                    variant={listening ? "destructive" : "outline"}
                    size="sm"
                    onClick={() => (listening ? stop() : start(expectedLang))}
                >
                    {listening ? <MicOff className="w-4 h-4 mr-2" /> : <Mic className="w-4 h-4 mr-2" />}
                    {listening ? "Stop" : "Speak"}
                </Button>
            )}
            <span className="text-sm text-muted-foreground">{transcript}</span>
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
        <div className="w-full max-w-4xl mx-auto">
            <div className="flex justify-between mb-6 items-center">
                <LevelBadge tag={item.level_tag} />
                <div className="flex items-center gap-2 text-yellow-400 font-bold">
                    <Star className="w-5 h-5 fill-yellow-400 stroke-yellow-600" /> {score}
                </div>
            </div>

            <motion.div
                key={item.qid}
                className="mb-6 text-4xl font-bold text-center"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                {item.prompt}
            </motion.div>

            <div className="flex justify-center gap-3 mb-6">
                <TTSButton text={item.tts_text_prompt} lang={item.tts_lang_prompt} label="Prompt" />
                <TTSButton text={correctText} lang={item.tts_lang_answer} label="Answer" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {choices.map((c, i) => (
                    <ChoiceButton key={i} text={c} index={i} selectedIdx={selected} correctIdx={item.correct_index} onSelect={onSelect} />
                ))}
            </div>

            <div className="flex justify-between items-center mb-6">
                <STTBar expectedLang={expectedLangForSTT} onHeard={setHeard} />
                <Button onClick={next}>
                    Next ▶
                </Button>
            </div>

            {selected != null && (
                <motion.div
                    className="rounded-lg border bg-card text-card-foreground p-4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="font-bold mb-2 text-primary">Feedback 🎉</div>
                    <div>Answer: <span className="font-mono text-primary">{correctText}</span></div>
                    <div>You said: <span className="font-mono text-blue-400">{heard || "(not recorded)"}</span></div>
                </motion.div>
            )}
        </div>
    )
}