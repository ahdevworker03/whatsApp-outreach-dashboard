/**
 * M1 proof script: sends one real WhatsApp template message via the Meta
 * Cloud API and prints the result. Not part of the Express app — this is a
 * one-off CLI tool for proving the outbound half of the M1 round trip
 * before any campaign/messaging service exists (that lands in M4).
 *
 * Usage:
 *   npm run send-test-message -- <to_e164> <template_name> <language_code>
 *
 * Example:
 *   npm run send-test-message -- +15551234567 hello_world en_US
 */
import { MetaApiError, sendTemplateMessage } from "../src/lib/metaClient";

async function main() {
  const [to, templateName, languageCode] = process.argv.slice(2);

  if (!to || !templateName || !languageCode) {
    console.error(
      "Usage: npm run send-test-message -- <to_e164> <template_name> <language_code>"
    );
    process.exit(1);
  }

  try {
    const result = await sendTemplateMessage({ to, templateName, languageCode });
    console.log("Message accepted by Meta:");
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    if (error instanceof MetaApiError) {
      console.error(`Meta Cloud API error (HTTP ${error.status}):`);
      console.error(JSON.stringify(error.body, null, 2));
    } else {
      console.error("Failed to send message:", error);
    }
    process.exit(1);
  }
}

main();
