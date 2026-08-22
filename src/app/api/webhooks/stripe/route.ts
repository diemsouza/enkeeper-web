import { NextRequest } from "next/server";
import Stripe from "stripe";
import { stripe } from "../../../../vendors/stripe.vendor";
import {
  findUserById,
  findUserChannelByUserId,
  updateUserPlan,
  updateUserCheckoutData,
} from "../../../../repo/users.repo";
import { sendAndSaveMessage } from "../../../../services/message-sender-service";
import { formatPaymentConfirmed } from "../../../../core/formatters";
import { WhatsAppChannel } from "../../../../lib/channels/whatsapp-channel";

const PRO_ACCESS_DAYS = 30;

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const userId = session.client_reference_id;
  if (!userId) {
    console.error(
      "[post/api/webhooks/stripe] checkout.session.completed without client_reference_id",
      { sessionId: session.id },
    );
    return;
  }

  const user = await findUserById(userId);
  if (!user) {
    throw new Error(
      `[post/api/webhooks/stripe] user not found: ${userId} (sessionId=${session.id})`,
    );
  }

  if (!user.checkoutData) {
    console.log(
      "[post/api/webhooks/stripe] checkout already processed, skipping",
      { userId, sessionId: session.id },
    );
    return;
  }

  const planExpiresAt = new Date(
    Date.now() + PRO_ACCESS_DAYS * 24 * 60 * 60 * 1000,
  );
  await updateUserPlan(userId, {
    planCode: "pro",
    planStatus: "active",
    planExpiresAt,
  });
  await updateUserCheckoutData(userId, null);

  console.log("[post/api/webhooks/stripe] plan updated", {
    userId,
    planExpiresAt,
  });

  const userChannel = await findUserChannelByUserId(userId);
  if (!userChannel) {
    console.error(
      "[post/api/webhooks/stripe] no whatsapp channel found, skipping confirmation message",
      { userId },
    );
    return;
  }

  const channel = new WhatsAppChannel();
  await sendAndSaveMessage({
    channel,
    to: userChannel.channelUserId,
    userId,
    userChannelId: userChannel.id,
    message: formatPaymentConfirmed(),
    intent: "payment_confirmed",
  });

  console.log("[post/api/webhooks/stripe] confirmation message sent", {
    userId,
  });
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
    console.error("[post/api/webhooks/stripe] signature verification failed", err);
    return new Response(null, { status: 403 });
  }

  console.log("[post/api/webhooks/stripe] event received", { type: event.type });

  if (event.type !== "checkout.session.completed") {
    return new Response(null, { status: 200 });
  }

  try {
    await handleCheckoutCompleted(event.data.object);
  } catch (err) {
    console.error("[post/api/webhooks/stripe] processing error", err);
    return new Response(null, { status: 500 });
  }

  return new Response(null, { status: 200 });
}
