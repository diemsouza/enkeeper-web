"use client";

import { Facebook, Instagram, Linkedin, Twitter } from "lucide-react";

export function FooterSocial() {
  return (
    <div className="flex items-center justify-center gap-6 py-4 opacity-80 hover:opacity-100 transition">
      <a
        href="https://instagram.com/dropuz"
        target="_blank"
        rel="noreferrer"
        aria-label="Instagram"
        className="hover:opacity-70 transition"
      >
        <Instagram className="h-5 w-5" />
      </a>

      <a
        href="https://linkedin.com/company/dropuz"
        target="_blank"
        rel="noreferrer"
        aria-label="LinkedIn"
        className="hover:opacity-70 transition"
      >
        <Linkedin className="h-5 w-5" />
      </a>

      <a
        href="https://twitter.com/dropuz"
        target="_blank"
        rel="noreferrer"
        aria-label="X / Twitter"
        className="hover:opacity-70 transition"
      >
        <Twitter className="h-5 w-5" />
      </a>

      <a
        href="https://facebook.com/dropuz"
        target="_blank"
        rel="noreferrer"
        aria-label="Facebook"
        className="hover:opacity-70 transition"
      >
        <Facebook className="h-5 w-5" />
      </a>
    </div>
  );
}
