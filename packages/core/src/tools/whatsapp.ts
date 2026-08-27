/**
 * whatsapp.ts — Adapter de publicación para WhatsApp Business Cloud API (AutoPub).
 *
 * Envía un mensaje (texto o video por link) al número destinatario configurado.
 * fetch inyectable; token desde options o WHATSAPP_ACCESS_TOKEN; phone number id
 * desde WHATSAPP_PHONE_NUMBER_ID; destinatario desde options.to o WHATSAPP_TO.
 * Fail-soft.
 */

import type { PublishInput, PublishResult, PublisherAdapter, PublishPlatform } from './publish';

export const WHATSAPP_PLATFORM = 'whatsapp';

export interface WhatsAppAdapterOptions {
  accessToken?: string;
  phoneNumberId?: string;
  to?: string;
  fetchFn?: typeof fetch;
  tokenFromEnv?: () => string | undefined;
  phoneIdFromEnv?: () => string | undefined;
  toFromEnv?: () => string | undefined;
}

export function createWhatsAppAdapter(options: WhatsAppAdapterOptions = {}): PublisherAdapter {
  const token = () => options.accessToken ?? options.tokenFromEnv?.() ?? process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = () => options.phoneNumberId ?? options.phoneIdFromEnv?.() ?? process.env.WHATSAPP_PHONE_NUMBER_ID;
  const to = () => options.to ?? options.toFromEnv?.() ?? process.env.WHATSAPP_TO;
  const fetchFn = options.fetchFn ?? globalThis.fetch;

  return {
    platform: WHATSAPP_PLATFORM as PublishPlatform,
    async validate() {
      if (!token()) return { ok: false, reason: 'WHATSAPP_ACCESS_TOKEN no configurado' };
      if (!phoneId()) return { ok: false, reason: 'WHATSAPP_PHONE_NUMBER_ID no configurado' };
      if (!to()) return { ok: false, reason: 'WHATSAPP_TO no configurado (número destinatario)' };
      return { ok: true };
    },
    async publish(input: PublishInput): Promise<PublishResult> {
      const accessToken = token();
      const pid = phoneId();
      const dest = to();
      if (!accessToken) return { platform: WHATSAPP_PLATFORM, ok: false, error: 'WHATSAPP_ACCESS_TOKEN no configurado' };
      if (!pid) return { platform: WHATSAPP_PLATFORM, ok: false, error: 'WHATSAPP_PHONE_NUMBER_ID no configurado' };
      if (!dest) return { platform: WHATSAPP_PLATFORM, ok: false, error: 'WHATSAPP_TO no configurado' };

      const meta = input.metadata ?? {};
      const title = meta.title ?? 'UltraIa';
      const desc = meta.description ?? '';
      const text = `${title}\n\n${desc}`.slice(0, 1000);

      const payload = input.videoUrl
        ? { messaging_product: 'whatsapp', to: dest, type: 'video', video: { link: input.videoUrl, caption: text } }
        : { messaging_product: 'whatsapp', to: dest, type: 'text', text: { body: text } };

      try {
        const res = await fetchFn(`https://graph.facebook.com/v21.0/${pid}/messages`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = (await res.json().catch(() => ({}))) as {
          messages?: Array<{ id: string }>;
          error?: { message?: string };
        };
        if (!res.ok || !data.messages?.[0]?.id) {
          return { platform: WHATSAPP_PLATFORM, ok: false, error: `WhatsApp falló: HTTP ${res.status} (${data.error?.message || 'sin id'})` };
        }
        return { platform: WHATSAPP_PLATFORM, ok: true, id: data.messages[0].id };
      } catch (err) {
        return { platform: WHATSAPP_PLATFORM, ok: false, error: `WhatsApp error: ${(err as Error).message}` };
      }
    },
  };
}
