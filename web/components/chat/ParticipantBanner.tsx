import clsx from 'clsx';

export function ParticipantBanner({
  state,
  agentName,
}: {
  state: 'ai' | 'human' | 'closed';
  agentName?: string;
}) {
  const bg =
    state === 'ai'
      ? 'bg-primary-subtle'
      : state === 'human'
        ? 'bg-info-bg'
        : 'bg-bg-sunken';

  const text =
    state === 'ai'
      ? 'You are speaking with ROAR AI'
      : state === 'human'
        ? `Agent ${agentName ?? ''} has joined the conversation`.trim()
        : 'This conversation has been closed';

  return (
    <div
      className={clsx(
        'flex h-10 w-full items-center gap-2 px-4 text-[13px] font-medium text-text-secondary transition-colors duration-normal',
        bg
      )}
    >
      <span aria-hidden>{state === 'ai' ? '🤖' : state === 'human' ? '👤' : '⛔'}</span>
      <span>{text}</span>
    </div>
  );
}
