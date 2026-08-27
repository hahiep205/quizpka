import { memo } from "react"
import { cn } from "@/lib/utils"
import { quizCopy } from "@/shared/i18n"
import type { Question, AnswerValue } from "@/features/quiz/model/quiz.types"
import { countAnsweredInRange } from "@/features/quiz/lib/quizGrouping"
import type { PartNavigationItem, ToeicGroup, ToeicTwoLevelData } from "@/features/quiz/lib/quizGrouping"

type QuizSidebarProps = {
  showPartNavigation: boolean
  partNavigationItems: PartNavigationItem[]
  currentPartStartIndex: number
  isToeic: boolean
  isSinglePartToeic: boolean
  isTwoLevelToeic: boolean
  toeicGroups: ToeicGroup[]
  toeicTwoLevelData: ToeicTwoLevelData | null
  questions: Question[]
  answers: Record<string, AnswerValue>
  partQuestionIds: Set<string>
  t: (typeof quizCopy)["en" | "vi"]
  onJump: (index: number) => void
  onFinish: () => void
}

export const QuizSidebar = memo(function QuizSidebar({
  showPartNavigation,
  partNavigationItems,
  currentPartStartIndex,
  isToeic,
  isSinglePartToeic,
  isTwoLevelToeic,
  toeicGroups,
  toeicTwoLevelData,
  questions,
  answers,
  partQuestionIds,
  t,
  onJump,
  onFinish,
}: QuizSidebarProps) {
  return (
        <aside className="min-w-0 rounded-[16px] border-2 border-[#E5E5E5] bg-white p-3 shadow-[0_4px_0_#DCDCDC] dark:border-white/10 dark:bg-slate-900 sm:p-4">
          <p className="lp-label mb-3">{showPartNavigation ? "Parts" : t.jump}</p>
          <div className="max-h-[420px] overflow-x-hidden overflow-y-auto pr-1">
            {showPartNavigation ? (
              <div className="grid grid-cols-3 gap-2 pb-1">
                {partNavigationItems.map((part) => {
                  const active = part.startIndex === currentPartStartIndex
                  const [partText, sectionText] = part.label.split(" - ")
                  return (
                    <button
                      key={part.startIndex}
                      type="button"
                      onClick={() => onJump(part.startIndex)}
                      className={cn(
                        "flex aspect-square flex-col items-center justify-center rounded-[12px] border-2 p-2 text-center transition-colors",
                        active
                          ? "border-[#1CB0F6] bg-[#1CB0F6] text-white shadow-[0_2px_0_#189CD8]"
                          : "border-[#E5E5E5] bg-[#F6F7FB] text-[#4B4B4B] hover:border-[#B3E5FC] dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                      )}
                    >
                      <span className="text-[11px] font-extrabold leading-none">{partText}</span>
                      <span className="mt-1 text-[10px] font-bold leading-none opacity-80">{sectionText}</span>
                    </button>
                  )
                })}
              </div>
            ) : isToeic ? (
              isTwoLevelToeic && toeicTwoLevelData ? (
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-4 gap-2 pb-1 lg:grid-cols-3">
                    {toeicTwoLevelData.partList.map((part) => {
                      const active = part.partNum === toeicTwoLevelData.selectedPartNum
                      const partGroups = toeicGroups.filter((g) => g.partLabel === part.partLabel)
                      const answeredInPart = partGroups.reduce((acc, g) => acc + countAnsweredInRange(questions, answers, g.start, g.end), 0)
                      const allAnswered = answeredInPart === part.totalQuestions
                      const someAnswered = answeredInPart > 0 && !allAnswered
                      return (
                        <button
                          key={part.partNum}
                          type="button"
                          title={part.partLabel}
                          onClick={() => onJump(part.firstStart)}
                          className={cn(
                            "flex aspect-square flex-col items-center justify-center rounded-[12px] border-2 p-2 text-center transition-colors",
                            active
                              ? "border-[#1CB0F6] bg-[#1CB0F6] text-white shadow-[0_2px_0_#189CD8]"
                              : allAnswered
                                ? "border-[#58CC02] bg-[#E6F5D9] text-[#3A8A00] dark:border-[#58CC02]/30 dark:bg-[#58CC02]/10 dark:text-[#7ED321]"
                                : someAnswered
                                  ? "border-[#FFD000] bg-[#FFF8E1] text-[#9A7B00] dark:border-[#FFD000]/30 dark:bg-[#FFD000]/10"
                                  : "border-[#E5E5E5] bg-[#F6F7FB] text-[#4B4B4B] hover:border-[#B3E5FC] dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                          )}
                        >
                          <span className="text-[11px] font-extrabold leading-none">{part.partLabel}</span>
                          <span
                            className={cn(
                              "mt-1.5 rounded-full px-2 py-0.5 text-[10px] font-extrabold leading-none",
                              active
                                ? "bg-white/20 text-white"
                                : allAnswered
                                  ? "bg-white text-[#3A8A00] dark:bg-white/10 dark:text-[#7ED321]"
                                  : someAnswered
                                    ? "bg-white text-[#9A7B00] border border-[#FFE69C] dark:bg-white/10"
                                    : "bg-white text-[#777777] border border-[#E5E5E5] dark:bg-white/5 dark:text-slate-300 dark:border-white/10"
                            )}
                          >
                            {part.totalQuestions} câu
                          </span>
                        </button>
                      )
                    })}
                  </div>
                  <div className="h-px bg-[#E5E5E5] dark:bg-white/10" />
                  <div className="grid grid-cols-4 gap-2 pb-1 lg:grid-cols-3">
                    {toeicTwoLevelData.filteredGroups.map((g) => {
                      const active = g.start === currentPartStartIndex
                      const answeredInGroup = countAnsweredInRange(questions, answers, g.start, g.end)
                      const allAnswered = answeredInGroup === g.count
                      const someAnswered = answeredInGroup > 0 && !allAnswered
                      if (g.count === 1) {
                        return (
                          <button
                            key={g.start}
                            type="button"
                            title={g.title}
                            onClick={() => onJump(g.start)}
                            className={cn(
                              "flex aspect-square flex-col items-center justify-center rounded-[12px] border-2 p-2 text-center transition-colors",
                              active
                                ? "border-[#1CB0F6] bg-[#1CB0F6] text-white shadow-[0_2px_0_#189CD8]"
                                : allAnswered
                                  ? "border-[#58CC02] bg-[#E6F5D9] text-[#3A8A00] dark:border-[#58CC02]/30 dark:bg-[#58CC02]/10 dark:text-[#7ED321]"
                                  : "border-[#E5E5E5] bg-[#F6F7FB] text-[#4B4B4B] hover:border-[#B3E5FC] dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                            )}
                          >
                            <span className="text-[13px] font-extrabold leading-none">{g.groupLabel}</span>
                          </button>
                        )
                      }
                      return (
                        <button
                          key={g.start}
                          type="button"
                          title={g.title}
                          onClick={() => onJump(g.start)}
                          className={cn(
                            "flex aspect-square flex-col items-center justify-center rounded-[12px] border-2 p-2 text-center transition-colors",
                            active
                              ? "border-[#1CB0F6] bg-[#1CB0F6] text-white shadow-[0_2px_0_#189CD8]"
                              : allAnswered
                                ? "border-[#58CC02] bg-[#E6F5D9] text-[#3A8A00] dark:border-[#58CC02]/30 dark:bg-[#58CC02]/10 dark:text-[#7ED321]"
                                : someAnswered
                                  ? "border-[#FFD000] bg-[#FFF8E1] text-[#9A7B00] dark:border-[#FFD000]/30 dark:bg-[#FFD000]/10"
                                  : "border-[#E5E5E5] bg-[#F6F7FB] text-[#4B4B4B] hover:border-[#B3E5FC] dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                          )}
                        >
                          <span className="text-[13px] font-extrabold leading-none">{g.groupLabel}</span>
                          <span
                            className={cn(
                              "mt-1.5 rounded-full px-2 py-0.5 text-[10px] font-extrabold leading-none",
                              active
                                ? "bg-white/20 text-white"
                                : allAnswered
                                  ? "bg-white text-[#3A8A00] dark:bg-white/10 dark:text-[#7ED321]"
                                  : someAnswered
                                    ? "bg-white text-[#9A7B00] border border-[#FFE69C] dark:bg-white/10"
                                    : "bg-white text-[#777777] border border-[#E5E5E5] dark:bg-white/5 dark:text-slate-300 dark:border-white/10"
                            )}
                          >
                            {g.count} câu
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2 pb-1 lg:grid-cols-3">
                  {toeicGroups.map((g) => {
                    const active = g.start === currentPartStartIndex
                    const answeredInGroup = countAnsweredInRange(questions, answers, g.start, g.end)
                    const allAnswered = answeredInGroup === g.count
                    const someAnswered = answeredInGroup > 0 && !allAnswered
                    // Nhóm 1 câu (Part5, Part1, Part2): chỉ 1 dòng Câu X cỡ lớn, bỏ Part label + badge
                    if (g.count === 1) {
                      return (
                        <button
                          key={g.start}
                          type="button"
                          title={g.title}
                          onClick={() => onJump(g.start)}
                          className={cn(
                            "flex aspect-square flex-col items-center justify-center rounded-[12px] border-2 p-2 text-center transition-colors",
                            active
                              ? "border-[#1CB0F6] bg-[#1CB0F6] text-white shadow-[0_2px_0_#189CD8]"
                              : allAnswered
                                ? "border-[#58CC02] bg-[#E6F5D9] text-[#3A8A00] dark:border-[#58CC02]/30 dark:bg-[#58CC02]/10 dark:text-[#7ED321]"
                                : "border-[#E5E5E5] bg-[#F6F7FB] text-[#4B4B4B] hover:border-[#B3E5FC] dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                          )}
                        >
                          <span className="text-[13px] font-extrabold leading-none">{g.groupLabel}</span>
                        </button>
                      )
                    }
                    // Theo Part lẻ (part1..part7): không cần hiển thị Part X, tăng size Nhóm lên 13px
                    if (isSinglePartToeic) {
                      return (
                        <button
                          key={g.start}
                          type="button"
                          title={g.title}
                          onClick={() => onJump(g.start)}
                          className={cn(
                            "flex aspect-square flex-col items-center justify-center rounded-[12px] border-2 p-2 text-center transition-colors",
                            active
                              ? "border-[#1CB0F6] bg-[#1CB0F6] text-white shadow-[0_2px_0_#189CD8]"
                              : allAnswered
                                ? "border-[#58CC02] bg-[#E6F5D9] text-[#3A8A00] dark:border-[#58CC02]/30 dark:bg-[#58CC02]/10 dark:text-[#7ED321]"
                                : someAnswered
                                  ? "border-[#FFD000] bg-[#FFF8E1] text-[#9A7B00] dark:border-[#FFD000]/30 dark:bg-[#FFD000]/10"
                                  : "border-[#E5E5E5] bg-[#F6F7FB] text-[#4B4B4B] hover:border-[#B3E5FC] dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                          )}
                        >
                          <span className="text-[13px] font-extrabold leading-none">{g.groupLabel}</span>
                          <span
                            className={cn(
                              "mt-1.5 rounded-full px-2 py-0.5 text-[10px] font-extrabold leading-none",
                              active
                                ? "bg-white/20 text-white"
                                : allAnswered
                                  ? "bg-white text-[#3A8A00] dark:bg-white/10 dark:text-[#7ED321]"
                                  : someAnswered
                                    ? "bg-white text-[#9A7B00] border border-[#FFE69C] dark:bg-white/10"
                                    : "bg-white text-[#777777] border border-[#E5E5E5] dark:bg-white/5 dark:text-slate-300 dark:border-white/10"
                            )}
                          >
                            {g.count} câu
                          </span>
                        </button>
                      )
                    }
                    return (
                      <button
                        key={g.start}
                        type="button"
                        title={g.title}
                        onClick={() => onJump(g.start)}
                        className={cn(
                          "flex aspect-square flex-col items-center justify-center rounded-[12px] border-2 p-2 text-center transition-colors",
                          active
                            ? "border-[#1CB0F6] bg-[#1CB0F6] text-white shadow-[0_2px_0_#189CD8]"
                            : allAnswered
                              ? "border-[#58CC02] bg-[#E6F5D9] text-[#3A8A00] dark:border-[#58CC02]/30 dark:bg-[#58CC02]/10 dark:text-[#7ED321]"
                              : someAnswered
                                ? "border-[#FFD000] bg-[#FFF8E1] text-[#9A7B00] dark:border-[#FFD000]/30 dark:bg-[#FFD000]/10"
                                : "border-[#E5E5E5] bg-[#F6F7FB] text-[#4B4B4B] hover:border-[#B3E5FC] dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                        )}
                      >
                        <span className="text-[11px] font-extrabold leading-none">{g.partLabel}</span>
                        <span className="mt-1 text-[10px] font-bold leading-none opacity-80">{g.groupLabel}</span>
                        <span
                          className={cn(
                            "mt-1.5 rounded-full px-2 py-0.5 text-[10px] font-extrabold leading-none",
                            active
                              ? "bg-white/20 text-white"
                              : allAnswered
                                ? "bg-white text-[#3A8A00] dark:bg-white/10 dark:text-[#7ED321]"
                                : someAnswered
                                  ? "bg-white text-[#9A7B00] border border-[#FFE69C] dark:bg-white/10"
                                  : "bg-white text-[#777777] border border-[#E5E5E5] dark:bg-white/5 dark:text-slate-300 dark:border-white/10"
                          )}
                        >
                          {g.count} câu
                        </span>
                      </button>
                    )
                  })}
                </div>
              )
            ) : (
              <div
                className="grid gap-[5px] pb-1"
                style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}
              >
                {questions.map((question, index) => {
                  const answered = answers[question.id] !== undefined
                  return (
                    <button
                      key={question.id}
                      type="button"
                      onClick={() => onJump(index)}
                      className={cn(
                        "box-border flex h-[32px] w-full min-w-0 items-center justify-center rounded-[9px] border-2 text-[11px] font-extrabold transition-transform active:translate-y-[1px]",
                        partQuestionIds.has(question.id)
                          ? "border-[#1CB0F6] bg-[#1CB0F6] text-white"
                          : answered
                            ? "border-[#B3E5FC] bg-[#E8F7FE] text-[#129BDC]"
                            : "border-[#E5E5E5] bg-[#F6F7FB] text-[#777777]"
                      )}
                    >
                      {index + 1}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
          <button
            type="button"
            className="lp-btn lp-btn--primary lp-btn--sm lp-btn--block mt-4"
            onClick={() => onFinish()}
          >
            {t.finish}
          </button>
        </aside>
  )
})
