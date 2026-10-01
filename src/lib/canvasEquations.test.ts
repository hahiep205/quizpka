import { describe, expect, it } from "vitest"
import { decodeHtmlEntities, replaceCanvasEquationImages } from "@/lib/canvasEquations"

describe("replaceCanvasEquationImages", () => {
  it("converts a headless Canvas tail in a prompt to inline TeX", () => {
    const input =
      "mô tả bằng hàm mũ có dạng: \\(Y=A\\cdot B^X\\), 0)\" src=\"https://canvas.phenikaa-uni.edu.vn/equation_images/(A%252CB%253E0)?scale=1\" alt=\"LaTeX: (A,B>0)\" data-equation-content=\"(A,B&gt;0)\" data-ignore-a11y-check=\"\"> (1) Trong đó:"
    expect(replaceCanvasEquationImages(input)).toBe(
      "mô tả bằng hàm mũ có dạng: \\(Y=A\\cdot B^X\\), \\((A,B>0)\\) (1) Trong đó:"
    )
  })

  it("converts a tail inside an option, keeping raw comparators", () => {
    const input =
      "Hệ số tương quan tuyến tính r\\:>-1\" src=\"https://canvas.phenikaa-uni.edu.vn/equation_images/-0.95%253Er%255C%253A%253E-1?scale=1\" alt=\"LaTeX: -0.95>r\\:>-1\" data-equation-content=\"-0.95>r\\:>-1\" data-ignore-a11y-check=\"\">"
    expect(replaceCanvasEquationImages(input)).toBe(
      "Hệ số tương quan tuyến tính \\(-0.95>r\\:>-1\\)"
    )
  })

  it("converts a full img tag, preferring data-equation-content", () => {
    const input = "Cho <img class=\"equation_image\" src=\"https://canvas.phenikaa-uni.edu.vn/equation_images/x?scale=1\" alt=\"LaTeX: x\" data-equation-content=\"x&gt;0\" />. Tính tiếp."
    expect(replaceCanvasEquationImages(input)).toBe("Cho \\(x>0\\). Tính tiếp.")
  })

  it("leaves non-equation images untouched", () => {
    expect(replaceCanvasEquationImages('Xem <img src="https://x/y.png"> nhé.')).toBe('Xem <img src="https://x/y.png"> nhé.')
    expect(replaceCanvasEquationImages('Xem <img src="https://x/y.png" alt="Đồ thị"> nhé.')).toBe('Xem <img src="https://x/y.png" alt="Đồ thị"> nhé.')
  })

  it("leaves legitimate quoted text untouched and is idempotent", () => {
    const plain = 'Đáp án "A" là đúng.'
    expect(replaceCanvasEquationImages(plain)).toBe(plain)
    const once = replaceCanvasEquationImages("a b, 0)\" src=\"https://c/equation_images/q\" alt=\"LaTeX: q\" data-equation-content=\"q\"> c")
    expect(once).toBe("a b, \\(q\\) c")
    expect(replaceCanvasEquationImages(once)).toBe(once)
  })

  it("decodes entities once", () => {
    expect(decodeHtmlEntities("(A,B&gt;0) &amp; C&#39;s")).toBe("(A,B>0) & C's")
  })
})
