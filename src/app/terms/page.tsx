import type { Metadata } from "next";
import Nav from "@/src/components/home/nav";
import Footer from "@/src/components/home/footer";

export const metadata: Metadata = {
  title: "Termos de Uso - Fluizer",
  robots: "noindex",
};

export default function TermsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Nav />
      <main className="flex-1 max-w-3xl mx-auto px-6 pt-28 pb-20 w-full">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Termos de Uso
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Última atualização: junho de 2026
        </p>

        <p className="text-sm bg-[#F5F5F7] dark:bg-[#111111] border border-border rounded-lg px-4 py-3 mb-10 leading-relaxed">
          Este site e o produto Fluizer são de propriedade e operados pela DS
          Tecnologia LTDA, inscrita no CNPJ 49.481.141/0001-62.
        </p>

        <section>
          <h2 className="text-lg font-semibold mt-10 mb-3">O serviço</h2>
          <p className="text-[15px] leading-relaxed text-foreground/80 mb-4">
            O Fluizer é um agente de prática de inglês que opera via WhatsApp. O
            usuário envia material de estudo - texto, imagem ou PDF e recebe
            perguntas sobre esse conteúdo ao longo do dia para praticar o
            vocabulário.
          </p>
          <p className="text-[15px] leading-relaxed text-foreground/80 mb-4">
            O serviço utiliza modelos de inteligência artificial dos
            fornecedores Anthropic, OpenAI e Google como motores de
            processamento. Por essa razão, perguntas, avaliações e feedbacks são
            gerados por IA e podem conter inconsistências. O Fluizer não garante
            perfeição nas respostas geradas.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-10 mb-3">Planos</h2>
          <p className="text-[15px] leading-relaxed text-foreground/80 mb-4">
            <strong>Trial:</strong> período inicial gratuito de acesso completo
            ao produto por tempo limitado, sem necessidade de cartão ou
            pagamento. A duração padrão é de 3 dias, podendo variar conforme
            campanhas e parcerias. Não há renovação automática do trial.
          </p>
          <p className="text-[15px] leading-relaxed text-foreground/80 mb-4">
            <strong>Pro:</strong> plano pago com cobrança mensal recorrente. O
            valor vigente é informado no momento da contratação. A cobrança é
            mensal e independe do nível de interação ou engajamento do usuário
            no período.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-10 mb-3">
            Cadastro e identificação
          </h2>
          <p className="text-[15px] leading-relaxed text-foreground/80 mb-4">
            Não é necessário cadastro manual para iniciar o trial. O usuário é
            identificado automaticamente pelos dados disponíveis via WhatsApp:
            número de telefone, nome de perfil, foto de perfil e outros dados
            disponibilizados pela plataforma.
          </p>
          <p className="text-[15px] leading-relaxed text-foreground/80 mb-4">
            Para upgrade ao plano Pro, podem ser solicitadas informações
            adicionais para identificação e processamento da cobrança mensal.
          </p>
          <p className="text-[15px] leading-relaxed text-foreground/80 mb-4">
            Após expiração do trial sem conversão para o plano Pro, a conta é
            bloqueada até que o upgrade seja realizado.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-10 mb-3">
            Como usar o serviço
          </h2>
          <p className="text-[15px] leading-relaxed text-foreground/80 mb-4">
            Para pleno funcionamento, o usuário deve enviar materiais
            compatíveis com os formatos suportados (texto, imagem, PDF) e com
            conteúdo estruturado e relevante para estudo de inglês.
          </p>
          <p className="text-[15px] leading-relaxed text-foreground/80 mb-4">
            Em caso de dúvida sobre compatibilidade de material, o usuário pode
            contatar o suporte diretamente pelo produto via WhatsApp ou pelo
            e-mail{" "}
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
          <h2 className="text-lg font-semibold mt-10 mb-3">
            Comunicações automáticas
          </h2>
          <p className="text-[15px] leading-relaxed text-foreground/80 mb-4">
            O produto envia mensagens automáticas para manter a prática ativa,
            incluindo lembretes de estudo, notificações de status da conta,
            resumos de progresso e mensagens de reengajamento após período de
            inatividade.
          </p>
          <p className="text-[15px] leading-relaxed text-foreground/80 mb-4">
            Podemos ocasionalmente entrar em contato para coleta de feedback e
            informações úteis para melhoria do produto. Essas solicitações não
            são obrigatórias.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-10 mb-3">
            Conteúdo e material
          </h2>
          <p className="text-[15px] leading-relaxed text-foreground/80 mb-4">
            O Fluizer não é uma escola de idiomas e não oferece currículo
            próprio obrigatório. O serviço processa o material enviado pelo
            próprio usuário. Podemos disponibilizar materiais próprios como
            vocabulários, textos e conteúdos de exemplo, mas isso não
            caracteriza o Fluizer como instituição de ensino.
          </p>
          <p className="text-[15px] leading-relaxed text-foreground/80 mb-4">
            O usuário pode enviar material proveniente de cursos, escolas ou
            qualquer outra fonte. O Fluizer não tem responsabilidade sobre a
            origem, autoria ou direitos autorais do material enviado. Essa
            responsabilidade é exclusiva do usuário. Não temos vínculo com
            escolas, cursos ou instituições cujo material possa ser enviado ao
            produto.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-10 mb-3">
            Sua responsabilidade sobre o conteúdo
          </h2>
          <p className="text-[15px] leading-relaxed text-foreground/80 mb-4">
            O conteúdo das perguntas e respostas geradas é dependente do
            material enviado pelo usuário. É de total responsabilidade do
            usuário não enviar documentos contendo dados pessoais sensíveis,
            senhas próprias ou de terceiros, ou qualquer informação
            confidencial.
          </p>
          <p className="text-[15px] leading-relaxed text-foreground/80 mb-4">
            O envio de materiais com conteúdo inapropriado, de baixo calão,
            violento, relacionado a armas, drogas, bebidas alcoólicas ou
            qualquer conteúdo contrário à legislação brasileira é de
            responsabilidade exclusiva do usuário. O Fluizer não tem controle
            sobre o conteúdo do material enviado.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-10 mb-3">
            Processamento por IA
          </h2>
          <p className="text-[15px] leading-relaxed text-foreground/80 mb-4">
            O produto utiliza modelos de inteligência artificial dos
            fornecedores Anthropic, OpenAI e Google. Os dados transitam por
            essas plataformas para geração de perguntas e avaliação de
            respostas.
          </p>
          <p className="text-[15px] leading-relaxed text-foreground/80 mb-4">
            É de total responsabilidade do usuário não enviar documentos com
            dados pessoais, senhas ou informações confidenciais próprias ou de
            terceiros.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-10 mb-3">Suporte</h2>
          <p className="text-[15px] leading-relaxed text-foreground/80 mb-4">
            Disponível diretamente pelo produto via WhatsApp ou pelo e-mail{" "}
            <a
              href="mailto:hello@fluizer.com"
              className="underline underline-offset-2"
            >
              hello@fluizer.com
            </a>
            .
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
