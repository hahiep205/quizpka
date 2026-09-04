import { useEffect, useMemo, useState } from "react"
import { BarChart3, CheckCircle2, Clock3, Flame, Medal, Trophy, UserRound } from "lucide-react"
import { DashboardStatCard } from "@/components/DashboardStatCard"
import { useAuth } from "@/auth/AuthProvider"
import {
  buildLocalLeaderboardEntry,
  fetchLeaderboard,
  rankLeaderboard,
  upsertUserLearningStats,
  type RankedLeaderboardEntry,
} from "@/lib/leaderboard"
import { formatLearningDuration, type LearningPeriod } from "@/lib/learningStats"
import { readPracticeHistory } from "@/lib/practiceSession"
import { readStorage } from "@/lib/storage"
import { cn } from "@/lib/utils"
import { dashboardCopy as copy } from "@/shared/i18n"
import type { Language } from "@/shared/types/app"

export function LeaderboardView({ lang }: { lang: Language }) {
  const t = copy[lang]
  const { user, profile } = useAuth()
  const userId = user?.id
  const [period, setPeriod] = useState<LearningPeriod>("week")
  const [remoteEntries, setRemoteEntries] = useState<ReturnType<typeof buildLocalLeaderboardEntry>[]>([])
  const visible = readStorage("quizpka-leaderboard-visible") !== "false"
  const history = useMemo(
    () => (userId ? readPracticeHistory(userId, user?.created_at) : []),
    [user?.created_at, userId],
  )

  const you = useMemo(() => {
    if (!userId) return null
    return buildLocalLeaderboardEntry({
      userId,
      name: profile?.display_name?.trim() || profile?.email || (lang === "vi" ? "Bạn" : "You"),
      avatarUrl: profile?.avatar_url ?? null,
      visible,
      history,
      period,
    })
  }, [history, lang, period, profile?.avatar_url, profile?.display_name, profile?.email, userId, visible])

  useEffect(() => {
    if (!userId || !you) return
    let cancelled = false
    void upsertUserLearningStats({
      userId,
      name: you.name,
      avatarUrl: you.avatarUrl,
      visible,
      history,
    }).then(() => fetchLeaderboard(period, userId)).then((rows) => {
      if (!cancelled) setRemoteEntries(rows)
    })
    return () => {
      cancelled = true
    }
  }, [history, period, userId, visible, you])

  const ranked = useMemo(() => {
    const byId = new Map(remoteEntries.map((entry) => [entry.userId, entry]))
    if (you && you.visible) byId.set(you.userId, you)
    const publicEntries = [...byId.values()].filter((entry) => entry.visible && (entry.points > 0 || entry.stats.attempts > 0))
    return rankLeaderboard(publicEntries, "points")
  }, [remoteEntries, you])

  const yourRank = ranked.find((entry) => entry.isYou)?.rank

  return (
    <section className="dashboard-reveal mx-auto max-w-5xl space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-[#E8F7FE] text-[#1CB0F6] dark:bg-sky-500/10 sm:h-14 sm:w-14 sm:rounded-[16px]">
            <Trophy className="h-5 w-5 sm:h-7 sm:w-7" />
          </div>
          <div className="min-w-0">
            <h2 className="text-[22px] font-black leading-7 tracking-[-0.03em] text-[#100F3E] dark:text-white sm:text-[28px]">{t.leaderboardTitle}</h2>
            <p className="mt-0.5 text-[13px] font-semibold leading-5 text-slate-500 dark:text-slate-400 sm:mt-1 sm:text-sm">{t.leaderboardDesc}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:w-auto sm:grid-cols-none sm:grid-flow-col">
          {([
            ["week", t.leaderboardWeek],
            ["all", t.leaderboardAll],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setPeriod(value)}
              className={cn("lp-chip min-h-10 justify-center", period === value && "is-active")}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <section className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4 lg:gap-4" aria-label="Statistics">
        <DashboardStatCard icon={Flame} value={String(you?.stats.subjectsReviewed ?? 0)} label={t.streak} tone="orange" />
        <DashboardStatCard icon={CheckCircle2} value={String(you?.stats.attempts ?? 0)} label={t.completed} tone="green" />
        <DashboardStatCard icon={BarChart3} value={`${you?.stats.averageAccuracy ?? 0}%`} label={t.accuracy} tone="blue" />
        <DashboardStatCard icon={Clock3} value={formatLearningDuration(you?.stats.totalDurationSeconds ?? 0)} label={t.studyTime} tone="violet" />
      </section>

      <div className="flex flex-col gap-3 rounded-[16px] border-2 border-[#E5E5E5] bg-white p-4 shadow-[0_3px_0_#DCDCDC] dark:border-white/10 dark:bg-slate-900 dark:shadow-[0_3px_0_rgba(0,0,0,0.35)] sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">{t.leaderboardYourRank}</p>
          <p className="mt-1 text-2xl font-black text-[#100F3E] dark:text-white">
            {yourRank ? `#${yourRank}` : t.leaderboardUnranked}
          </p>
          <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">
            {you ? `${you.points} ${t.points.toLowerCase()}` : `0 ${t.points.toLowerCase()}`}
          </p>
        </div>
        <p className="max-w-md text-[12px] font-semibold leading-5 text-slate-400 sm:text-right">{t.leaderboardFormula}</p>
      </div>

      {!visible ? (
        <div className="rounded-[14px] border-2 border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
          {t.leaderboardHidden}
        </div>
      ) : null}

      {ranked.length ? (
        <>
          <LeaderboardPodium ranked={ranked} youLabel={t.you} />
          <div className="space-y-2.5">
            <div className="hidden grid-cols-[48px_minmax(0,1.4fr)_repeat(4,minmax(0,0.8fr))_72px] gap-3 px-4 text-[11px] font-bold uppercase tracking-[0.06em] text-slate-400 lg:grid">
              <span>{t.rank}</span>
              <span>{t.learner}</span>
              <span className="text-right">{t.streak}</span>
              <span className="text-right">{t.completed}</span>
              <span className="text-right">{t.accuracy}</span>
              <span className="text-right">{t.studyTime}</span>
              <span className="text-right">{t.points}</span>
            </div>
            {ranked.map((entry) => (
              <LeaderboardRow key={entry.userId} entry={entry} youLabel={t.you} labels={{
                subjects: lang === "vi" ? "Môn" : "Subj",
                attempts: lang === "vi" ? "Lần" : "Tries",
                accuracy: "%",
                time: lang === "vi" ? "Phút" : "Min",
              }} />
            ))}
          </div>
        </>
      ) : (
        <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[16px] border-2 border-dashed border-slate-200 bg-white/70 p-8 text-center dark:border-white/10 dark:bg-slate-900/60">
          <Trophy className="h-12 w-12 text-slate-300 dark:text-slate-600" />
          <p className="mt-4 max-w-md text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">{t.leaderboardEmpty}</p>
        </div>
      )}
    </section>
  )
}

function LeaderboardPodium({
  ranked,
  youLabel,
}: {
  ranked: RankedLeaderboardEntry[]
  youLabel: string
}) {
  const first = ranked[0]
  const second = ranked[1]
  const third = ranked[2]
  if (!first) return null
  const slots = [
    { entry: first, place: 1 as const, height: "lg:min-h-[196px]", order: "sm:order-2" },
    { entry: second, place: 2 as const, height: "lg:min-h-[168px]", order: "sm:order-1" },
    { entry: third, place: 3 as const, height: "lg:min-h-[152px]", order: "sm:order-3" },
  ]
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:items-end">
      {slots.map((slot) => (
        <PodiumCard
          key={slot.place}
          entry={slot.entry}
          place={slot.place}
          heightClass={cn(slot.height, slot.order)}
          youLabel={youLabel}
        />
      ))}
    </div>
  )
}

function PodiumCard({
  entry,
  place,
  heightClass,
  youLabel,
}: {
  entry?: RankedLeaderboardEntry
  place: 1 | 2 | 3
  heightClass: string
  youLabel: string
}) {
  const tones = {
    1: "border-amber-200 bg-amber-50 text-amber-500 dark:border-amber-500/20 dark:bg-amber-500/10",
    2: "border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/5",
    3: "border-orange-200 bg-orange-50 text-orange-500 dark:border-orange-500/20 dark:bg-orange-500/10",
  }
  if (!entry) {
    return <div className={cn("hidden sm:block", heightClass)} />
  }
  return (
    <div className={cn(
      "flex flex-col items-center rounded-[16px] border-2 border-[#E5E5E5] bg-white p-4 text-center shadow-[0_3px_0_#DCDCDC] dark:border-white/10 dark:bg-slate-900 dark:shadow-[0_3px_0_rgba(0,0,0,0.35)]",
      heightClass,
      entry.isYou && "border-[#7DD3FC] shadow-[0_3px_0_#BAE6FD]",
    )}>
      <div className={cn("flex h-10 w-10 items-center justify-center rounded-[12px]", tones[place])}>
        {place === 1 ? <Trophy className="h-5 w-5" strokeWidth={2.2} /> : <Medal className="h-5 w-5" strokeWidth={2.2} />}
      </div>
      <div className="mt-3 flex h-12 w-12 items-center justify-center overflow-hidden rounded-[14px] bg-[#E8F7FE] text-[#1CB0F6]">
        {entry.avatarUrl ? <img src={entry.avatarUrl} alt="" className="h-12 w-12 object-cover" /> : <UserRound className="h-5 w-5" />}
      </div>
      <p className="mt-2 max-w-full truncate text-sm font-black text-[#100F3E] dark:text-white">{entry.name}</p>
      {entry.isYou ? <span className="mt-1 rounded-full bg-[#E8F7FE] px-2 py-0.5 text-[10px] font-black text-[#129BDC]">{youLabel}</span> : null}
      <p className="mt-2 text-lg font-black text-[#100F3E] dark:text-white">#{place}</p>
      <p className="text-xs font-bold text-slate-500">{entry.points}</p>
    </div>
  )
}

function LeaderboardRow({ entry, youLabel, labels }: { entry: RankedLeaderboardEntry; youLabel: string; labels: { subjects: string; attempts: string; accuracy: string; time: string } }) {
  return (
    <article
      className={cn(
        "rounded-[14px] border-2 border-[#E5E5E5] bg-white px-3.5 py-3 shadow-[0_3px_0_#DCDCDC] dark:border-white/10 dark:bg-slate-900 dark:shadow-[0_3px_0_rgba(0,0,0,0.35)] sm:px-4",
        entry.isYou && "border-[#7DD3FC] bg-[#F0FBFF] shadow-[0_3px_0_#BAE6FD] dark:bg-sky-500/10",
      )}
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 lg:grid-cols-[48px_minmax(0,1.4fr)_repeat(4,minmax(0,0.8fr))_72px]">
        <span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-slate-50 text-sm font-black text-[#100F3E] dark:bg-white/5 dark:text-white">
          {entry.rank}
        </span>
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[11px] bg-[#E8F7FE] text-[#1CB0F6]">
            {entry.avatarUrl ? <img src={entry.avatarUrl} alt="" className="h-9 w-9 object-cover" /> : <UserRound className="h-4 w-4" />}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-[#100F3E] dark:text-white">{entry.name}</p>
            {entry.isYou ? <p className="text-[11px] font-bold text-[#129BDC]">{youLabel}</p> : null}
          </div>
        </div>
        <p className="hidden text-right text-sm font-extrabold text-[#100F3E] dark:text-white lg:block">{entry.stats.subjectsReviewed}</p>
        <p className="hidden text-right text-sm font-extrabold text-[#100F3E] dark:text-white lg:block">{entry.stats.attempts}</p>
        <p className="hidden text-right text-sm font-extrabold text-[#100F3E] dark:text-white lg:block">{entry.stats.averageAccuracy}%</p>
        <p className="hidden text-right text-sm font-extrabold text-[#100F3E] dark:text-white lg:block">{formatLearningDuration(entry.stats.totalDurationSeconds)}</p>
        <p className="text-right text-sm font-black text-[#100F3E] dark:text-white">{entry.points}</p>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2 lg:hidden">
        <MiniStat value={String(entry.stats.subjectsReviewed)} label={labels.subjects} />
        <MiniStat value={String(entry.stats.attempts)} label={labels.attempts} />
        <MiniStat value={`${entry.stats.averageAccuracy}%`} label={labels.accuracy} />
        <MiniStat value={formatLearningDuration(entry.stats.totalDurationSeconds)} label={labels.time} />
      </div>
    </article>
  )
}

function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[10px] bg-[#F6F7FB] px-2 py-2 text-center dark:bg-white/5">
      <p className="text-sm font-black text-[#100F3E] dark:text-white">{value}</p>
      <p className="text-[10px] font-bold text-slate-400">{label}</p>
    </div>
  )
}
