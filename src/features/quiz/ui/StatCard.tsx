export function StatCard({ label, value }: { label: string; value: string }) {
  return (<div className="flex min-h-[96px] flex-col items-center justify-center rounded-[12px] border-2 border-[#E5E5E5] bg-[#F6F7FB] px-4 py-4 text-center dark:border-white/10 dark:bg-white/5"><p className="lp-label text-[12px]">{label}</p><p className="mt-1 text-[22px] font-extrabold tracking-[-0.03em] text-[#100F3E] dark:text-white">{value}</p></div>)
}
