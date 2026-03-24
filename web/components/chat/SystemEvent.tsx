export function SystemEvent({ text }: { text: string }) {
  return (
    <div className="my-2 flex justify-center">
      <div className="rounded-pill bg-transparent px-3 py-[3px] text-[11px] font-medium text-text-muted">
        {text}
      </div>
    </div>
  );
}
