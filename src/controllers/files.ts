import { Endpoint, S3 } from 'aws-sdk';
import { Request, Response } from 'express';

export const s3 = new S3({
  accessKeyId: process.env.SE_ACCESS_KEY_ID,
  secretAccessKey: process.env.SE_ACCESS_KEY,
  signatureVersion: 'v4',
  endpoint: new Endpoint(process.env.SE_ENDPOINT as string),
  region: 'nyc3',
});

export const Bucket = 'bctc-files';

export const publicURLSuffix = `https://${Bucket}.${(
  process.env.SE_ENDPOINT as string
)
  .split('//')[1]
  .replaceAll('/', '')}/`;

const generateRandomID = () => Math.floor(Math.random() * 1e7);

const upload = (folder: string) => async (req: Request, res: Response) => {
  const { filename } = req.stringQuery;
  const key = `${folder}/${generateRandomID()}_${filename}`;

  const uploadURL = await s3.getSignedUrlPromise('putObject', {
    Bucket,
    Key: key,
    Expires: 300,
    ACL: 'public-read',
    ContentType: 'application/octet-stream',
  });

  return res.json({
    uploadURL,
    publicURL: publicURLSuffix + key,
  });
};

export const uploadAvatar = upload('veor-avatars');
