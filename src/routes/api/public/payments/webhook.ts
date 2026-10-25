import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live")
          return new Response("Unknown environment", { status: 400 });
        const { verifyWebhook, processEvent } = await import("@/lib/payment-webhook.server");
        let event;
        try {
          event = await verifyWebhook(request, rawEnv);
        } catch {
          return new Response("Invalid webhook signature or payload", { status: 400 });
        }
        try {
          return Response.json({ received: true, ...(await processEvent(event, rawEnv)) });
        } catch {
          console.error("Subscription synchronization failed", event.id);
          return new Response("Subscription synchronization failed", { status: 500 });
        }
      },
    },
  },
});
