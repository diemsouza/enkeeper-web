"use client";

import { useEffect } from "react";
import { setUserId } from "@/src/lib/analytics";

export function AnalyticsIdentify({ userId }: { userId: string }) {
  useEffect(() => {
    setUserId(userId);
  }, [userId]);

  return null;
}
