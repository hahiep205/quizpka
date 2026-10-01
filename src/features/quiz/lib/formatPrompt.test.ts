import { describe, expect, it } from "vitest"
import { formatPromptText } from "@/features/quiz/lib/formatPrompt"

describe("formatPromptText", () => {
  it("breaks before Lưu ý and Ví dụ markers", () => {
    const input = "Y=bX. Hãy tính hệ số xác định R2 của mô hình. Lưu ý: Kết quả được làm tròn đến 2 số thập phân. Ví dụ: - Nếu kết quả là 1 thì ghi là 1.00"
    expect(formatPromptText(input)).toBe(
      "Y=bX. Hãy tính hệ số xác định R2 của mô hình.\n\nLưu ý: Kết quả được làm tròn đến 2 số thập phân.\n\nVí dụ: - Nếu kết quả là 1 thì ghi là 1.00"
    )
  })

  it("is idempotent and collapses excess blank lines", () => {
    const once = formatPromptText("Tính R2. Lưu ý: làm tròn 2 số.")
    expect(formatPromptText(once)).toBe(once)
    expect(formatPromptText("Tính R2.\n\n\nLưu ý: làm tròn.")).toBe("Tính R2.\n\nLưu ý: làm tròn.")
  })

  it("leaves prompts without markers untouched", () => {
    expect(formatPromptText("Chọn đáp án đúng.")).toBe("Chọn đáp án đúng.")
    expect(formatPromptText("")).toBe("")
  })

  it("structures a stats word problem: defs, table, task, sub-tasks", () => {
    const input =
      "Mô hình có dạng: \\(Y=A\\cdot B^X\\) , \\((A,B>0)\\) (1) Trong đó: \\(Y\\) là số lượng. Khi đó phương trình (1) trở thành: \\(y=a + bx\\) (2) trong đó \\(a=\\ln A\\) hay \\(A=e^{a}\\). Số liệu thu thập được như bảng sau: STT Thời gian Số lượng 1 1 607 2 2 617 3 3 637 Dựa vào bảng số liệu này, bạn hãy xác định Các tham số A và B của mô hình tuyến tính: \\(a=\\) . Kết quả được làm tròn đến 3 chữ số thập phân. Hệ số xác định của mô hình (2): R2= . Các tham số a và b của mô hình (1): A = (làm tròn) B = (làm tròn)"
    expect(formatPromptText(input)).toBe(
      "Mô hình có dạng: \\(Y=A\\cdot B^X\\) , \\((A,B>0)\\) (1)\n\nTrong đó: \\(Y\\) là số lượng.\n\nKhi đó phương trình (1) trở thành: \\(y=a + bx\\) (2) trong đó \\(a=\\ln A\\) hay \\(A=e^{a}\\).\n\nSố liệu thu thập được như bảng sau:\n\nSTT | Thời gian Số lượng\n1 | 1 | 607\n2 | 2 | 617\n3 | 3 | 637\n\nDựa vào bảng số liệu này, bạn hãy xác định Các tham số A và B của mô hình tuyến tính:\n\n\\(a=\\) .\n\nKết quả được làm tròn đến 3 chữ số thập phân.\n\nHệ số xác định của mô hình (2):\n\nR2= .\n\nCác tham số a và b của mô hình (1):\n\nA = (làm tròn)\n\nB = (làm tròn)"
    )
  })

  it("does not mistake a plain number list for an STT table", () => {
    expect(formatPromptText("Nhập STT 1 2 3 của bạn.")).toBe("Nhập STT 1 2 3 của bạn.")
    expect(formatPromptText("Cho dãy 5 10 15, tính trung bình.")).toBe("Cho dãy 5 10 15, tính trung bình.")
  })
})
