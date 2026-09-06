"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { postJson } from "@/src/lib/api-client";

export function ResumeActivityButton({ activityId }: { activityId: string }) {
  const router = useRouter();
  const [resuming, setResuming] = useState(false);

  async function handleResume() {
    setResuming(true);
    const { ok } = await postJson(`/api/app/activities/${activityId}/resume`, {});
    if (ok) {
      router.push("/app");
      router.refresh();
      return;
    }
    setResuming(false);
  }

  return (
    <Button
      variant="outline"
      className="h-9"
      disabled={resuming}
      onClick={handleResume}
    >
      <RotateCcw className="h-4 w-4" />
      Retomar esta atividade
    </Button>
  );
}
