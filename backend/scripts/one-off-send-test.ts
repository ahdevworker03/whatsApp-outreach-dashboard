/**
 * ONE-OFF THROWAWAY SCRIPT — not part of the app, delete after use.
 * Calls the existing metaClient.sendTemplateMessage() as-is to prove a
 * real outbound send against the live Meta Cloud API.
 */
import { sendTemplateMessage, MetaApiError } from "../src/lib/metaClient";

async function main() {
  try {
    const result = await sendTemplateMessage({
      to: "+96171819509",
      templateName: "hello_world",
      languageCode: "en_US",
    });
    console.log("SUCCESS — raw Meta response:");
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    if (error instanceof MetaApiError) {
      console.log(`FAILURE — Meta API error (HTTP ${error.status}):`);
      console.log(JSON.stringify(error.body, null, 2));
    } else {
      console.log("FAILURE — unexpected error:");
      console.log(error);
    }
  }
}

main();
