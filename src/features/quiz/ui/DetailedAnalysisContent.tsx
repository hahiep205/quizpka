import { CheckCircle2, BookOpen, GraduationCap, Lightbulb, Mic, Image as ImageIcon, Award } from "lucide-react"
import { quizCopy } from "@/shared/i18n"

type ParsedSection =
  | { type: "analysis"; lines: Array<{ key: string; ok: boolean; text: string }> }
  | { type: "vocab"; lines: Array<{ phrase: string; meaning: string; paraphrases?: string }> }
  | { type: "grammar"; text: string }
  | { type: "strategy"; steps: string[] }
  | { type: "transcript"; text: string }
  | { type: "imageDesc"; text: string }
  | { type: "answer"; text: string }
  | { type: "generic"; title: string; text: string }

function parseDetailed(content: string): ParsedSection[] {
  const sections: ParsedSection[] = []
  const rawSections = content.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean)
  for (const sec of rawSections) {
    if (sec.startsWith("Phân tích lựa chọn:")) {
      const body = sec.replace(/^Phân tích lựa chọn:\s*/, "")
      const lines = body.split("\n").map((l) => l.trim()).filter(Boolean)
      const parsed = lines
        .map((line) => {
          // A ✗ Sai: reason  or  A ✓ Đúng: reason
          const m = line.match(/^([A-F])\s*([✓✗])\s*(Đúng|Sai):\s*(.*)$/)
          if (m) {
            const [, key, sym, , text] = m
            const ok = sym === "✓"
            return { key, ok, text }
          }
          // fallback: A: reason
          const m2 = line.match(/^([A-F])\s*[:-]\s*(.*)$/)
          if (m2) return { key: m2[1], ok: false, text: m2[2] }
          return null
        })
        .filter(Boolean) as Array<{ key: string; ok: boolean; text: string }>
      if (parsed.length) sections.push({ type: "analysis", lines: parsed })
      else sections.push({ type: "generic", title: "Phân tích lựa chọn", text: body })
      continue
    }
    if (sec.startsWith("Từ vựng:")) {
      const body = sec.replace(/^Từ vựng:\s*/, "")
      const lines = body.split("\n").map((l) => l.trim()).filter(Boolean)
      const vocab = lines.map((line) => {
        // - carefully review: meaning (paraphrases)
        const m = line.match(/^-\s*([^:]+):\s*([^(]+)(?:\(([^)]+)\))?\s*$/)
        if (m) {
          return { phrase: m[1].trim(), meaning: m[2].trim(), paraphrases: m[3]?.trim() }
        }
        // fallback
        const clean = line.replace(/^-\s*/, "")
        const colonIdx = clean.indexOf(":")
        if (colonIdx > 0) {
          return { phrase: clean.slice(0, colonIdx).trim(), meaning: clean.slice(colonIdx + 1).trim() }
        }
        return { phrase: clean, meaning: "" }
      })
      sections.push({ type: "vocab", lines: vocab })
      continue
    }
    if (sec.startsWith("Điểm ngữ pháp:")) {
      const text = sec.replace(/^Điểm ngữ pháp:\s*/, "").trim()
      sections.push({ type: "grammar", text })
      continue
    }
    if (sec.startsWith("Chiến lược:")) {
      const body = sec.replace(/^Chiến lược:\s*/, "")
      const steps = body.split("\n").map((l) => l.trim()).filter(Boolean)
      sections.push({ type: "strategy", steps })
      continue
    }
    if (sec.startsWith("Transcript:")) {
      const text = sec.replace(/^Transcript:\s*/, "").trim()
      // remove leading "Transcript:" line if body starts with it
      sections.push({ type: "transcript", text })
      continue
    }
    if (sec.startsWith("Mô tả hình ảnh:")) {
      const text = sec.replace(/^Mô tả hình ảnh:\s*/, "").trim()
      sections.push({ type: "imageDesc", text })
      continue
    }
    if (sec.startsWith("Đáp án:")) {
      const text = sec.replace(/^Đáp án:\s*/, "").trim()
      sections.push({ type: "answer", text })
      continue
    }
    // generic fallback: split title at first colon
    const colonIdx = sec.indexOf(":")
    if (colonIdx > 0 && colonIdx < 40) {
      const title = sec.slice(0, colonIdx).trim()
      const text = sec.slice(colonIdx + 1).trim()
      sections.push({ type: "generic", title, text })
    } else {
      sections.push({ type: "generic", title: "", text: sec })
    }
  }
  return sections
}

