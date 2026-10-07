import { R2_SRC_ASSET_BASE } from "@/lib/mediaUrl"

const stampUrls = ["Liet", "Kem", "Qua", "Tam", "Kha", "Perfect"].map(
  (name) => `${R2_SRC_ASSET_BASE}/${name}.webp`,
)

export function getStampSrc(score: number): string {
  if (score < 1) return stampUrls[0]
  if (score < 4) return stampUrls[1]
  if (score < 5) return stampUrls[2]
  if (score < 6.5) return stampUrls[3]
  if (score < 8.5) return stampUrls[4]
  return stampUrls[5]
}

export function ResultStamp({ score }: { score: number }) {
  const src = getStampSrc(score)
  const alt =
    score < 1
      ? "Liệt"
      : score < 4
        ? "Kém"
        : score < 5
          ? "Qua môn"
          : score < 6.5
            ? "Trung bình"
            : score < 8.5
              ? "Khá"
              : "Perfect"
  return (
    <img
      src={src}
      alt={alt}
      draggable={false}
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 top-1/2 z-10 w-[150px] -translate-x-1/2 -translate-y-1/2 rotate-[-12deg] opacity-90 drop-shadow-md sm:w-[180px] lg:w-[220px]"
    />
  )
}
