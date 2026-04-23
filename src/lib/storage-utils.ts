export async function uploadFile({
  bucket,
  filePath,
  file,
}: {
  bucket: string;
  filePath: string;
  file: File | Blob;
}) {
  const _bucket =
    process.env.NODE_ENV !== "production" ? `${bucket}-develop` : bucket;

  const res = await fetch(
    `${process.env.SUPABASE_URL}/storage/v1/object/${_bucket}/${filePath}`,
    {
      method: "PUT",
      headers: {
        "api-key": process.env.SUPABASE_SERVICE_KEY!,
        Authorization: process.env.SUPABASE_SERVICE_KEY!,
        "Content-Type": file.type || "application/octet-stream",
      },
      body: file,
    }
  );

  if (!res.ok) {
    throw new Error(`File upload failed: ${await res.text()}`);
  }

  return { success: true };
}

export async function downloadFile({
  bucket,
  filePath,
}: {
  bucket: string;
  filePath: string;
}): Promise<Buffer> {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  const _bucket =
    process.env.NODE_ENV !== "production" ? `${bucket}-develop` : bucket;

  if (!url || !serviceKey) {
    throw new Error("Supabase URL ou SERVICE_KEY não configurados");
  }

  const res = await fetch(`${url}/storage/v1/object/${_bucket}/${filePath}`, {
    method: "GET",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Erro ao baixar PDF do storage (${res.status}): ${text || "unknown"}`
    );
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function deleteFile({
  bucket,
  filePath,
}: {
  bucket: string;
  filePath: string;
}): Promise<Boolean> {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  const _bucket =
    process.env.NODE_ENV !== "production" ? `${bucket}-develop` : bucket;

  if (!url || !serviceKey) {
    throw new Error("Supabase URL ou SERVICE_KEY não configurados");
  }

  const res = await fetch(`${url}/storage/v1/object/${_bucket}/${filePath}`, {
    method: "DELETE",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  });

  if (res.status === 404) return false;

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Erro ao excluir PDF do storage (${res.status}): ${text || "unknown"}`
    );
  }

  return true;
}

export async function renameFile({
  bucket,
  fromFilePath,
  toFilePath,
}: {
  bucket: string;
  fromFilePath: string;
  toFilePath: string;
}): Promise<boolean> {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  const _bucket =
    process.env.NODE_ENV !== "production" ? `${bucket}-develop` : bucket;

  if (!url || !serviceKey) {
    throw new Error("Supabase URL ou SERVICE_KEY não configurados");
  }

  const res = await fetch(`${url}/storage/v1/object/move`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      bucketId: _bucket,
      sourceKey: fromFilePath, // ex: "docs/temp_file.pdf"
      destinationKey: toFilePath, // ex: "docs/file.pdf"
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
