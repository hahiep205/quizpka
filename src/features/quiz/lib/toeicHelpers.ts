import type { Question } from "@/features/quiz/model/quiz.types"
import type { QuizSetupValues } from "@/components/QuizSetupModal"
import { getToeicScopeOption, type ToeicScope } from "@/data/toeic"

const OPTION_KEYS = ["A", "B", "C", "D", "E", "F"] as const

function shuffle<T>(items: T[]) {
  const list = [...items]
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[list[i], list[j]] = [list[j], list[i]]
  }
  return list
}

function buildToeicExplanations(item: any): { explanation?: string; detailedExplanation?: string } {
  const correct = item.correct_answer ?? item.answer
  // Trường hợp có explainAnswer riêng (Part7 multiple): đó là Giải thích ngắn, chi tiết sẽ lấy từ các trường còn lại nếu có
  if (item.explainAnswer) {
    const short = item.explainAnswer as string
    const detailedParts: string[] = []
    // Nếu có analysis kèm theo thì vẫn đưa vào chi tiết
    if (item.analysis && typeof item.analysis === "object") {
      const lines: string[] = []
      for (const key of OPTION_KEYS) {
        const entry = (item.analysis as any)[key]
        if (!entry?.reason) continue
        const isCorrect = key === correct
        lines.push(`${key} ${isCorrect ? "✓ Đúng" : "✗ Sai"}: ${entry.reason}`)
      }
      if (lines.length) detailedParts.push(`Phân tích lựa chọn:\n${lines.join("\n")}`)
    }
    if (item.vocabulary?.length) {
      const vocabLines = item.vocabulary.map((v: any) => `- ${v.phrase}: ${v.meaning}${v.paraphrases?.length ? ` (${v.paraphrases.join(", ")})` : ""}`).join("\n")
      detailedParts.push(`Từ vựng:\n${vocabLines}`)
    }
    if (item.grammar_point) detailedParts.push(`Điểm ngữ pháp: ${item.grammar_point}`)
    if (item.strategy?.length) detailedParts.push(`Chiến lược:\n${item.strategy.map((s: string, i: number) => `${i + 1}. ${s}`).join("\n")}`)
    if (item.audio_transcript) detailedParts.push(`Transcript:\n${item.audio_transcript}`)
    if (item.image_description) detailedParts.push(`Mô tả hình ảnh: ${item.image_description}`)
    const detailed = detailedParts.length ? detailedParts.join("\n\n") : undefined
    // Nếu chi tiết trùng ngắn thì bỏ
    if (detailed && detailed.trim() === short.trim()) return { explanation: short, detailedExplanation: undefined }
    return { explanation: short, detailedExplanation: detailed }
  }

  const correctReason = item.analysis && correct ? (item.analysis[correct]?.reason as string | undefined) : undefined
  const explanation = correctReason ?? item.correct_text ?? item.audio_transcript ?? undefined

  const detailedParts: string[] = []
  if (item.analysis && typeof item.analysis === "object") {
    const lines: string[] = []
    for (const key of OPTION_KEYS) {
      const entry = (item.analysis as any)[key]
      if (!entry?.reason) continue
      const isCorrect = key === correct
      lines.push(`${key} ${isCorrect ? "✓ Đúng" : "✗ Sai"}: ${entry.reason}`)
    }
    if (lines.length) detailedParts.push(`Phân tích lựa chọn:\n${lines.join("\n")}`)
  }
  if (item.vocabulary?.length) {
    const vocabLines = item.vocabulary.map((v: any) => `- ${v.phrase}: ${v.meaning}${v.paraphrases?.length ? ` (${v.paraphrases.join(", ")})` : ""}`).join("\n")
    detailedParts.push(`Từ vựng:\n${vocabLines}`)
  }
  if (item.grammar_point) detailedParts.push(`Điểm ngữ pháp: ${item.grammar_point}`)
  if (item.strategy?.length) detailedParts.push(`Chiến lược:\n${item.strategy.map((s: string, i: number) => `${i + 1}. ${s}`).join("\n")}`)
  if (item.audio_transcript) detailedParts.push(`Transcript:\n${item.audio_transcript}`)
  if (item.image_description) detailedParts.push(`Mô tả hình ảnh: ${item.image_description}`)
  if (item.correct_text && explanation !== item.correct_text) {
    // Đáp án chuẩn thường đã nằm trong explanation nếu không có analysis, vẫn đưa vào chi tiết để đủ
    if (!item.analysis) detailedParts.unshift(`Đáp án: ${item.correct_text}`)
  }

  const detailedExplanation = detailedParts.length ? detailedParts.join("\n\n") : undefined
  // Tránh trùng lặp hoàn toàn
  if (detailedExplanation && explanation && detailedExplanation.trim() === explanation.trim()) {
    return { explanation, detailedExplanation: undefined }
  }
  // Nếu chỉ có 1 trong 2 và chúng giống nhau về ý, giữ ngắn thôi
  if (!explanation && detailedExplanation) {
    // Trường hợp không có reason nhưng có vocab/strategy thì lấy dòng đầu làm ngắn? Giữ nguyên detailed làm ngắn
    return { explanation: detailedExplanation, detailedExplanation: undefined }
  }
  return { explanation, detailedExplanation }
}

