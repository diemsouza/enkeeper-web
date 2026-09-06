import "dotenv/config";
import { StorageClient } from "@supabase/storage-js";

const STORAGE_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1`;

const storage = new StorageClient(STORAGE_URL, {
  apikey: process.env.SUPABASE_SERVICE_KEY!,
  Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
});
const OLD_BUCKET = "tts-develop";
const NEW_BUCKET = "media-develop";
const CONCURRENCY = 10; // ajuste entre 5 e 10 conforme quiser

async function listAll(prefix = ""): Promise<string[]> {
  const { data, error } = await storage
    .from(OLD_BUCKET)
    .list(prefix, { limit: 1000 });
  if (error) throw error;
  let paths: string[] = [];
  for (const item of data ?? []) {
    const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.id === null) {
      paths = paths.concat(await listAll(fullPath));
    } else {
      paths.push(fullPath);
    }
  }
  return paths;
}

async function migrateOne(path: string): Promise<void> {
  const { data: fileData, error: downloadError } = await storage
    .from(OLD_BUCKET)
    .download(path);
  if (downloadError) {
    console.error("Erro ao baixar", path, downloadError);
    return;
  }

  const { error: uploadError } = await storage
    .from(NEW_BUCKET)
    .upload(path, fileData, { upsert: true });
  if (uploadError) {
    console.error("Erro ao subir", path, uploadError);
    return;
  }

  console.log("OK:", path);
}

// Divide o array em pedaços de tamanho `size`
function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

async function migrate() {
  const paths = await listAll();
  console.log(`Encontrados ${paths.length} arquivos.`);

  const batches = chunk(paths, CONCURRENCY);
  let done = 0;

  for (const batch of batches) {
    await Promise.all(batch.map((path) => migrateOne(path)));
    done += batch.length;
    console.log(`Progresso: ${done}/${paths.length}`);
  }

  console.log("Migração concluída.");
}

migrate();
