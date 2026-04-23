"use client";

import React, { useState, useEffect } from "react";
import { MessageCircle, Moon, Sun } from "lucide-react";
import { Button } from "@/src/components/ui/button";
//import { useToast } from "@/components/ui/use-toast";

const Navbar = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  //const { toast } = useToast();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    // Check for user's preferred color scheme
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    }

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle("dark");
    // TODO: refactory
    // toast({
    //   title: isDarkMode ? "Modo claro ativado" : "Modo escuro ativado",
    //   duration: 2000,
    // });
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "py-3 glass-effect border-b shadow-sm"
          : "py-5 bg-transparent"
      }`}
    >
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-chat-purple" />
            <span className="text-xl font-bold">Chat</span>
          </div>

          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              className="hidden md:inline-flex"
              asChild
            >
              <a href="#request-form">Fale Conosco</a>
            </Button>
            <Button
              variant="default"
              size="sm"
              className="hidden md:inline-flex"
            >
              <a href="#pricing">Comece Agora</a>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {isDarkMode ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
