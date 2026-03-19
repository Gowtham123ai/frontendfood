/**
 * Utility to send order events to your n8n workflows!
 *
 * 1. Go to your n8n dashboard and create a new Webhook node.
 * 2. Copy the "Test URL" or "Production URL".
 * 3. Paste that URL directly into this fetch call!
 */

export const triggerN8NWebhook = async (eventName: string, data: any) => {
  // Replace this with your actual n8n Webhook URL!
  const N8N_WEBHOOK_URL = "https://your-n8n-instance.com/webhook/flavorcloud-kitchen";

  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event: eventName,
        timestamp: new Date().toISOString(),
        payload: data,
      }),
    });

    if (!response.ok) {
      console.warn("n8n Webhook failed:", response.statusText);
    } else {
      console.log(`✅ n8n Webhook Triggered for [${eventName}]`);
    }
  } catch (err) {
    console.error("n8n Webhook Error:", err);
  }
};
