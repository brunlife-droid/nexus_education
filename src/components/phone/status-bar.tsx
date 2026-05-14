export function StatusBar() {
  return (
    <div className="flex h-11 shrink-0 items-center justify-between px-6 pt-3 text-[13px] font-semibold">
      <span>9:41</span>
      <div className="flex items-center gap-1.5 text-[11px]">
        <span>●●●</span>
        <span className="ml-1">5G</span>
        <div className="relative ml-1 h-[11px] w-[22px] rounded-[3px] border-[1.5px] border-current">
          <div className="absolute inset-px w-[14px] rounded-sm bg-current" />
        </div>
      </div>
    </div>
  );
}
