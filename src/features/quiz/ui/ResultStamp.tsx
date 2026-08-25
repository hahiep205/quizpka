import liet from "@/assets/Liet.png"
import kem from "@/assets/Kem.png"
import qua from "@/assets/Qua.png"
import tam from "@/assets/Tam.png"
import kha from "@/assets/Kha.png"
import perfect from "@/assets/Perfect.png"

export function getStampSrc(score: number): string {
  if (score < 1) return liet
  if (score < 4) return kem
  if (score < 5) return qua
  if (score < 6.5) return tam
  if (score < 8.5) return kha
  return perfect
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
