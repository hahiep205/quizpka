import { useEffect, useMemo, useState } from "react"
import { Crown, Medal, Trophy, UserRound } from "lucide-react"
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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-[#E8F7FE] text-[#1CB0F6] sm:h-14 sm:w-14 sm:rounded-[16px] dark:bg-sky-500/10">
            <Trophy className="h-5 w-5 sm:h-7 sm:w-7" />
          </div>
          <div className="min-w-0">
            <h2 className="text-[22px] font-black leading-7 tracking-[-0.03em] text-[#100F3E] sm:text-[28px] dark:text-white">{t.leaderboardTitle}</h2>
            <p className="mt-0.5 text-[13px] font-semibold leading-5 text-slate-500 sm:mt-1 sm:text-sm dark:text-slate-400">{t.leaderboardDesc}</p>
          </div>
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-1 rounded-[14px] border-2 border-[#E5E5E5] bg-white p-1.5 shadow-[0_3px_0_#DCDCDC] sm:w-[280px] dark:border-white/10 dark:bg-slate-900 dark:shadow-[0_3px_0_rgba(0,0,0,0.35)]" role="tablist" aria-label={t.leaderboardTitle}>
          {([
            ["week", t.leaderboardWeek],
            ["all", t.leaderboardAll],
          ] as const).map(([value, label]) => {
            const active = period === value
            return (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setPeriod(value)}
                className={cn(
                  "h-10 rounded-[10px] px-3 text-[13px] font-extrabold transition-all duration-200 sm:text-sm",
                  active
                    ? "bg-[#1CB0F6] text-white shadow-[0_2px_0_#189CD8]"
                    : "text-slate-400 hover:bg-slate-50 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-white/5 dark:hover:text-slate-300",
                )}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[20px] bg-gradient-to-br from-[#1CB0F6] via-[#1593d6] to-[#0B5ED7] p-5 text-white shadow-[0_4px_0_#0b6cb8] sm:p-6 dark:shadow-[0_4px_0_rgba(0,0,0,0.45)]">
        <div className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full bg-white/15" />
        <div className="pointer-events-none absolute -bottom-16 right-24 h-40 w-40 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -left-8 -bottom-10 h-28 w-28 rounded-full bg-white/10" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/80">{t.leaderboardYourRank}</p>
          <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
            <p className="text-4xl font-black leading-none tracking-tight sm:text-5xl">
              {yourRank ? `#${yourRank}` : t.leaderboardUnranked}
            </p>
            <div className="text-right">
              <p className="text-2xl font-black leading-none sm:text-3xl">{you ? you.points : 0}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wider text-white/80">{t.points}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-extrabold sm:text-xs">
            <span className="rounded-full bg-white/20 px-3 py-1.5 backdrop-blur-sm">{you?.stats.attempts ?? 0} {t.completed.toLowerCase()}</span>
            <span className="rounded-full bg-white/20 px-3 py-1.5 backdrop-blur-sm">{you?.stats.averageAccuracy ?? 0}% {t.accuracy.toLowerCase()}</span>
            <span className="rounded-full bg-white/20 px-3 py-1.5 backdrop-blur-sm">{formatLearningDuration(you?.stats.totalDurationSeconds ?? 0)} {t.studyTime.toLowerCase()}</span>
          </div>
        </div>
      </div>
      <p className="text-[12px] font-semibold leading-5 text-slate-400">{t.leaderboardFormula}</p>

      {!visible ? (
        <div className="rounded-[14px] border-2 border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
          {t.leaderboardHidden}
        </div>
      ) : null}

      {ranked.length ? (
        <>
          <LeaderboardPodium ranked={ranked} youLabel={t.you} />
          <div className="space-y-2.5">
            <div className="hidden grid-cols-[52px_minmax(0,1.4fr)_repeat(4,minmax(0,0.8fr))_76px] gap-3 px-4 text-[11px] font-bold uppercase tracking-[0.06em] text-slate-400 lg:grid">
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
        <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[20px] border-2 border-dashed border-slate-200 bg-white/70 p-8 text-center dark:border-white/10 dark:bg-slate-900/60">
          <span className="flex h-16 w-16 items-center justify-center rounded-[18px] bg-[#E8F7FE] text-[#1CB0F6] dark:bg-sky-500/10">
            <Trophy className="h-8 w-8" />
          </span>
          <p className="mt-4 max-w-md text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">{t.leaderboardEmpty}</p>
        </div>
      )}
    </section>
  )
}

const PODIUM_STYLE = {
  1: {
    bar: "bg-gradient-to-b from-amber-300 to-amber-500 dark:from-amber-400/90 dark:to-amber-600/90",
    ring: "ring-amber-300 dark:ring-amber-400/40",
    chip: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
    height: "h-32 sm:h-40 lg:h-44",
  },
  2: {
    bar: "bg-gradient-to-b from-slate-200 to-slate-400 dark:from-slate-500/80 dark:to-slate-700/80",
    ring: "ring-slate-200 dark:ring-slate-500/40",
    chip: "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300",
    height: "h-24 sm:h-32 lg:h-36",
  },
  3: {
    bar: "bg-gradient-to-b from-orange-300 to-orange-500 dark:from-orange-400/90 dark:to-orange-600/90",
    ring: "ring-orange-200 dark:ring-orange-400/40",
    chip: "bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300",
    height: "h-20 sm:h-24 lg:h-28",
  },
} as const

function LeaderboardPodium({
  ranked,
  youLabel,
}: {
  ranked: RankedLeaderboardEntry[]
  youLabel: string
}) {
  const slots = [ranked[1], ranked[0], ranked[2]].filter((e): e is RankedLeaderboardEntry => Boolean(e))
  if (!slots.length) return null
  return (
    <div className="rounded-[20px] border-2 border-[#E5E5E5] bg-white px-3 pb-5 pt-6 shadow-[0_4px_0_#DCDCDC] sm:px-6 dark:border-white/10 dark:bg-slate-900 dark:shadow-[0_4px_0_rgba(0,0,0,0.35)]">
      <div className="flex items-end justify-center gap-2 sm:gap-5">
        {slots.map((entry) => {
          const place = entry.rank <= 3 ? entry.rank as 1 | 2 | 3 : 2
          const style = PODIUM_STYLE[place]
          return (
            <div key={entry.userId} className="flex min-w-0 flex-1 flex-col items-center sm:max-w-[190px]">
              <div className={cn("relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-[#E8F7FE] ring-4 sm:h-14 sm:w-14 dark:bg-white/5", style.ring, entry.isYou && "ring-[#7DD3FC]")}>
                {entry.avatarUrl ? <img src={entry.avatarUrl} alt="" className="h-full w-full object-cover" /> : <UserRound className="h-5 w-5 text-[#1CB0F6] sm:h-6 sm:w-6" />}
              </div>
              <p className="mt-2 w-full truncate px-1 text-center text-[13px] font-black text-[#100F3E] sm:text-sm dark:text-white">
                {entry.name}
              </p>
              {entry.isYou
                ? <span className="mt-1 rounded-full bg-[#E8F7FE] px-2 py-0.5 text-[10px] font-black text-[#129BDC]">{youLabel}</span>
                : <span className={cn("mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black", style.chip)}>
                  {place === 1 ? <Crown className="h-3 w-3" /> : <Medal className="h-3 w-3" />}
                  #{place}
                </span>}
              <p className="mt-1 text-xs font-extrabold text-slate-500 sm:text-sm dark:text-slate-400">{entry.points}</p>
              <div className={cn("mt-2 flex w-full items-start justify-center rounded-t-[14px] pt-2 text-2xl font-black text-white/95 sm:text-3xl", style.bar, style.height)}>
                {place}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function LeaderboardRow({ entry, youLabel, labels }: { entry: RankedLeaderboardEntry; youLabel: string; labels: { subjects: string; attempts: string; accuracy: string; time: string } }) {
  const rankTone = entry.rank === 1
    ? "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300"
    : entry.rank === 2
      ? "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300"
      : entry.rank === 3
        ? "bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300"
        : "bg-slate-50 text-[#100F3E] dark:bg-white/5 dark:text-white"
  return (
    <article
      className={cn(
        "rounded-[14px] border-2 border-[#E5E5E5] bg-white px-3.5 py-3 shadow-[0_3px_0_#DCDCDC] transition-all hover:-translate-y-px sm:px-4 dark:border-white/10 dark:bg-slate-900 dark:shadow-[0_3px_0_rgba(0,0,0,0.35)]",
        entry.isYou && "border-[#7DD3FC] bg-[#F0FBFF] shadow-[0_3px_0_#BAE6FD] dark:bg-sky-500/10",
      )}
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 lg:grid-cols-[52px_minmax(0,1.4fr)_repeat(4,minmax(0,0.8fr))_76px]">
        <span className={cn("flex h-9 w-9 items-center justify-center rounded-[11px] text-sm font-black lg:h-10 lg:w-10", rankTone)}>
          {entry.rank}
        </span>
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[11px] bg-[#E8F7FE] text-[#1CB0F6] lg:h-10 lg:w-10">
            {entry.avatarUrl ? <img src={entry.avatarUrl} alt="" className="h-9 w-9 object-cover lg:h-10 lg:w-10" /> : <UserRound className="h-4 w-4" />}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-[#100F3E] dark:text-white">{entry.name}</p>
            {entry.isYou ? <p className="text-[11px] font-bold text-[#129BDC]">{youLabel}</p> : null}
          </div>
        </div>
        <p className="hidden text-right text-sm font-extrabold text-[#100F3E] lg:block dark:text-white">{entry.stats.subjectsReviewed}</p>
        <p className="hidden text-right text-sm font-extrabold text-[#100F3E] lg:block dark:text-white">{entry.stats.attempts}</p>
        <p className="hidden text-right text-sm font-extrabold text-[#100F3E] lg:block dark:text-white">{entry.stats.averageAccuracy}%</p>
        <p className="hidden text-right text-sm font-extrabold text-[#100F3E] lg:block dark:text-white">{formatLearningDuration(entry.stats.totalDurationSeconds)}</p>
        <p className="text-right text-sm font-black text-[#1CB0F6] lg:text-[#100F3E] lg:dark:text-white">{entry.points}</p>
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
      <p className="truncate text-sm font-black text-[#100F3E] dark:text-white">{value}</p>
      <p className="truncate text-[10px] font-bold text-slate-400">{label}</p>
    </div>
  )
}
