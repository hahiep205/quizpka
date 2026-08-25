export function SecurityOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 p-6 backdrop-blur-sm">
      <div className="w-full max-w-[420px] rounded-[16px] border-2 border-white/20 bg-white p-6 text-center shadow-2xl dark:bg-slate-900">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-500/20">
          <span className="text-2xl">⚠</span>
        </div>
        <h2 className="lp-modal-title text-[20px]">Phát hiện Developer Tools</h2>
        <p className="lp-modal-desc mt-2">Vui lòng đóng Developer Tools để tiếp tục sử dụng hệ thống.</p>
        <button type="button" className="lp-btn lp-btn--primary lp-btn--sm mt-6" onClick={onClose}>
          Đã đóng - Tiếp tục
        </button>
      </div>
    </div>
  )
}
