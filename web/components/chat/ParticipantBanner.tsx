import clsx from 'clsx';

function BackArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
      <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ParticipantBanner({
  state,
  agentName,
  onBack,
}: {
  state: 'ai' | 'human' | 'closed';
  agentName?: string;
  onBack?: () => void;
}) {
  const bg =
    state === 'ai'
      ? 'bg-primary-subtle border-b border-primary-border'
      : state === 'human'
        ? 'bg-info-bg border-b border-border-default'
        : 'bg-warning-bg border-b border-border-default';

  const text =
    state === 'ai'
      ? 'RAI is handling this conversation'
      : state === 'human'
        ? `Agent ${agentName ?? ''} has joined this conversation`.trim()
        : 'Conversation closed';

  return (
    <div
      className={clsx(
        'flex h-10 w-full items-center px-3 text-[13px] font-medium text-text-secondary transition-colors duration-normal',
        bg
      )}
    >
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 rounded-btn px-2 py-1 text-[12px] font-semibold text-text-secondary transition-colors hover:bg-bg-surface/60 hover:text-text-primary"
        >
          <BackArrowIcon />
          <span>Back to cases</span>
        </button>
      ) : null}

      <div className="ml-auto inline-flex items-center gap-2 text-right">
        <span
          className={clsx(
            'h-2.5 w-2.5 rounded-pill',
            state === 'closed'
              ? 'bg-danger shadow-[0_0_0_4px_rgba(219,95,95,0.18),0_0_12px_rgba(219,95,95,0.45)]'
              : state === 'human'
                ? 'bg-success shadow-[0_0_0_4px_rgba(125,193,66,0.18),0_0_12px_rgba(125,193,66,0.45)]'
                : 'bg-warning shadow-[0_0_0_4px_rgba(245,158,11,0.2),0_0_12px_rgba(245,158,11,0.45)]'
          )}
          aria-hidden
        />
        <span>{text}</span>
      </div>
    </div>
  );
}
