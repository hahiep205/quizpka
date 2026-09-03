import { useCallback, useEffect, useState } from "react"
import { loadQuizQuestions } from "@/features/quiz/api/loadQuizQuestions"
import type { QuizSetupValues } from "@/components/QuizSetupModal"
import type { ExamPaper, Subject } from "@/data/subjects"
import type { ToeicScope } from "@/data/toeic"
import type { Question } from "@/features/quiz/model/quiz.types"

type UseQuizQuestionsInput = {
  subject: Subject
  exam: ExamPaper
  setup: QuizSetupValues
  chapterId?: string
  toeicScope?: ToeicScope
  questionIds?: string[]
}

export function useQuizQuestions(input: UseQuizQuestionsInput) {
  const { subject, exam, setup, chapterId, toeicScope, questionIds } = input
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const reload = useCallback(() => setReloadToken((token) => token + 1), [])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    void loadQuizQuestions({ subject, exam, setup, chapterId, toeicScope, signal: controller.signal })
      .then((loadedQuestions) => {
        if (!controller.signal.aborted) setQuestions(questionIds?.length ? loadedQuestions.filter((question) => questionIds.includes(question.id)) : loadedQuestions)
      })
      .catch((loadError: unknown) => {
        if (!controller.signal.aborted) {
          setQuestions([])
          setError(loadError instanceof Error ? loadError : new Error(String(loadError)))
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [chapterId, exam, questionIds, reloadToken, setup, subject, toeicScope])

  return { questions, setQuestions, loading, error, reload }
}
