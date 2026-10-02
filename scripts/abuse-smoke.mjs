/*
 * P6 approved-window smoke test. Run only against staging or with explicit
 * authorization. It intentionally sends low-volume malformed requests and
 * checks that the edge rejects them before application work.
 */
const baseUrl = process.env.SUPABASE_FUNCTIONS_URL
const token = process.env.QUIZPKA_TEST_TOKEN
const mode = process.env.ABUSE_TEST_APPROVED
const sessionId = process.env.QUIZPKA_TEST_SESSION_ID

if (mode !== "1") {
  console.error("Set ABUSE_TEST_APPROVED=1 for an approved test window.")
  process.exit(2)
}
if (!baseUrl || !token) {
  console.error("SUPABASE_FUNCTIONS_URL and QUIZPKA_TEST_TOKEN are required.")
  process.exit(2)
}

const cases = [
  ["submit-quiz-session", "{".repeat(70_000)],
  ["get-paid-document", JSON.stringify({ subjectId: "invalid", documentId: "invalid" })],
  ["get-paid-question-bank", JSON.stringify({ subjectId: "invalid", examId: "invalid" })],
]

async function request(name, body) {
  const response = await fetch(`${baseUrl}/${name}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body,
  })
  return { status: response.status, text: (await response.text()).slice(0, 160) }
}

for (const [name, body] of cases) {
  const result = await request(name, body)
  console.log(`${name}: ${result.status} ${result.text}`)
}

if (sessionId) {
  const submitBody = JSON.stringify({ sessionId, answers: {}, idempotencyKey: crypto.randomUUID() })
  const results = await Promise.all(Array.from({ length: 10 }, () => request("submit-quiz-session", submitBody)))
  console.log(`submit-concurrency: ${results.map((result) => result.status).join(",")}`)
}
