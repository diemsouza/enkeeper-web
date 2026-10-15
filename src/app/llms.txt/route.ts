import { SITE_URL, TRIAL_DAYS } from "@/src/lib/constants";
import { getPricingDisplay } from "@/src/lib/pricing-display";

export const dynamic = "force-static";

function buildLlmsTxt(): string {
  const { monthly, yearly, yearlyPerMonth } = getPricingDisplay();

  return `# Fluizer

> Fluizer é um app brasileiro de prática diária de inglês com IA e repetição espaçada (SM-2). Você escolhe o conteúdo e recebe perguntas sobre ele ao longo do dia, no seu ritmo.

## Como funciona

- Você conta o que quer praticar (tema, trabalho, viagem) ou envia o material da aula em texto, foto ou PDF.
- O Fluizer gera perguntas em formatos variados (completar frase, cenário, múltipla escolha, imagem e áudio) e dá feedback na hora a cada resposta.
- A repetição espaçada traz de volta o que você erra, sem montar deck nem lembrar de revisar.

## Para quem é

Para quem estuda inglês, em qualquer curso ou por conta própria, e quer praticar mais todos os dias sem montar rotina de estudo.

## Planos

- Teste grátis por ${TRIAL_DAYS} dias, sem cartão.
- Anual: R$${yearlyPerMonth} por mês, cobrado R$${yearly} por ano.
- Mensal: R$${monthly} por mês.
- Os dois renovam automaticamente e podem ser cancelados quando quiser.

## Links

- [Home](${SITE_URL})
- [Termos de uso](${SITE_URL}/terms)
- [Política de privacidade](${SITE_URL}/privacy)
`;
}

export function GET(): Response {
  return new Response(buildLlmsTxt(), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