function mapOptionsToQuestion(
  examId: string,
  baseId: string | number,
  rawQuestion: string,
  rawOptions: Record<string, string> | undefined,
  rawAnswer: string | undefined,
  explanation: string | undefined,
  detailedExplanation: string | undefined,
  setup: QuizSetupValues,
  context: Omit<Question, "id" | "prompt" | "options" | "correctIndex" | "acceptedAnswers" | "explanation" | "detailedExplanation">
): Question {
  const orderedKeys = OPTION_KEYS.filter((k) => rawOptions?.[k] != null)
  const pairs = orderedKeys.map((key) => ({
    key,
    text: rawOptions?.[key] ?? "",
    isCorrect: key === rawAnswer,
  }))
  const finalPairs = setup.answerOrder === "random" ? shuffle(pairs) : pairs
  const correctIndex = pairs.length ? Math.max(0, finalPairs.findIndex((p) => p.isCorrect)) : undefined
  const acceptedAnswers = pairs.length ? undefined : rawAnswer ? [rawAnswer.trim().toLowerCase()] : undefined
  return {
    id: `${examId}-${context.section ?? "toeic"}-${(context.partTitle ?? "part").replace(/\s+/g, "-")}-${baseId}`,
    prompt: rawQuestion,
    options: finalPairs.map((p) => p.text),
    correctIndex,
    acceptedAnswers,
    explanation,
    detailedExplanation,
    ...context,
  }
}

function getDir(file: string): string {
  const idx = file.lastIndexOf("/")
  return idx >= 0 ? file.slice(0, idx) : ""
}

