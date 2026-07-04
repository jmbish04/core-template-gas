import {HttpClient} from '@shared/core/HttpClient';
import type {DocumentIngestPayload, PwaIngestPayload} from './types';

/**
 * Small REST client for the paired Cloudflare research archive worker.
 *
 * The Apps Script project should not need to know about D1, Vectorize, R2, or
 * Gemini proxy internals. Its responsibility is to detect new Drive assets,
 * transform them into transport-friendly payloads, and POST them to the
 * worker's API boundary.
 */
export class WorkerSyncClient {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string
  ) {}

  /**
   * Pushes a Google Doc markdown archive payload to the worker.
   *
   * @param payload Document ingest payload.
   */
  ingestDocument(payload: DocumentIngestPayload): void {
    this.post('/api/research/documents/ingest', payload as unknown as Record<string, unknown>);
  }

  /**
   * Pushes a Drive HTML/PWA export payload to the worker.
   *
   * @param payload PWA ingest payload.
   */
  ingestPwa(payload: PwaIngestPayload): void {
    this.post('/api/research/pwas/ingest', payload as unknown as Record<string, unknown>);
  }

  /**
   * Sends a JSON POST request to the configured worker.
   *
   * @param pathname Worker-relative API pathname.
   * @param payload JSON payload body.
   */
  private post(pathname: string, payload: Record<string, unknown>): void {
    HttpClient.requestJson(`${this.baseUrl}${pathname}`, {
      method: 'post',
      headers: this.apiKey ? {Authorization: `Bearer ${this.apiKey}`} : {},
      payload: JSON.stringify(payload)
    });
  }
}
