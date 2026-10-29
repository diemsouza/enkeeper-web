import { requireAuth } from "@/src/lib/auth/current-user";
import { UnauthorizedError } from "@/src/lib/custom-errors";
import { extractMaterialFile } from "@/src/services/material-extract-service";

export async function POST(request: Request): Promise<Response> {
  try {
    const user = await requireAuth();

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return Response.json({ error: "invalid form data" }, { status: 400 });
    }
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: "invalid form data fields" }, { status: 400 });
    }

    const result = await extractMaterialFile(file, user.id);
    if (!result.ok) return Response.json(result, { status: 422 });
    return Response.json(result);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
    console.error("[post/api/app/activities/material/extract]", error);
    return Response.json({ error: "internal error" }, { status: 500 });
  }
}
