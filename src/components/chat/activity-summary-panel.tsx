import { buildMediaUrl } from "./map-messages";

export function ActivitySummaryPanel({
  summary,
  chartMediaPath,
}: {
  summary: string;
  chartMediaPath: string | null;
}) {
  return (
    <div className="border-b border-border bg-card p-4">
      <p className="whitespace-pre-wrap text-sm text-foreground">{summary}</p>
      {chartMediaPath && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={buildMediaUrl(chartMediaPath)}
          alt="Resumo de desempenho da atividade"
          className="mt-3 max-w-xs rounded-lg"
        />
      )}
    </div>
  );
}
