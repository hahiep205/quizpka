import { describe, expect, it } from "vitest"
import type { Question } from "@/features/quiz/model/quiz.types"
import { classifyToeicQuestion } from "@/features/quiz/lib/toeicCategories"

function q(overrides: Partial<Question>): Question {
  return { id: "q1", prompt: "?", options: [], ...overrides }
}

describe("TOEIC question classifier", () => {
  it("classifies Part 1 photographs into action or state", () => {
    const action = q({ partTitle: "Listening - Part 1 - Q1", options: ["A", "He is typing on a computer keyboard.", "C", "D"], correctIndex: 1 })
    expect(classifyToeicQuestion(action)).toBe("action")
    const state = q({ partTitle: "Listening - Part 1 - Q3", options: ["A", "B", "Some documents are stacked on the desk.", "D"], correctIndex: 2 })
    expect(classifyToeicQuestion(state)).toBe("state")
    const mounted = q({ partTitle: "Listening - Part 1 - Q5", options: ["Artwork has been mounted on the wall."], correctIndex: 0 })
    expect(classifyToeicQuestion(mounted)).toBe("state")
  })

  it("classifies Part 2 as question response", () => {
    expect(classifyToeicQuestion(q({ partTitle: "Listening - Part 2 - Q7", questionType: "question_response" }))).toBe("question_response")
  })

  it("maps Part 5 grammar points", () => {
    expect(classifyToeicQuestion(q({ partTitle: "Reading - Part 5 - Q1", grammarPoint: "Adverb modifying verb (Part of Speech)" }))).toBe("part_of_speech")
    expect(classifyToeicQuestion(q({ partTitle: "Reading - Part 5 - Q2", grammarPoint: "Collocation / Vocabulary" }))).toBe("vocabulary")
    expect(classifyToeicQuestion(q({ partTitle: "Reading - Part 5 - Q5", grammarPoint: "Present Perfect with 'since'" }))).toBe("tense")
    expect(classifyToeicQuestion(q({ partTitle: "Reading - Part 5 - Q9", grammarPoint: "Reduced relative clause (Passive participle)" }))).toBe("participle")
    expect(classifyToeicQuestion(q({ partTitle: "Reading - Part 5 - Q11", grammarPoint: "Preposition of time (within)" }))).toBe("preposition")
    expect(classifyToeicQuestion(q({ partTitle: "Reading - Part 5 - Q18", grammarPoint: "Quantifier / Determiner (Each of)" }))).toBe("pronoun")
    expect(classifyToeicQuestion(q({ partTitle: "Reading - Part 5 - Q13", grammarPoint: "Conditional conjunction (Unless)" }))).toBe("conjunction")
  })

  it("maps Part 6 sentence insertion and relative clauses", () => {
    expect(classifyToeicQuestion(q({ partTitle: "Reading - Part 6 - Group 1", questionType: "sentence_insertion", grammarPoint: "Sentence Insertion / Cohesion" }))).toBe("sentence_insertion")
    expect(classifyToeicQuestion(q({ partTitle: "Reading - Part 6 - Group 3", grammarPoint: "Relative Clause / Possessive Relative Pronoun" }))).toBe("relative_clause")
  })

  it("classifies Part 7 keyword questions", () => {
    const mk = (prompt: string) => q({ partTitle: "Reading - Part 7 - Group 1", prompt, options: ["A", "B", "C", "D"] })
    expect(classifyToeicQuestion(mk("Why did Mark contact Sarah?"))).toBe("purpose")
    expect(classifyToeicQuestion(mk("Why are corporate employers preferring short-term leases?"))).toBe("reason")
    expect(classifyToeicQuestion(mk("When will the CRM database be offline?"))).toBe("time")
    expect(classifyToeicQuestion(mk("Where is Skyline Eco-Lodge located?"))).toBe("location")
    expect(classifyToeicQuestion(mk("Who should employees contact if they encounter technical issues?"))).toBe("subject")
    expect(classifyToeicQuestion(mk("What is the main topic of the email?"))).toBe("main_idea")
    expect(classifyToeicQuestion(mk("What will the man probably do next?"))).toBe("next_action")
    expect(classifyToeicQuestion(mk("In which position does the following sentence best belong?"))).toBe("sentence_insertion")
    expect(classifyToeicQuestion(mk("What does the graphic show?"))).toBe("graphic")
    expect(classifyToeicQuestion(mk("What is the man's name?"))).toBe("detail")
  })
})
