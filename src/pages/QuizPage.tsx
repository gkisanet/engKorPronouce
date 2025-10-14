import React, { useEffect, useState } from 'react'
import { loadJSONL } from '../utils/loaders'
import { buildDynamicMCQ } from '../utils/mcq'
import type { MasterRow, QuizItem } from '../types'
import { FourChoiceQuiz } from '../components/FourChoiceQuiz'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function QuizPage() {
    const [master, setMaster] = useState<MasterRow[]>([])
    const [items, setItems] = useState<QuizItem[]>([])
    const [level, setLevel] = useState<1 | 2 | 3 | 4>(1)

    useEffect(() => {
        (async () => {
            const m = await loadJSONL<MasterRow>('/data/ek_v2_master.jsonl')
            setMaster(m)
            setItems(buildDynamicMCQ(m, 20, 1)) // 기본 L1에서 20문제(양방향)
        })().catch(console.error)
    }, [])

    useEffect(() => {
        if (!master.length) return
        setItems(buildDynamicMCQ(master, 20, level))
    }, [level, master])

    return (
        <Card className="w-full max-w-3xl">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>English-Korean Pronunciation Quiz</CardTitle>
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Level</label>
                    <Select value={String(level)} onValueChange={(value) => setLevel(Number(value) as 1 | 2 | 3 | 4)}>
                        <SelectTrigger className="w-[80px]">
                            <SelectValue placeholder="Level" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1">L1</SelectItem>
                            <SelectItem value="2">L2</SelectItem>
                            <SelectItem value="3">L3</SelectItem>
                            <SelectItem value="4">L4</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent>
                {items.length ? (
                    <FourChoiceQuiz items={items} />
                ) : (
                    <div className="flex items-center justify-center rounded-xl border bg-lime-300 p-4 text-gray-600">
                        Loading...
                    </div>
                )}
            </CardContent>
        </Card>
    )
}