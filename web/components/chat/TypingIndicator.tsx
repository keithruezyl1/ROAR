export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1" aria-label="Typing">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`h-2 w-2 rounded-pill bg-border-strong animate-[roar-dot_600ms_ease-in-out_infinite]`}
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
      <style jsx global>{`
        @keyframes roar-dot {
          0%, 100% { opacity: 0.25; }
          50% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-\[roar-dot_600ms_ease-in-out_infinite\] { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
