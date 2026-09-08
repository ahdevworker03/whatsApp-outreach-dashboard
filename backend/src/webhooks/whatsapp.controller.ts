import { Request, Response } from "express";
import { env } from "../config/env";

/**
 * Meta calls this once when the webhook is subscribed in the App Dashboard.
 * It must echo back hub.challenge if hub.verify_token matches our configured
 * secret, or Meta will refuse to deliver any events.
 */
export function verifyWebhook(req: Request, res: Response): void {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === env.metaWebhookVerifyToken) {
    res.status(200).send(challenge);
    return;
  }

  res.sendStatus(403);
}

interface WhatsAppMessageEntry {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
}

interface WhatsAppStatusEntry {
  id: string;
  status: string;
  timestamp: string;
  recipient_id: string;
}

interface WhatsAppWebhookPayload {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: WhatsAppMessageEntry[];
        statuses?: WhatsAppStatusEntry[];
      };
    }>;
  }>;
}

/**
 * Receives all incoming events from Meta: inbound messages and message
 * status updates. For M1 this only logs what was received, proving the
 * round trip end to end. Persistence, auto-reply detection, and follow-up
 * logic are out of scope until M2/M5.
 *
 * Always responds 200 immediately — a non-200 response makes Meta retry
 * the same event.
 */
export function receiveWebhookEvent(req: Request, res: Response): void {
  res.sendStatus(200);

  const payload = req.body as WhatsAppWebhookPayload;

  try {
    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        for (const message of change.value?.messages ?? []) {
          console.log("[webhook] inbound message", {
            from: message.from,
            id: message.id,
            type: message.type,
            text: message.text?.body,
            timestamp: message.timestamp,
          });
        }

        for (const status of change.value?.statuses ?? []) {
          console.log("[webhook] status update", {
            messageId: status.id,
            status: status.status,
            recipientId: status.recipient_id,
            timestamp: status.timestamp,
          });
        }
      }
    }
  } catch (error) {
    // Webhook handler failures are logged but must never crash the process
    // or surface as a non-200 response (docs/architecture/03-backend-architecture.md).
    console.error("[webhook] failed to process event", error);
  }
}
