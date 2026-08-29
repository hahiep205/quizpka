import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import type { Question } from "@/features/quiz/model/quiz.types"
import { classifyToeicQuestion } from "@/features/quiz/lib/toeicCategories"

function loadRealQuestions(): Question[] {
  const base = resolve("public/data/toeic-test/Test-01")
  const dirs = ["Part1", "Part2", "Part3", "Part4", "Part5", "Part6", "Part7"]
  const files: Record<string, string> = { Part1: "test01-part1.json", Part2: "part2.json", Part3: "part3.json", Part4: "part4.json", Part5: "part5.json", Part6: "part6.json", Part7: "part7.json" }
  const out: Question[] = []
  for (const dir of dirs) {
    const raw = JSON.parse(readFileSync(resolve(base, dir, files[dir]), "utf8"))
    const items = dir === "Part7" ? raw.groups.flatMap((g: any) => g.questions) : ["Part3", "Part4", "Part6"].includes(dir) ? raw.flatMap((g: any) => g.questions) : raw
    items.forEach((item: any) => {
      const correct = item.correct_answer ?? item.answer
      const opts = Object.keys(item.options ?? {}).map((k) => item.options[k])
      const correctIndex = opts.findIndex((o: string) => o === (item.options?.[correct]))
      out.push({ id: `${dir}-${item.id ?? String(out.length + 1)}`, prompt: item.prompt ?? item.question ?? "", options: opts, correctIndex: correctIndex >= 0 ? correctIndex : 0, partTitle: `Listening - Part ${dir.replace("Part", "")}`, section: ["Part5", "Part6", "Part7"].includes(dir) ? "Reading" : "Listening", questionType: item.type, grammarPoint: item.grammar_point } as Question)
    })
  }
  return out
}

describe("real Test-01 classifier smoke test", () => {
  const qs = loadRealQuestions()
  it("has 200 questions total", () => { expect(qs).toHaveLength(200) })
  it("classifies every question without unknown/fallback skew", () => {
    const counts = new Map<string, number>()
    for (const q of qs) {
      const key = classifyToeicQuestion(q)
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    expect(Array.from(counts.entries()).reduce((s, [, n]) => s + n, 0)).toBe(200)
    // eslint-disable-next-line no-console
    console.log("DISTRIBUTION:", JSON.stringify(Object.fromEntries(counts.entries())))
  })
})
