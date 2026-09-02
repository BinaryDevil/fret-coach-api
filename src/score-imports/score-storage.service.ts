import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type SignedUploadResponse = { signedURL?: string };
type SignedDownloadResponse = { signedURL?: string };

/** Small Supabase Storage adapter; imported scores always remain in a private bucket. */
@Injectable()
export class ScoreStorageService {
  constructor(private readonly config: ConfigService) {}

  async createSignedUploadUrl(storageKey: string, mimeType: string) {
    const { url, secretKey, bucket } = this.settings();
    const response = await fetch(
      `${url}/storage/v1/object/upload/sign/${encodeURIComponent(bucket)}/${this.path(storageKey)}`,
      {
        method: 'POST',
        headers: {
          apikey: secretKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expiresIn: 600 }),
      },
    );
    if (!response.ok) throw new ServiceUnavailableException('Unable to prepare score upload');
    const payload = (await response.json()) as SignedUploadResponse;
    if (!payload.signedURL)
      throw new ServiceUnavailableException('Storage did not return an upload URL');
    return {
      uploadUrl: `${url}/storage/v1${payload.signedURL}`,
      uploadMethod: 'PUT' as const,
      uploadHeaders: { 'Content-Type': mimeType },
      expiresInSeconds: 600,
    };
  }

  async download(storageKey: string): Promise<Uint8Array> {
    const { url, secretKey, bucket } = this.settings();
    const response = await fetch(
      `${url}/storage/v1/object/${encodeURIComponent(bucket)}/${this.path(storageKey)}`,
      { headers: { apikey: secretKey } },
    );
    if (!response.ok)
      throw new ServiceUnavailableException('Uploaded score file could not be retrieved');
    return new Uint8Array(await response.arrayBuffer());
  }

  async createSignedDownloadUrl(storageKey: string) {
    const { url, secretKey, bucket } = this.settings();
    const response = await fetch(
      `${url}/storage/v1/object/sign/${encodeURIComponent(bucket)}/${this.path(storageKey)}`,
      {
        method: 'POST',
        headers: {
          apikey: secretKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expiresIn: 600 }),
      },
    );
    if (!response.ok) throw new ServiceUnavailableException('Unable to prepare score download');
    const payload = (await response.json()) as SignedDownloadResponse;
    if (!payload.signedURL)
      throw new ServiceUnavailableException('Storage did not return a download URL');
    return { sourceUrl: `${url}/storage/v1${payload.signedURL}`, expiresInSeconds: 600 };
  }

  private settings() {
    const url = this.config.get<string>('SUPABASE_URL');
    const secretKey =
      this.config.get<string>('SUPABASE_SECRET_KEY') ??
      this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    const bucket = this.config.get<string>('SUPABASE_SCORE_BUCKET') ?? 'fret-coach-scores';
    if (!url || !secretKey)
      throw new ServiceUnavailableException('Score file storage is not configured');
    return { url: url.replace(/\/$/, ''), secretKey, bucket };
  }

  private path(key: string) {
    return key.split('/').map(encodeURIComponent).join('/');
  }
}
