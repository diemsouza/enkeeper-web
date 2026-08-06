type StorageConfig = { url: string; serviceKey: string; bucket: string };

function getStorageConfig(): StorageConfig {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  const bucket = process.env.AUDIO_STORAGE_BUCKET;

  if (!url || !serviceKey || !bucket) {
    throw new Error(
      "SUPABASE_URL, SUPABASE_SERVICE_KEY ou AUDIO_STORAGE_BUCKET não configurados"
    );
  }

  return { url, serviceKey, bucket };
}

export async function uploadFile(params: {
  filePath: string;
  file: File | Blob;
}): Promise<{ success: true }> {
  const { url, serviceKey, bucket } = getStorageConfig();

  const res = await fetch(
    `${url}/storage/v1/object/${bucket}/${params.filePath}`,
    {
      method: "PUT",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": params.file.type || "application/octet-stream",
      },
      body: params.file,
    }
  );

  if (!res.ok) {
    throw new Error(`Erro ao enviar arquivo ao storage (${res.status}): ${await res.text()}`);
  }

  return { success: true };
}

export async function downloadFile(params: {
  filePath: string;
}): Promise<Buffer> {
  const { url, serviceKey, bucket } = getStorageConfig();

  const res = await fetch(
    `${url}/storage/v1/object/${bucket}/${params.filePath}`,
    {
      method: "GET",
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Erro ao baixar arquivo do storage (${res.status}): ${text || "unknown"}`
    );
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function deleteFiles(params: {
  filePaths: string[];
}): Promise<string[]> {
  if (params.filePaths.length === 0) return [];

  const { url, serviceKey, bucket } = getStorageConfig();

  const res = await fetch(`${url}/storage/v1/object/${bucket}`, {
    method: "DELETE",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prefixes: params.filePaths }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Erro ao excluir arquivos do storage (${res.status}): ${text || "unknown"}`
    );
  }

  const deleted = (await res.json()) as { name: string }[];
  return deleted.map((item) => item.name);
}

export async function renameFile(params: {
  fromFilePath: string;
  toFilePath: string;
}): Promise<boolean> {
  const { url, serviceKey, bucket } = getStorageConfig();

  const res = await fetch(`${url}/storage/v1/object/move`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      bucketId: bucket,
      sourceKey: params.fromFilePath,
      destinationKey: params.toFilePath,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Erro ao mover arquivo no storage (${res.status}): ${text || "unknown"}`
    );
  }

  return true;
}
