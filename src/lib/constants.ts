export const LOCALE_COOKIE_NAME = "zn_locale";
export const MIN_DOC_CHARS = 300;
export const NEXT_MESSAGE_INTERVAL_MIN = 30;
export const LOCALES = ["pt-BR", "en-US"];
export const DEFAULT_LOCALE = "pt-BR";
export const DEFAULT_CURRENCY = "BRL";
export const WHATSAPP_NUMBER = "551153069000";

const PLANS = [
  {
    code: "lite",
    name: "Starter",
    price: 11900,
    priceId: process.env.STRIPE_PRICE_STARTER,
    currency: "BRL",
    trialPeriodDays: 0,
    features: {
      agents: 1,
      leads: 150,
      chats: 450,
      faqs: 30,
      docs: true,
      whatsapp_notifications: 25,
      email_notifications: true,
      webhook: false,
      sentiment_analysis: false,
      intention_analysis: 0,
      summary: true,
      agent_name: true,
      support_email: true,
      support_priority: false,
      docs_max_chars: 10000,
    },
    hiddenFeatures: {
      docs_max_chars: true,
      agent_name: true,
      chats: true,
    },
    popular: false,
  },
  {
    code: "essential",
    name: "Business",
    price: 29900,
    priceId: process.env.STRIPE_PRICE_BUSINESS,
    currency: "BRL",
    trialPeriodDays: 0,
    prevPlanCode: "lite",
    features: {
      agents: 2,
      leads: 500,
      chats: 1000,
      faqs: 60,
      docs: true,
      email_notifications: true,
      whatsapp_notifications: 50,
      agent_name: true,
      sentiment_analysis: true,
      intention_analysis: 1,
      summary: true,
      webhook: true,
      support_email: true,
      support_priority: false,
      docs_max_chars: 20000,
    },
    hiddenFeatures: {
      docs_max_chars: true,
      agent_name: true,
      chats: true,
    },
    popular: true,
  },
  {
    code: "pro",
    name: "Pro",
    price: 49900,
    priceId: process.env.STRIPE_PRICE_PRO,
    currency: "BRL",
    trialPeriodDays: 0,
    prevPlanCode: "essential",
    features: {
      agents: 3,
      leads: 1000,
      chats: 3000,
      faqs: 90,
      docs: true,
      email_notifications: true,
      whatsapp_notifications: 100,
      webhook: true,
      agent_name: true,
      sentiment_analysis: true,
      intention_analysis: 1,
      summary: true,
      support_email: true,
      support_priority: true,
      docs_max_chars: 30000,
    },
    hiddenFeatures: {
      docs_max_chars: true,
      agent_name: true,
      chats: true,
    },
    popular: false,
  },
];

export function getPlans(currency = DEFAULT_CURRENCY) {
  return PLANS;
}

export function getPlanByCode(code: string, currency = DEFAULT_CURRENCY) {
  return getPlans(currency).find((a) => a.code === code);
}

export const TRIAL_DAYS = 1;
export const MAX_DOCS_PER_DAY = 5;
