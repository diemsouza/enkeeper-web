type AnalyticsEvent = {
  action: string;
  category?: string;
  label?: string;
  value?: number;
};

export const logEvent = ({
  action,
  category,
  label,
  value,
}: AnalyticsEvent): void => {
  if (typeof window === "undefined") return;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: action,
    event_category: category,
    event_label: label,
    value: value,
  });
};
