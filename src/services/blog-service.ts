import type { ComponentType } from "react";
import {
  BLOG_POST_ORDER,
  BlogFrontmatterSchema,
  sortPostsByDateDesc,
  type BlogFrontmatter,
} from "../core/blog";

export type BlogPost = {
  frontmatter: BlogFrontmatter;
  Content: ComponentType;
};

type MdxModule = { default: ComponentType; frontmatter: unknown };

// Frontmatter invalido ou slug diferente do arquivo quebra o build de proposito.
async function loadPost(slug: string): Promise<BlogPost> {
  const mod = (await import(`@/src/content/blog/${slug}.mdx`)) as MdxModule;
  const parsed = BlogFrontmatterSchema.safeParse(mod.frontmatter);
  if (!parsed.success) {
    throw new Error(`[blog] frontmatter invalido em ${slug}.mdx: ${parsed.error.message}`);
  }
  if (parsed.data.slug !== slug) {
    throw new Error(`[blog] slug "${parsed.data.slug}" difere do arquivo ${slug}.mdx`);
  }
  return { frontmatter: parsed.data, Content: mod.default };
}

export async function listBlogPosts(): Promise<BlogPost[]> {
  const posts = await Promise.all(BLOG_POST_ORDER.map(loadPost));
  return sortPostsByDateDesc(posts);
}

export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  const isPublished = (BLOG_POST_ORDER as readonly string[]).includes(slug);
  return isPublished ? loadPost(slug) : null;
}
