import { SubscriptionInterval } from "./constants";

export type AuthMethod = "phone" | "whatsapp";
export type CheckoutPlan = "monthly" | "annual";

export const CHECKOUT_PLAN_BY_INTERVAL: Record<
  SubscriptionInterval,
  CheckoutPlan
> = {
  monthly: "monthly",
  yearly: "annual",
};

type PurchaseItem = {
  item_id: CheckoutPlan;
  item_name: string;
  price: number;
  quantity: number;
};

export type AnalyticsEventMap = {
  sign_up: { method: AuthMethod };
  login: { method: AuthMethod };
  begin_checkout: { plan: CheckoutPlan; value: number; currency: "BRL" };
  purchase: {
    transaction_id: string;
    value: number;
    currency: "BRL";
    items: PurchaseItem[];
  };
};

function pushToDataLayer(entry: Record<string, unknown>): void {
  if (typeof window === "undefined") return;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(entry);
}

export const track = <E extends keyof AnalyticsEventMap>(
  event: E,
  params: AnalyticsEventMap[E],
): void => {
  pushToDataLayer({ event, ...params });
};

export const setUserId = (userId: string): void => {
  pushToDataLayer({ user_id: userId });
};
