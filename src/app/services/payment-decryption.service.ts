import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

/**
 * AES-256-GCM decryption in the browser using the Web Crypto API.
 * The key must match the backend PAYMENT_ENCRYPTION_KEY (hex string).
 */
@Injectable({ providedIn: 'root' })
export class PayloadDecryptionService {

  private readonly keyHex: string = environment.PAYMENT_ENCRYPTION_KEY; // 64-char hex

  /** Decode the ?data= token and return the original payload object */
  async decryptToken<T = Record<string, any>>(token: string): Promise<T> {
    const [ivB64, authTagB64, encryptedB64] = token.split('.');

    const iv          = this.fromBase64Url(ivB64);
    const authTag     = this.fromBase64Url(authTagB64);
    const encrypted   = this.fromBase64Url(encryptedB64);

    // Web Crypto requires auth tag appended to cipher text for AES-GCM
    const ciphertext  = this.concat(encrypted, authTag);

    const cryptoKey = await this.importKey();

    // ✅ Cast .buffer to ArrayBuffer to satisfy strict TS typings
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
      cryptoKey,
      ciphertext.buffer as ArrayBuffer,
    );

    const json = new TextDecoder().decode(decrypted);
    return JSON.parse(json) as T;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private async importKey(): Promise<CryptoKey> {
    const raw = this.hexToBytes(this.keyHex);

    // ✅ Cast to ArrayBuffer — fixes "No overload matches" on importKey('raw', ...)
    return crypto.subtle.importKey(
      'raw',
      raw.buffer as ArrayBuffer,
      { name: 'AES-GCM' },
      false,
      ['decrypt'],
    );
  }

  private fromBase64Url(b64url: string): Uint8Array {
    // Convert base64url → base64 → binary
    const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b64);
    return Uint8Array.from(bin, c => c.charCodeAt(0));
  }

  private hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16); // ✅ was (i, 2) — always read same 2 chars
    }
    return bytes;
  }

  private concat(a: Uint8Array, b: Uint8Array): Uint8Array {
    const result = new Uint8Array(a.length + b.length);
    result.set(a, 0);
    result.set(b, a.length);
    return result;
  }
}
