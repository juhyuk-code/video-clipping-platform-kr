const S3_BUCKET = process.env.S3_BUCKET_CLIPS ?? "clipplatform-clips-kr";
const AWS_REGION = process.env.AWS_REGION ?? "ap-northeast-2";

export function getUploadUrl(key: string): string {
  const domain = process.env.CLOUDFRONT_DOMAIN;
  if (domain) {
    return `https://${domain}/${key}`;
  }
  return `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${key}`;
}

export function generateUploadKey(userId: string, filename: string): string {
  const timestamp = Date.now();
  const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `clips/${userId}/${timestamp}-${sanitized}`;
}

// In production, this would use AWS SDK to generate a presigned URL.
// For now, return a mock structure that the frontend can use.
export async function createPresignedUpload(userId: string, filename: string, contentType: string) {
  const key = generateUploadKey(userId, filename);

  // In production:
  // const command = new PutObjectCommand({ Bucket: S3_BUCKET, Key: key, ContentType: contentType });
  // const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

  return {
    key,
    uploadUrl: getUploadUrl(key),
    fields: {} as Record<string, string>,
    expiresIn: 3600,
  };
}
