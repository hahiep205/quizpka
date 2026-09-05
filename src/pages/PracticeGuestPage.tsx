import { useEffect, useMemo, useState } from "react"
import { QuizSession } from "@/components/QuizSession"
import {
  clearPracticeSession,
  goHomeFromPractice,
  readPracticeSession,
  type PracticeSessionPayload,
} from "@/lib/practiceSession"
import { getSubjectById, examCatalog } from "@/data/subjects"
import { tadvExamOptions } from "@/data/tadvExams"
import { dsaiExamOptions } from "@/data/dsaiExams"
import { getToeicScopeOption } from "@/data/toeic"
import { DsaiServerQuizSession } from "@/features/quiz/ui/DsaiServerQuizSession"

type Lang = "en" | "vi"

const copy = {
  en: {
    missingTitle: "Practice session not found",
    missingDesc: "Please choose an exam set again from Documents.",
    back: "Back to documents",
    loading: "Preparing your quiz...",
  },
  vi: {
    missingTitle: "Không tìm thấy phiên luyện tập",
    missingDesc: "Vui lòng chọn lại bộ đề từ mục Tài liệu.",
    back: "Về tài liệu",
    loading: "Đang chuẩn bị bài làm...",
  },
} as const

export function PracticeGuestPage({
  lang,
  themeClassName,
}: {
  lang: Lang
  themeClassName?: string
}) {
  const t = copy[lang]
  const [payload, setPayload] = useState<PracticeSessionPayload | null | undefined>(
    undefined
  )

  useEffect(() => {
    setPayload(readPracticeSession())
  }, [])

  const exam = useMemo(() => {
    if (!payload) return null
    const found = examCatalog.find((item) => item.id === payload.examId) ?? null
    if (found) {
      if (payload.toeicScope) {
        const opt = getToeicScopeOption(payload.toeicScope, payload.examId)
        if (opt) {
          return {
            ...found,
            questionCount: opt.count,
            durationMinutes: opt.durationMinutes,
            title: {
              en: `${found.title.en} - ${opt.label.en}`,
              vi: `${found.title.vi} - ${opt.label.vi}`,
            },
          }
        }
      }
      return found
    }
    const tadvOpt = tadvExamOptions.find((o) => o.id === payload.examId)
    if (tadvOpt) {
      const subj = getSubjectById(payload.subjectId)
      if (!subj) return null
      return {
        id: tadvOpt.id,
        type: "final" as const,
        year: 2026,
        questionCount: 55,
        durationMinutes: 60,
        title: tadvOpt.title,
        description: tadvOpt.description,
        questionBanks: tadvOpt.questionBanks,
        subjectId: subj.id,
        subjectCode: subj.code,
        subjectName: subj.name,
        category: subj.category,
      }
    }
    const dsaiOpt = dsaiExamOptions.find((o) => o.id === payload.examId)
    if (dsaiOpt) {
      const subj = getSubjectById(payload.subjectId)
      if (!subj) return null
      return {
        id: dsaiOpt.id,
        type: "final" as const,
        year: 2026,
        questionCount: dsaiOpt.questionCount,
        durationMinutes: dsaiOpt.durationMinutes,
        title: dsaiOpt.title,
        description: dsaiOpt.description,
        subjectId: subj.id,
        subjectCode: subj.code,
        subjectName: subj.name,
        category: subj.category,
      }
    }
    return null
  }, [payload])

  const subject = useMemo(() => {
    if (!payload) return null
    return getSubjectById(payload.subjectId)
  }, [payload])

  if (payload === undefined) {
    return (
      <div className={themeClassName}>
        <div className="mx-auto flex min-h-svh w-full max-w-[720px] items-center justify-center px-6">
          <p className="lp-modal-desc text-[15px]">{t.loading}</p>
        </div>
      </div>
    )
  }

  if (!payload || !exam || !subject) {
    return (
      <div className={themeClassName}>
        <div className="mx-auto flex min-h-svh w-full max-w-[520px] flex-col items-center justify-center px-6 text-center">
          <h1 className="lp-modal-title text-[24px]">{t.missingTitle}</h1>
          <p className="lp-modal-desc mt-3">{t.missingDesc}</p>
          <button
            type="button"
            className="lp-btn lp-btn--primary lp-btn--sm mt-6"
            onClick={goHomeFromPractice}
          >
            {t.back}
          </button>
        </div>
      </div>
    )
  }

  if (subject.id === "khoa-hoc-du-lieu-va-tri-tue-nhan-tao") return (
    <div className={themeClassName}>
      <DsaiServerQuizSession
        lang={payload.lang ?? lang}
        subject={subject}
        exam={exam}
        onExit={() => {
          clearPracticeSession()
          goHomeFromPractice()
        }}
      />
    </div>
  )

  return (
    <div className={themeClassName}>
      <div className="relative flex min-h-svh flex-col pt-4">
        <QuizSession
          lang={payload.lang ?? lang}
          subject={subject}
          exam={exam}
          setup={payload.setup}
          chapterId={payload.chapterId ?? undefined}
          toeicScope={payload.toeicScope}
          questionIds={payload.questionIds}
          retryOfHistoryId={payload.retryOfHistoryId}
          retryNumber={payload.retryNumber}
          onExit={() => {
            clearPracticeSession()
            goHomeFromPractice()
          }}
        />
      </div>
    </div>
  )
}
