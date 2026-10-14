import { NextRequest } from "next/server";
import Stripe from "stripe";
import { stripe } from "../../../../vendors/stripe.vendor";
import {
  handleCheckoutCompleted,
  handleInvoicePaid,
  handleInvoicePaymentFailed,
  handleSubscriptionDeleted,
  handleSubscriptionUpdated,
} from "../../../../services/stripe-webhook-service";

async function dispatchEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
      return handleCheckoutCompleted(event.data.object);
    case "invoice.paid":
      return handleInvoicePaid(event.data.object);
    case "invoice.payment_failed":
      return handleInvoicePaymentFailed(event.data.object);
    case "customer.subscription.updated":
      return handleSubscriptionUpdated(event.data.object);
    case "customer.subscription.deleted":
      return handleSubscriptionDeleted(event.data.object);
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  const signature = req.headers.get("stripe-signature");
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    if (!signature) throw new Error("missing stripe-signature header");
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    console.error(
      "[post/api/webhooks/stripe] signature verification failed",
      err,
    );
    return new Response(null, { status: 403 });
  }

  console.log("[post/api/webhooks/stripe] event received", {
    type: event.type,
  });

  try {
    await dispatchEvent(event);
  } catch (err) {
    console.error("[post/api/webhooks/stripe] processing error", err);
    return new Response(null, { status: 500 });
  }

  return new Response(null, { status: 200 });
}
