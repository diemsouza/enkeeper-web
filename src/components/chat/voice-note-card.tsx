const VOICE_WAVEFORM = [
  6, 12, 18, 10, 22, 14, 8, 20, 12, 16, 9, 24, 13, 7, 19, 11, 15, 8, 21, 10, 6,
  14, 20, 9, 17, 23, 11, 15, 8, 19, 12, 21, 10, 16, 7, 18, 13, 22,
];

export function VoiceNoteCard({ duration }: { duration: string }) {
  return (
    <div className="flex items-center gap-2.5 py-1 min-w-[240px]">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="w-8 h-8 shrink-0 text-gray-500 dark:text-gray-600"
      >
        <path d="M8 5v14l11-7z" />
      </svg>
      <div className="flex-1 relative min-w-0">
        <div className="flex items-center gap-[2px] h-6 w-full overflow-hidden">
          <div className="w-2 h-2 rounded-full bg-current shrink-0" />
          {VOICE_WAVEFORM.map((h, i) => (
            <div
              key={i}
              className="w-[3px] rounded-full bg-current opacity-40 shrink-0"
              style={{ height: `${h}px` }}
            />
          ))}
        </div>
        <span className="absolute left-0 top-full mt-0.5 text-[10px] opacity-60">
          {duration}
        </span>
      </div>
      <div className="relative shrink-0">
        <div className="w-9 h-9 rounded-full bg-gray-500 dark:bg-gray-600 flex items-center justify-center">
          <span className="text-white font-bold text-sm">F</span>
        </div>
        <div className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full bg-gray-400 dark:bg-gray-500 flex items-center justify-center ring-2 ring-[#EBE5DC] dark:ring-[#0B141A]">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="white"
            className="w-3 h-3"
          >
            <path d="M12 14a3 3 0 003-3V5a3 3 0 10-6 0v6a3 3 0 003 3z" />
            <path d="M17 11a1 1 0 10-2 0 3 3 0 01-6 0 1 1 0 10-2 0 5 5 0 004 4.9V18H9a1 1 0 100 2h6a1 1 0 100-2h-2v-2.1a5 5 0 004-4.9z" />
          </svg>
        </div>
      </div>
    </div>
  );
}
