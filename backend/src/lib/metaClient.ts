import { env } from "../config/env";

export interface TemplateComponent {
  type: "header" | "body" | "button";
  parameters: Array<{ type: "text"; text: string }>;
}

export interface SendTemplateMessageInput {
  to: string;
  templateName: string;
  languageCode: string;
  components?: TemplateComponent[];
}

export interface MetaSendMessageResponse {
  messaging_product: "whatsapp";
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string }>;
}

export interface MetaApiErrorBody {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

export class MetaApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: MetaApiErrorBody
  ) {
    super(body.error?.message ?? `Meta Cloud API request failed with status ${status}`);
    this.name = "MetaApiError";
  }
}

/**
 * Sends one pre-approved WhatsApp template message via the Meta Cloud API.
 * Used for the M1 outbound send proof; the campaign/messaging service will
 * call this same primitive once the data model exists (M4).
 */
export async function sendTemplateMessage(
  input: SendTemplateMessageInput
): Promise<MetaSendMessageResponse> {
  const url = `https://graph.facebook.com/${env.metaApiVersion}/${env.metaPhoneNumberId}/messages`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.metaAccessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: input.to,
      type: "template",
      template: {
        name: input.templateName,
        language: { code: input.languageCode },
        ...(input.components ? { components: input.components } : {}),
      },
    }),
  });

  const body = await response.json();

  if (!response.ok) {
    throw new MetaApiError(response.status, body as MetaApiErrorBody);
  }

  return body as MetaSendMessageResponse;
}
