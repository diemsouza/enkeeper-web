import Link from "next/link";

export function Footer() {
  return (
    <footer className="w-full py-6 px-4 md:px-6 border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">
            © 2026 Dropuz. Todos os direitos reservados.
          </span>
        </div>
        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          <Link href="#" className="hover:text-foreground transition-colors">
            Privacidade
          </Link>
          <Link href="#" className="hover:text-foreground transition-colors">
            Termos de uso
          </Link>
          <Link href="#" className="hover:text-foreground transition-colors">
            Contato
          </Link>
        </div>
      </div>
    </footer>
  );
}
