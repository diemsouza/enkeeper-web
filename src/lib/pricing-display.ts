import {
  DEFAULT_CURRENCY,
  SUBSCRIPTION_PRICE_BRL,
} from "@/src/lib/constants";
import { getFormattedPrice } from "@/src/lib/utils";

const MONTHS_PER_YEAR = 12;

export type PricingDisplay = {
  monthly: string;
  yearly: string;
  yearlyPerMonth: string;
  savings: string;
};

export function getPricingDisplay(): PricingDisplay {
  const { monthly, yearly } = SUBSCRIPTION_PRICE_BRL;
  return {
    monthly: getFormattedPrice(monthly, DEFAULT_CURRENCY),
    yearly: getFormattedPrice(yearly, DEFAULT_CURRENCY),
    yearlyPerMonth: getFormattedPrice(
      yearly / MONTHS_PER_YEAR,
      DEFAULT_CURRENCY,
    ),
    savings: String(Math.round(monthly * MONTHS_PER_YEAR - yearly)),
  };
}
