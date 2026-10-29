import { Client } from "@upstash/qstash";

let _client: Client | null = null;

function getClient(): Client {
  if (!_client) {
    _client = new Client({ token: process.env.QSTASH_TOKEN! });
  }
  return _client;
}

export async function publishDocProcessing(
  docId: string,
  userId: string,
): Promise<void> {
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/queue/process-doc`;
  await getClient().publishJSON({ url, body: { docId, userId } });
}

export async function publishResumeSummary(params: {
  userId: string;
  leavingActivityId: string | null;
  targetActivityId: string;
}): Promise<void> {
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/queue/resume-summary`;
  await getClient().publishJSON({ url, body: params });
}
