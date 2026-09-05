import { Component, type ErrorInfo, type ReactNode } from "react"

type Props = { children: ReactNode }
type State = { hasError: boolean }

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled application error", error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return <main className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-3 px-6 text-center"><h1 className="text-xl font-semibold">Đã xảy ra lỗi</h1><p className="text-sm text-slate-500">Vui lòng tải lại trang để tiếp tục.</p><button type="button" className="lp-btn lp-btn--primary" onClick={() => window.location.reload()}>Tải lại</button></main>
  }
}
