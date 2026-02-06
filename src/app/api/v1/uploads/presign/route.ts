import { NextRequest } from "next/server";
import { apiResponse, apiError, requireAuth } from "@/lib/api/helpers";
import { createPresignedUpload } from "@/lib/storage/s3";
import { z } from "zod";

const presignSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
});

// POST /api/v1/uploads/presign — get a presigned URL for uploading
export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return apiError("Unauthorized", 401);

  const body = await req.json();
  const result = presignSchema.safeParse(body);
  if (!result.success) {
    return apiError("filename and contentType are required");
  }

  const { filename, contentType } = result.data;

  const ALLOWED_TYPES = ["video/mp4", "video/webm", "video/quicktime", "image/jpeg", "image/png"];
  if (!ALLOWED_TYPES.includes(contentType)) {
    return apiError(`Unsupported content type: ${contentType}`);
  }

  const presigned = await createPresignedUpload(user.id, filename, contentType);

  return apiResponse(presigned);
}
