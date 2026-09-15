import { Request, Response } from "express";
import * as settingsService from "../services/settings.service";

// Thin, HTTP-focused controller per docs/rules/backend.md — the workflow
// lives in settings.service.ts.

export async function getSettings(_req: Request, res: Response): Promise<void> {
  const settings = await settingsService.getOrCreateSettings();
  res.status(200).json(settings);
}

export async function updateSettings(req: Request, res: Response): Promise<void> {
  const body = req.body ?? {};

  if (body.auto_reply_patterns !== undefined) {
    if (
      !Array.isArray(body.auto_reply_patterns) ||
      !body.auto_reply_patterns.every((p: unknown) => typeof p === "string")
    ) {
      res.status(400).json({ error: "auto_reply_patterns must be an array of strings" });
      return;
    }
  }

  const settings = await settingsService.updateSettings({
    whatsappPhoneNumber: body.whatsapp_phone_number,
    whatsappPhoneNumberId: body.whatsapp_phone_number_id,
    autoReplyPatterns: body.auto_reply_patterns,
  });
  res.status(200).json(settings);
}
