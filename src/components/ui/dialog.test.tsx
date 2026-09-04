import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { Dialog } from "@/components/ui/dialog"

describe("Dialog", () => {
  it("portals the overlay to document.body instead of the render container", () => {
    const { container } = render(
      <div style={{ transform: "translateY(0)" }}>
        <Dialog open onClose={() => {}} title="Danh sách câu sai" closeLabel="Đóng" panelClassName="max-w-[720px]">
          <p>content</p>
        </Dialog>
      </div>
    )
    const dialog = screen.getByRole("dialog")
    expect(dialog.parentElement?.parentElement).toBe(document.body)
    expect(container.contains(dialog)).toBe(false)
  })

  it("renders nothing when closed", () => {
    const { container } = render(
      <Dialog open={false} onClose={() => {}} title="t" closeLabel="c" panelClassName="">
        <p>content</p>
      </Dialog>
    )
    expect(container.textContent).toBe("")
  })
})
