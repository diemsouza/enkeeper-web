import Nav from "@/src/components/home/nav";
import Footer from "@/src/components/home/footer";

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main className="w-full flex-1 px-6 pb-20 pt-24 sm:pt-28">{children}</main>
      <Footer />
    </div>
  );
}
