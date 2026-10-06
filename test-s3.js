const fs = require('fs');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve('apps/admin/.env.local') });

async function testS3() {
  const client = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
  });

  try {
    const cmd = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET || 'product_images',
      Key: 'test/test.txt',
      Body: 'Hello World',
      ContentType: 'text/plain',
    });
    
    await client.send(cmd);
    console.log("S3 Direct Upload Successful!");
  } catch (err) {
    console.error("S3 Direct Upload Failed:", err.message);
  }
}
testS3();
