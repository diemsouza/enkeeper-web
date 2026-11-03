import { describe, expect, it } from "vitest";
import {
  BLOG_POST_ORDER,
  BlogFrontmatterSchema,
  getBlogModifiedDate,
  getNextReadSlug,
  isValidBlogSlug,
  sortPostsByDateDesc,
} from "./blog";

describe("getNextReadSlug", () => {
  it("segue a ordem fixa", () => {
    expect(getNextReadSlug(BLOG_POST_ORDER[0])).toBe(BLOG_POST_ORDER[1]);
    expect(getNextReadSlug(BLOG_POST_ORDER[2])).toBe(BLOG_POST_ORDER[3]);
  });

  it("a ultima e slug desconhecido nao apontam para nenhuma (vai para /blog)", () => {
    expect(getNextReadSlug(BLOG_POST_ORDER[BLOG_POST_ORDER.length - 1])).toBeNull();
    expect(getNextReadSlug("nao-existe")).toBeNull();
  });
});

describe("isValidBlogSlug", () => {
  it("aceita minusculas com hifen", () => {
    expect(isValidBlogSlug("ingles-para-viagem-frases-essenciais")).toBe(true);
  });

  it("recusa acento, maiuscula, barra, hifen solto", () => {
    expect(isValidBlogSlug("inglês-viagem")).toBe(false);
    expect(isValidBlogSlug("Ingles")).toBe(false);
    expect(isValidBlogSlug("blog/ingles")).toBe(false);
    expect(isValidBlogSlug("-ingles")).toBe(false);
    expect(isValidBlogSlug("ingles--viagem")).toBe(false);
  });
});

describe("BlogFrontmatterSchema", () => {
  const valid = {
    title: "T",
    description: "D",
    slug: "a-b",
    date: "2026-11-03",
    cover: "/blog/a-b/capa.jpg",
    coverAlt: "Capa",
    domain: "travel",
    faq: [{ question: "Q?", answer: "A." }],
  };

  it("aceita frontmatter completo", () => {
    expect(BlogFrontmatterSchema.safeParse(valid).success).toBe(true);
  });

  it("aceita sem domain e com updated depois da data", () => {
    const { domain: _domain, ...withoutDomain } = valid;
    expect(BlogFrontmatterSchema.safeParse(withoutDomain).success).toBe(true);
    expect(BlogFrontmatterSchema.safeParse({ ...valid, updated: "2026-12-01" }).success).toBe(true);
  });

  it("recusa updated antes da data de publicacao", () => {
    expect(BlogFrontmatterSchema.safeParse({ ...valid, updated: "2026-10-01" }).success).toBe(false);
  });

  it("recusa domain desconhecido e data fora do formato", () => {
    expect(BlogFrontmatterSchema.safeParse({ ...valid, domain: "x" }).success).toBe(false);
    expect(BlogFrontmatterSchema.safeParse({ ...valid, date: "03/11/2026" }).success).toBe(false);
  });
});

describe("sortPostsByDateDesc", () => {
  it("mais recente primeiro", () => {
    const posts = [
      { frontmatter: { date: "2026-01-01" } },
      { frontmatter: { date: "2026-03-01" } },
    ];
    expect(sortPostsByDateDesc(posts)[0].frontmatter.date).toBe("2026-03-01");
  });
});

describe("getBlogModifiedDate", () => {
  it("usa updated quando existe, senao a data de publicacao", () => {
    expect(getBlogModifiedDate({ date: "2026-11-03" })).toBe("2026-11-03");
    expect(getBlogModifiedDate({ date: "2026-11-03", updated: "2026-12-01" })).toBe("2026-12-01");
  });
});
