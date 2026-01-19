import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME!;

export async function uploadToS3(file: Buffer, key: string, contentType: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: file,
    ContentType: contentType,
  });

  await s3Client.send(command);
  const region = process.env.AWS_REGION || 'us-east-1';
  // Handle us-east-1 which doesn't include region in URL
  if (region === 'us-east-1') {
    return `https://${BUCKET_NAME}.s3.amazonaws.com/${key}`;
  }
  return `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${key}`;
}

export async function deleteFromS3(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
}

export function extractS3Key(url: string): string | null {
  if (!url) return null;
  
  // Handle different S3 URL formats:
  // https://bucket.s3.region.amazonaws.com/key
  // https://bucket.s3.amazonaws.com/key
  // https://s3.region.amazonaws.com/bucket/key
  // s3://bucket/key (return as-is if already a key)
  
  if (url.startsWith('s3://')) {
    // If it's already an s3:// URL, extract the key part
    const parts = url.replace('s3://', '').split('/');
    if (parts.length > 1) {
      return parts.slice(1).join('/');
    }
    return null;
  }
  
  // Extract key from https URL
  const match = url.match(/https?:\/\/[^\/]+\/(.+)/);
  if (match && match[1]) {
    // Remove query parameters if any
    return match[1].split('?')[0];
  }
  
  // If it doesn't match URL pattern, assume it's already a key
  return url;
}
