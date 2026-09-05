import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const json = (body: unknown, status = 200) => Response.json(body, { status })

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405)
  const authorization = req.headers.get("Authorization") ?? ""
  if (authorization !== `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`) return json({ error: "Unauthorized" }, 401)

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
  const { data: jobs, error: listError } = await admin
    .from("attempt_submission_outbox")
    .select("id,session_id,payload,attempts")
    .eq("status", "pending")
    .lte("next_retry_at", new Date().toISOString())
    .order("created_at")
    .limit(25)
  if (listError) return json({ error: "Unable to read outbox" }, 500)

  let completed = 0
  let failed = 0
  for (const job of jobs ?? []) {
    const { data: claimed } = await admin
      .from("attempt_submission_outbox")
      .update({ status: "processing", locked_at: new Date().toISOString(), attempts: job.attempts + 1, updated_at: new Date().toISOString() })
      .eq("id", job.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle()
    if (!claimed) continue
    try {
      const { data: questions, error: questionsError } = await admin.from("quiz_session_questions").select("question_id,correct_index,accepted_answers").eq("session_id", job.session_id)
      if (questionsError) throw questionsError
      const answers = job.payload?.answers && typeof job.payload.answers === "object" ? job.payload.answers as Record<string, unknown> : {}
      let correct = 0
      for (const question of questions ?? []) {
        const answer = answers[question.question_id]
        if (question.correct_index !== null ? Number.isInteger(answer) && answer === question.correct_index : typeof answer === "string" && question.accepted_answers.includes(answer.trim().toLowerCase())) correct += 1
      }
      const total = questions?.length ?? 0
      if (!total) throw new Error("Session has no questions")
      const accuracy = Math.round((correct / total) * 100)
      const score = Math.round((correct / total) * 100) / 10
      const { error: recordError } = await admin.rpc("record_verified_attempt", { p_session_id: job.session_id, p_correct: correct, p_total: total, p_duration_seconds: 0, p_score: score, p_accuracy: accuracy, p_result: { sessionId: job.session_id, correct, total, accuracy, score, source: "outbox" } })
      if (recordError) throw recordError
      const { error: completeError } = await admin.from("attempt_submission_outbox").update({ status: "completed", completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", job.id)
      if (completeError) throw completeError
      completed += 1
    } catch (error) {
      const attempts = job.attempts + 1
      const terminal = attempts >= 5
      await admin.from("attempt_submission_outbox").update({ status: terminal ? "failed" : "pending", next_retry_at: new Date(Date.now() + Math.min(6 * 60 * 60 * 1000, 60_000 * 2 ** attempts)).toISOString(), last_error: error instanceof Error ? error.message : "Unknown error", updated_at: new Date().toISOString() }).eq("id", job.id)
      failed += 1
    }
  }
  return json({ completed, failed })
})
