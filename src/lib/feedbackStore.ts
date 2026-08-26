export type FeedbackItem = {
  id: string
  title: string
  content: string
  email: string
  type: "Contribute" | "Support" | "Feedback"
  lang: "en" | "vi"
  createdAt: string // ISO
}

const STORAGE_KEY = "quizpka-feedbacks"

function readRaw(): FeedbackItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as FeedbackItem[]
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

export function getFeedbacks(): FeedbackItem[] {
  const list = readRaw()
  // newest first
  return [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export function addFeedback(item: Omit<FeedbackItem, "id" | "createdAt"> & { id?: string; createdAt?: string }): FeedbackItem {
  const now = new Date().toISOString()
  const newItem: FeedbackItem = {
    id: item.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: item.title,
    content: item.content,
    email: item.email,
    type: item.type,
    lang: item.lang,
    createdAt: item.createdAt ?? now,
  }
  try {
    const current = readRaw()
    current.push(newItem)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
    // also dispatch event for same-tab listeners
    window.dispatchEvent(new CustomEvent("quizpka-feedbacks-updated"))
  } catch {}
  return newItem
}

export function clearFeedbacks() {
  try {
    localStorage.removeItem(STORAGE_KEY)
    window.dispatchEvent(new CustomEvent("quizpka-feedbacks-updated"))
  } catch {}
}

export function seedDemoIfEmpty() {
  try {
    const existing = readRaw()
    if (existing.length > 0) return
    const demo: FeedbackItem[] = [
      {
        id: "demo-1",
        title: "Đóng góp: Tài liệu Kinh tế vi mô 2024",
        content: "Mình có bộ đề 120 câu Kinh tế vi mô có đáp án, muốn đóng góp cho QuizPKA. Liên hệ mình qua mail nhé!",
        email: "contributor@quizpka.com",
        type: "Contribute",
        lang: "vi",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
      },
      {
        id: "demo-2",
        title: "Góp ý về giao diện Part 7",
        content: "Part 7 các nhóm 11-15 đã hiện passage rất rõ, nhưng mình mong có thêm highlight cho từ khóa trong câu hỏi.",
        email: "demo@quizpka.com",
        type: "Support",
        lang: "vi",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      },
      {
        id: "demo-3",
        title: "Đề xuất thêm giải thích audio",
        content: "Phần Listening Part 3, 4 nếu có transcript trong Phân tích chi tiết thì tuyệt vời!",
        email: "student@quizpka.com",
        type: "Support",
        lang: "vi",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      },
    ]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(demo))
  } catch {}
}
