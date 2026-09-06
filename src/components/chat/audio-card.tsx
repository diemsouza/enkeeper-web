export function AudioCard({
  audioUrl,
  externalId,
  onPlay,
}: {
  audioUrl: string;
  textFallback?: string;
  externalId?: string;
  onPlay?: (externalId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1 py-1 min-w-[220px]">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shrink-0">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="white"
            className="w-4 h-4"
          >
            <path d="M12 14a3 3 0 003-3V5a3 3 0 10-6 0v6a3 3 0 003 3z" />
            <path d="M17 11a1 1 0 10-2 0 3 3 0 01-6 0 1 1 0 10-2 0 5 5 0 004 4.9V18H9a1 1 0 100 2h6a1 1 0 100-2h-2v-2.1a5 5 0 004-4.9z" />
          </svg>
        </div>
        <audio
          controls
          src={audioUrl}
          className="h-8 flex-1"
          onPlay={() => externalId && onPlay?.(externalId)}
        />
      </div>
    </div>
  );
}
