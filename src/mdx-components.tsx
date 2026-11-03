import type { MDXComponents } from "mdx/types";
import Link from "next/link";
import { BlogCta } from "@/src/components/blog/blog-cta";
import { BlogFaq } from "@/src/components/blog/blog-faq";
import { BlogFigure } from "@/src/components/blog/blog-figure";
import { BlogPractice } from "@/src/components/blog/blog-practice";

function MdxLink({ href = "", children, ...rest }: React.ComponentProps<"a">) {
  if (href.startsWith("/")) {
    return (
      <Link href={href} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>
      {children}
    </a>
  );
}

const components: MDXComponents = {
  a: MdxLink,
  BlogCta,
  BlogFaq,
  BlogFigure,
  BlogPractice,
};

// Convencao obrigatoria do @next/mdx no App Router.
export function useMDXComponents(): MDXComponents {
  return components;
}
