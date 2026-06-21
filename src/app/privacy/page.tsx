import type { Metadata } from "next";
import Nav from "@/src/components/home/nav";
import Footer from "@/src/components/home/footer";

export const metadata: Metadata = {
  title: "Política de Privacidade - Fluizer",
  robots: "noindex",
};

export default function PrivacyPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Nav />
      <main className="flex-1 max-w-3xl mx-auto px-6 pt-28 pb-20 w-full">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Política de Privacidade
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Última atualização: junho de 2026
        </p>

        <p className="text-sm bg-[#F5F5F7] dark:bg-[#111111] border border-border rounded-lg px-4 py-3 mb-10 leading-relaxed">
          Este site e o produto Fluizer são de propriedade e operados pela DS
          Tecnologia LTDA, inscrita no CNPJ 49.481.141/0001-62.
        </p>

        <section>
          <h2 className="text-lg font-semibold mt-10 mb-3">
            Dados que coletamos
          </h2>
          <p className="text-[15px] leading-relaxed text-foreground/80 mb-4">
            <strong>Via WhatsApp:</strong> número de telefone, nome de perfil,
            foto de perfil e outros dados disponibilizados automaticamente pela
            plataforma no início da conversa.
          </p>
          <p className="text-[15px] leading-relaxed text-foreground/80 mb-4">
            <strong>Enviados pelo usuário:</strong> materiais de estudo (texto,
            imagem, PDF) e respostas às perguntas de prática.
          </p>
          <p className="text-[15px] leading-relaxed text-foreground/80 mb-4">
            <strong>Gerados pelo sistema:</strong> histórico de perguntas,
            acertos e erros, intervalos de revisão espaçada.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-10 mb-3">Para que usamos</h2>
          <p className="text-[15px] leading-relaxed text-foreground/80 mb-4">
            Os dados coletados são utilizados para:
          </p>
          <ul className="text-[15px] leading-relaxed text-foreground/80 mb-4 list-disc pl-5 space-y-2">
            <li>Entrega do serviço de prática de inglês via WhatsApp</li>
            <li>Identificação automática do usuário para início do trial</li>
            <li>
              Personalização da prática com base no histórico de desempenho
            </li>
            <li>
              Envio de comunicações automáticas relacionadas à prática e status
              da conta
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-10 mb-3">
            Processamento por terceiros (IA)
          </h2>
          <p className="text-[15px] leading-relaxed text-foreground/80 mb-4">
            Os materiais enviados e as respostas do usuário transitam pelos
            serviços de Anthropic, OpenAI e Google para processamento por
            inteligência artificial. Cada fornecedor possui sua própria política
            de privacidade e é responsável pelos dados que processa em sua
            infraestrutura.
          </p>
          <p className="text-[15px] leading-relaxed text-foreground/80 mb-4">
            O usuário não deve enviar materiais contendo dados pessoais
            sensíveis, senhas ou informações confidenciais próprias ou de
            terceiros.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-10 mb-3">
            Ferramentas de análise e monitoramento
          </h2>
          <p className="text-[15px] leading-relaxed text-foreground/80 mb-4">
            Utilizamos as seguintes ferramentas de análise no site. Os dados
            coletados por elas são de responsabilidade de seus respectivos
            fornecedores:
          </p>
          <ul className="text-[15px] leading-relaxed text-foreground/80 mb-4 list-disc pl-5 space-y-2">
            <li>
              <strong>Microsoft Clarity:</strong> gravação de sessões e mapas de
              calor para melhoria do produto.
            </li>
            <li>
              <strong>Google Analytics:</strong> análise de tráfego e
              comportamento no site.
            </li>
            <li>
              <strong>Google Tag Manager:</strong> gerenciamento de tags de
              rastreamento.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-10 mb-3">
            Retenção de dados
          </h2>
          <p className="text-[15px] leading-relaxed text-foreground/80 mb-4">
            Materiais enviados em formato de áudio, imagem e PDF são processados
            em memória e descartados após extração do conteúdo. Nenhum arquivo
            original é armazenado.
          </p>
          <p className="text-[15px] leading-relaxed text-foreground/80 mb-4">
            O texto extraído dos materiais e as perguntas geradas são mantidos
            para funcionamento do sistema de revisão espaçada. O histórico de
            prática é mantido enquanto a conta estiver ativa.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-10 mb-3">
            Seus direitos (LGPD)
          </h2>
          <p className="text-[15px] leading-relaxed text-foreground/80 mb-4">
            Em conformidade com a Lei Geral de Proteção de Dados (Lei
            13.709/2018), o titular dos dados tem direito a solicitar acesso,
            correção e exclusão dos seus dados a qualquer momento.
          </p>
          <p className="text-[15px] leading-relaxed text-foreground/80 mb-4">
            Para exercer esses direitos, entre em contato pelo e-mail{" "}
            <a
              href="mailto:hello@fluizer.com"
              className="underline underline-offset-2"
            >
              hello@fluizer.com
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-10 mb-3">Compartilhamento</h2>
          <p className="text-[15px] leading-relaxed text-foreground/80 mb-4">
            Não compartilhamos dados dos usuários com terceiros para fins
            comerciais. Os dados transitam por fornecedores de IA (Anthropic,
            OpenAI e Google) exclusivamente para prestação do serviço de prática
            de inglês.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-10 mb-3">Contato</h2>
          <p className="text-[15px] leading-relaxed text-foreground/80 mb-4">
            Dúvidas sobre esta política:{" "}
            <a
              href="mailto:hello@fluizer.com"
              className="underline underline-offset-2"
            >
              hello@fluizer.com
            </a>
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
