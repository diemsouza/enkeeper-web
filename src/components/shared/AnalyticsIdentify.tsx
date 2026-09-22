"use client";

import { useEffect } from "react";
import { setAnalyticsUserId } from "@/src/lib/analytics";

export function AnalyticsIdentify({ userId }: { userId: string }) {
  useEffect(() => {
    setAnalyticsUserId(userId);
  }, [userId]);

  return null;
}
