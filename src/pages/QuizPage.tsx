import React, { useEffect, useState } from 'react'
import { loadJSON, loadJSONL } from '../utils/loaders'
import { buildDynamicMCQ } from '../utils/mcq'
import type { MasterRow, ConfusionSets, QuizItem } from '../types'
import { FourChoiceQuiz } from '../components/FourChoiceQuiz'

export default function QuizPage() {
    const [master, setMaster] = useState<MasterRow[]>([])
    const [items, setItems] = useState<QuizItem[]>([])
    const [level, setLevel] = useState<1 | 2 | 3 | 4>(1)

    useEffect(() => {
        (async () => {
            const m = await loadJSONL<MasterRow>('/data/ek_v2_master.jsonl')
            // 혼동세트 JSON은 현재 코드에 직접 쓰진 않지만, 필요 시 로직 강화에 활용 가능
            // const conf = await loadJSON<ConfusionSets>('/data/ek_v2_confusion_sets.json')
            setMaster(m)
            setItems(buildDynamicMCQ(m, 20, 1)) // 기본 L1에서 20문제(양방향)
        })().catch(console.error)
    }, [])

    useEffect(() => {
        if (!master.length) return
        setItems(buildDynamicMCQ(master, 20, level))
    }, [level, master])

    return (
        <div className="mx-auto max-w-3xl p-4">
            <div className="mb-4 flex items-center gap-2">
                <label className="text-sm text-gray-600">Level</label>
                <select
                    className="rounded-md border px-2 py-1"
                    value={level}
                    onChange={(e) => setLevel(Number(e.target.value) as 1 | 2 | 3 | 4)}
                >
                    <option value={1}>L1</option>
                    <option value={2}>L2</option>
                    <option value={3}>L3</option>
                    <option value={4}>L4</option>
                </select>
            </div>

            {items.length ? (
                <FourChoiceQuiz items={items} />
            ) : (
                <div className="rounded-xl border bg-white p-4 text-gray-600">로딩 중…</div>
            )}
        </div>
    )
}