export async function loadToeicQuestions(scope: ToeicScope, examId: string, setup: QuizSetupValues): Promise<Question[]> {
  const option = getToeicScopeOption(scope)
  if (!option) throw new Error(`Unknown TOEIC scope: ${scope}`)

  const allQuestions: Question[] = []

  for (const file of option.files) {
    const dir = getDir(file)
    const response = await fetch(file)
    if (!response.ok) throw new Error(`Failed to load ${file}: ${response.status}`)
    const data = await response.json()

    // Part1 / Part2 / Part5 flat array
    if (Array.isArray(data) && file.includes("/Part1/")) {
      for (const item of data as any[]) {
        const rawAnswer = item.correct_answer ?? item.answer
        const prompt = item.prompt ?? item.question ?? ""
        const audioUrl = item.audio ? `${dir}/${item.audio}` : undefined
        const imageUrl = item.image ? `${dir}/${item.image}` : undefined
        const { explanation, detailedExplanation } = buildToeicExplanations(item)
        const q = mapOptionsToQuestion(
          examId,
          item.id ?? `${allQuestions.length + 1}`,
          prompt,
          item.options,
          rawAnswer,
          explanation,
          detailedExplanation,
          setup,
          {
            partTitle: `Listening - Part 1 - Q${item.id}`,
            section: "Listening",
            audioUrl,
            imageUrl,
          }
        )
        allQuestions.push(q)
      }
      continue
    }

    if (Array.isArray(data) && file.includes("/Part2/")) {
      for (const item of data as any[]) {
        const rawAnswer = item.correct_answer ?? item.answer
        const prompt = item.question ?? item.prompt ?? ""
        const audioUrl = item.audio ? `${dir}/${item.audio}` : undefined
        const { explanation, detailedExplanation } = buildToeicExplanations(item)
        const q = mapOptionsToQuestion(
          examId,
          item.id ?? `${allQuestions.length + 1}`,
          prompt,
          item.options,
          rawAnswer,
          explanation,
          detailedExplanation,
          setup,
          {
            partTitle: `Listening - Part 2 - Q${item.id}`,
            section: "Listening",
            audioUrl,
          }
        )
        allQuestions.push(q)
      }
      continue
    }

    if (Array.isArray(data) && file.includes("/Part3/")) {
      for (const group of data as any[]) {
        const groupAudio = group.audio ? `${dir}/${group.audio}` : undefined
        const groupImage = group.image ? `${dir}/${group.image}` : undefined
        const partTitle = `Listening - Part 3 - Group ${group.group}`
        const instruction = "Listen to the conversation and answer three questions."
        for (const item of group.questions as any[]) {
          const rawAnswer = item.correct_answer ?? item.answer
          const prompt = item.question ?? item.prompt ?? ""
          const { explanation, detailedExplanation } = buildToeicExplanations(item)
          // For grouped listening, audio is shared at group level
          const q = mapOptionsToQuestion(
            examId,
            item.id ?? `${group.group}-${item.id}`,
            prompt,
            item.options,
            rawAnswer,
            explanation,
            detailedExplanation,
            setup,
            {
              partTitle,
              section: "Listening",
              audioUrl: groupAudio,
              imageUrl: groupImage || undefined,
              instruction,
              // store transcript as passage? Use audio_transcript as extra context if needed
              passage: item.audio_transcript ? `Transcript: ${item.audio_transcript}` : undefined,
            }
          )
          // If group questions share same partTitle, they will be grouped together in QuizSession
          // To keep them together, we keep same partTitle, but need to avoid per-question uniqueness
          // Override id to be unique but partTitle shared ensures grouping
          allQuestions.push(q)
        }
      }
      continue
    }

    if (Array.isArray(data) && file.includes("/Part4/")) {
      for (const group of data as any[]) {
        const groupAudio = group.audio ? `${dir}/${group.audio}` : undefined
        const groupImage = group.image ? `${dir}/${group.image}` : undefined
        const partTitle = `Listening - Part 4 - Group ${group.group}`
        const instruction = "Listen to the talk and answer three questions."
        for (const item of group.questions as any[]) {
          const rawAnswer = item.correct_answer ?? item.answer
          const prompt = item.question ?? item.prompt ?? ""
          const { explanation, detailedExplanation } = buildToeicExplanations(item)
          const q = mapOptionsToQuestion(
            examId,
            item.id ?? `${group.group}-${item.id}`,
            prompt,
            item.options,
            rawAnswer,
            explanation,
            detailedExplanation,
            setup,
            {
              partTitle,
              section: "Listening",
              audioUrl: groupAudio,
              imageUrl: groupImage || undefined,
              instruction,
              passage: item.audio_transcript ? `Transcript: ${item.audio_transcript}` : undefined,
            }
          )
          allQuestions.push(q)
        }
      }
      continue
    }

    if (Array.isArray(data) && file.includes("/Part5/")) {
      for (const item of data as any[]) {
        const rawAnswer = item.correct_answer ?? item.answer
        const prompt = item.question ?? item.prompt ?? ""
        const { explanation, detailedExplanation } = buildToeicExplanations(item)
        const q = mapOptionsToQuestion(
          examId,
          item.id ?? `${allQuestions.length + 1}`,
          prompt,
          item.options,
          rawAnswer,
          explanation,
          detailedExplanation,
          setup,
          {
            partTitle: `Reading - Part 5 - Q${item.id}`,
            section: "Reading",
          }
        )
        allQuestions.push(q)
      }
      continue
    }

    if (Array.isArray(data) && file.includes("/Part6/")) {
      for (const group of data as any[]) {
        const passage: string = group.passage ?? ""
        const partTitle = `Reading - Part 6 - ${group.group_id ?? `Group ${group.group_id}`}`
        for (const item of group.questions as any[]) {
          const rawAnswer = item.correct_answer ?? item.answer
          const prompt = item.question ?? item.prompt ?? ""
          const { explanation, detailedExplanation } = buildToeicExplanations(item)
          const q = mapOptionsToQuestion(
            examId,
            item.id ?? `${group.group_id}-${item.id}`,
            prompt,
            item.options,
            rawAnswer,
            explanation,
            detailedExplanation,
            setup,
            {
              partTitle,
              section: "Reading",
              passage,
            }
          )
          allQuestions.push(q)
        }
      }
      continue
    }

    // Part7 object with groups
    if (data && typeof data === "object" && "groups" in data && file.includes("/Part7/")) {
      const groups = (data as any).groups as any[]
      for (const group of groups) {
        let passage: string = ""
        if (typeof group.passage === "string" && group.passage.trim().length > 0) {
          passage = group.passage
        } else if (Array.isArray(group.passages) && group.passages.length > 0) {
          passage = (group.passages as any[])
            .map((doc: any, idx: number) => {
              const title = doc.title ?? `Document ${doc.documentId ?? idx + 1}`
              const type = doc.documentType ? ` [${doc.documentType}]` : ""
              const content = doc.content ?? doc.text ?? ""
              return `${title}${type}\n${content}`
            })
            .join("\n\n━━━━━━━━━━━━━━━━━━━━\n\n")
        }
        const partTitle = `Reading - Part 7 - Group ${group.groupId ?? group.group_id ?? allQuestions.length + 1}`
        for (const item of group.questions as any[]) {
          const rawAnswer = item.answer ?? item.correct_answer
          const prompt = item.question ?? item.prompt ?? ""
          const { explanation, detailedExplanation } = buildToeicExplanations(item)
          const q = mapOptionsToQuestion(
            examId,
            item.id ?? `${group.groupId}-${item.id}`,
            prompt,
            item.options,
            rawAnswer,
            explanation,
            detailedExplanation,
            setup,
            {
              partTitle,
              section: "Reading",
              passage,
            }
          )
          allQuestions.push(q)
        }
      }
      continue
    }

    // Fallback generic array
    if (Array.isArray(data)) {
      for (const item of data as any[]) {
        const rawAnswer = item.correct_answer ?? item.answer
        const prompt = item.question ?? item.prompt ?? ""
        const { explanation, detailedExplanation } = buildToeicExplanations(item)
        const q = mapOptionsToQuestion(
          examId,
          item.id ?? `${allQuestions.length + 1}`,
          prompt,
          item.options,
          rawAnswer,
          explanation,
          detailedExplanation,
          setup,
          {
            partTitle: item.part ?? "TOEIC",
            section: item.part?.includes("Listening") ? "Listening" : "Reading",
          }
        )
        allQuestions.push(q)
      }
      continue
    }

    throw new Error(`Unsupported TOEIC data format for ${file}`)
  }

  // Apply questionOrder: if random, shuffle; but keep grouping? For TOEIC we shuffle flat
  let result = allQuestions
  if (setup.questionOrder === "random") {
    result = shuffle(result)
  }

  // For TOEIC, ignore questionLimit (exam mode should show full scope)
  // The caller may still expect limit handling; we intentionally return full scope
  return result
}
