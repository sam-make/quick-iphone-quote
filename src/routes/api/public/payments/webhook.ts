import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (new URL(request.url).searchParams.get("env") !== "sandbox")
          return new Response("Test environment only", { status: 400 });
        const { verifyTestWebhook, processTestEvent } =
          await import("@/lib/payment-webhook.server");
        let event;
        try {
          event = await verifyTestWebhook(request);
        } catch {
          return new Response("Invalid webhook signature or payload", { status: 400 });
        }
        try {
          return Response.json({ received: true, ...(await processTestEvent(event)) });
        } catch {
          console.error("Test subscription synchronization failed", event.id);
          return new Response("Subscription synchronization failed", { status: 500 });
        }
      },
    },
  },
});
