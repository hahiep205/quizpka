import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { MathText, renderMathHtml } from "@/components/MathText"

describe("renderMathHtml", () => {
  it("returns plain text unchanged when no math delimiters are present", () => {
    expect(renderMathHtml("Trung vị của tập dữ liệu là bao nhiêu?")).toBe("Trung vị của tập dữ liệu là bao nhiêu?")
  })

  it("renders inline \\(...\\) segments with KaTeX", () => {
    const html = renderMathHtml("Độ lệch chuẩn \\(\\bar x\\) của tập")
    expect(html).toContain("katex")
    expect(html).not.toContain("\\(")
    expect(html).toContain("Độ lệch chuẩn")
  })

  it("renders complex fractions and sums without throwing", () => {
    const tex = "\\(b=\\frac{{N\\sum\\limits_{i = 1}^N {{x_i}{y_i}} - \\sum\\limits_{i = 1}^N {{x_i}} \\sum\\limits_{i = 1}^N {{y_i}} }}{{N\\sum\\limits_{i = 1}^N {x_i^2} - {{\\left( {\\sum\\limits_{i = 1}^N {{x_i}} } \\right)}^2}}}\\)"
    const html = renderMathHtml(tex)
    expect(html).toContain("katex")
    expect(html).not.toContain("katex-error")
  })

  it("escapes HTML in plain text segments", () => {
    const html = renderMathHtml('<script>alert("x")</script> và \\(x\\)')
    expect(html).not.toContain("<script>")
    expect(html).toContain("&lt;script&gt;")
    expect(html).toContain("katex")
  })
})

describe("MathText", () => {
  it("renders prompt text with rendered math", () => {
    render(<MathText text="Công thức \\(x_{t+1} = x_t - \\eta f'(x_t)\\) đúng" />)
    expect(screen.getByText("Công thức", { exact: false }).innerHTML).toContain("katex")
  })
})
