// Path: src/files/files.service.ts

import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuid } from 'uuid';

@Injectable()
export class FilesService {
  private readonly s3Client: S3Client;

  constructor(private configService: ConfigService) {
    const region = this.configService.get<string>('AWS_S3_REGION');
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');

    if (!region || !accessKeyId || !secretAccessKey) {
      throw new InternalServerErrorException('AWS S3 credentials are not configured');
    }

    this.s3Client = new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  async uploadPublicFile(
    dataBuffer: Buffer,
    filename: string,
  ): Promise<{ url: string; key: string }> {
    const bucketName = this.configService.get<string>('AWS_S3_BUCKET_NAME');
    const fileKey = `${uuid()}-${filename}`;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Body: dataBuffer,
        Key: fileKey,
      }),
    );

    const fileUrl = `https://${bucketName}.s3.${this.configService.get('AWS_S3_REGION')}.amazonaws.com/${fileKey}`;
    return { url: fileUrl, key: fileKey };
  }
}