export function DetailedAnalysisContent({ content, t }: { content: string; t: (typeof quizCopy)["en" | "vi"] }) {
  const sections = parseDetailed(content)

  return (
    <div className="space-y-4">
      {sections.map((sec, idx) => {
        if (sec.type === "analysis") {
          return (
            <div key={idx} className="overflow-hidden rounded-[12px] border-2 border-[#E5E5E5] bg-white dark:border-white/10 dark:bg-slate-900">
              <div className="flex items-center gap-2 border-b border-[#E5E5E5] bg-[#F6F7FB] px-4 py-2.5 text-[12px] font-extrabold uppercase tracking-wide text-[#777777] dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[#777777] dark:bg-white/10">
                  <Award className="h-3.5 w-3.5" />
                </span>
                Phân tích lựa chọn
              </div>
              <div className="divide-y divide-[#E5E5E5] dark:divide-white/10">
                {sec.lines.map((line) => (
                  <div key={line.key} className={`flex gap-3 px-4 py-3 ${line.ok ? "bg-[#E8F7FE]/50 dark:bg-sky-500/5" : "bg-white dark:bg-slate-900"}`}>
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-extrabold ${line.ok ? "border-[#1CB0F6] bg-[#1CB0F6] text-white" : "border-[#E5E5E5] bg-[#F6F7FB] text-[#777777] dark:border-white/15 dark:bg-white/5 dark:text-slate-400"}`}
                    >
                      {line.key}
                    </span>
                    <p className={`flex-1 text-[13px] leading-6 ${line.ok ? "font-bold text-[#129BDC] dark:text-sky-300" : "font-medium text-[#4B4B4B] dark:text-slate-300"}`}>{line.text}</p>
                    {line.ok ? <CheckCircle2 className="h-4 w-4 shrink-0 text-[#1CB0F6] mt-0.5" /> : <span className="h-4 w-4 shrink-0 mt-0.5 rounded-full border border-[#E5E5E5] dark:border-white/15" aria-hidden="true" />}
                  </div>
                ))}
              </div>
            </div>
          )
        }
        if (sec.type === "vocab") {
          return (
            <div key={idx} className="overflow-hidden rounded-[12px] border-2 border-[#E5E5E5] bg-white dark:border-white/10 dark:bg-slate-900">
              <div className="flex items-center gap-2 bg-[#FFF8E1] px-4 py-2.5 text-[12px] font-extrabold uppercase tracking-wide text-[#7A5B00] dark:bg-[#FFD000]/10 dark:text-[#FFD000]">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FFE9A8] text-[#9A7B00] dark:bg-[#FFD000]/20">
                  <BookOpen className="h-3.5 w-3.5" />
                </span>
                Từ vựng
              </div>
              <div className="grid gap-2 p-3 sm:grid-cols-2">
                {sec.lines.map((v, i) => (
                  <div key={i} className="rounded-[10px] border border-[#E5E5E5] bg-[#F6F7FB] px-3 py-2.5 dark:border-white/10 dark:bg-white/5">
                    <p className="text-[13px] font-extrabold leading-5 text-[#1CB0F6] dark:text-sky-300">{v.phrase}</p>
                    <p className="mt-0.5 text-[12px] font-semibold leading-5 text-[#100F3E] dark:text-slate-100">{v.meaning}</p>
                    {v.paraphrases ? <p className="mt-1 text-[11px] italic leading-4 text-[#777777] dark:text-slate-400">{v.paraphrases}</p> : null}
                  </div>
                ))}
              </div>
            </div>
          )
        }
        if (sec.type === "grammar") {
          return (
            <div key={idx} className="flex items-center gap-2.5 rounded-[12px] border-2 border-[#B3E5FC] bg-[#E8F7FE] px-4 py-3 dark:border-sky-500/20 dark:bg-sky-500/10">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1CB0F6] text-white">
                <GraduationCap className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#129BDC] dark:text-sky-200">Điểm ngữ pháp</p>
                <p className="text-[13px] font-bold leading-5 text-[#100F3E] dark:text-sky-100">{sec.text}</p>
              </div>
            </div>
          )
        }
        if (sec.type === "strategy") {
          return (
            <div key={idx} className="overflow-hidden rounded-[12px] border-2 border-[#E5E5E5] bg-white dark:border-white/10 dark:bg-slate-900">
              <div className="flex items-center gap-2 bg-[#F6F7FB] px-4 py-2.5 text-[12px] font-extrabold uppercase tracking-wide text-[#100F3E] dark:bg-white/5 dark:text-white">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FFE9A8] text-[#9A7B00] dark:bg-[#FFD000]/20 dark:text-[#FFD000]">
                  <Lightbulb className="h-3.5 w-3.5" />
                </span>
                Chiến lược
              </div>
              <ol className="space-y-2 p-3">
                {sec.steps.map((step, i) => (
                  <li key={i} className="flex gap-3 rounded-[10px] bg-[#F6F7FB] px-3 py-2.5 text-[13px] leading-6 dark:bg-white/5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1CB0F6] text-[12px] font-extrabold text-white">{i + 1}</span>
                    <span className="flex-1 font-semibold text-[#4B4B4B] dark:text-slate-200">{step.replace(/^\d+\.\s*/, "")}</span>
                  </li>
                ))}
              </ol>
            </div>
          )
        }
        if (sec.type === "transcript") {
          return (
            <div key={idx} className="overflow-hidden rounded-[12px] border-2 border-[#E5E5E5] bg-white dark:border-white/10 dark:bg-slate-900">
              <div className="flex items-center gap-2 bg-[#F6F7FB] px-4 py-2.5 text-[12px] font-extrabold uppercase tracking-wide text-[#100F3E] dark:bg-white/5 dark:text-white">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E8F7FE] text-[#1CB0F6] dark:bg-sky-500/20">
                  <Mic className="h-3.5 w-3.5" />
                </span>
                {t.transcript}
              </div>
              <div className="border-t-2 border-[#E5E5E5] bg-[#F6F7FB] px-4 py-3 dark:border-white/10 dark:bg-white/5">
                <p className="whitespace-pre-line text-[13px] italic leading-7 text-[#4B4B4B] dark:text-slate-300">“{sec.text}”</p>
              </div>
            </div>
          )
        }
        if (sec.type === "imageDesc") {
          return (
            <div key={idx} className="flex gap-2.5 rounded-[12px] border-2 border-[#E5E5E5] bg-[#F6F7FB] px-4 py-3 dark:border-white/10 dark:bg-white/5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-[#777777] dark:bg-white/10">
                <ImageIcon className="h-4 w-4" />
              </span>
              <p className="text-[13px] leading-6 text-[#4B4B4B] dark:text-slate-200">{sec.text}</p>
            </div>
          )
        }
        if (sec.type === "answer") {
          return (
            <div key={idx} className="rounded-[12px] border-2 border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] font-bold text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-100">
              {t.answerLabel} {sec.text}
            </div>
          )
        }
        // generic
        return (
          <div key={idx} className="rounded-[12px] border-2 border-[#E5E5E5] bg-white px-4 py-3 dark:border-white/10 dark:bg-slate-900">
            {sec.title ? <p className="mb-1 text-[12px] font-extrabold uppercase tracking-wide text-[#100F3E] dark:text-white">{sec.title}</p> : null}
            <p className="whitespace-pre-line text-[13px] leading-7 text-[#4B4B4B] dark:text-slate-200">{sec.text}</p>
          </div>
        )
      })}
    </div>
  )
}
