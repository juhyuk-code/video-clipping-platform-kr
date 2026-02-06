"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { Globe } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";

const languages = [
  { code: "ko", label: "한국어" },
  { code: "en", label: "English" },
] as const;

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function switchLocale(newLocale: string) {
    if (newLocale === locale) {
      setOpen(false);
      return;
    }

    // Remove current locale prefix if present, then add new one
    let newPath = pathname;

    // Strip existing locale prefix
    for (const lang of languages) {
      if (pathname.startsWith(`/${lang.code}/`) || pathname === `/${lang.code}`) {
        newPath = pathname.slice(`/${lang.code}`.length) || "/";
        break;
      }
    }

    // Add new locale prefix (skip for default locale "ko" since localePrefix is "as-needed")
    if (newLocale === "ko") {
      router.push(newPath);
    } else {
      router.push(`/${newLocale}${newPath === "/" ? "" : newPath}`);
    }
    setOpen(false);
  }

  const currentLang = languages.find((l) => l.code === locale);

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5"
        onClick={() => setOpen(!open)}
      >
        <Globe className="h-4 w-4" />
        <span className="text-sm">{currentLang?.label}</span>
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-32 rounded-lg border bg-background shadow-lg z-50">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => switchLocale(lang.code)}
              className={`w-full px-3 py-2 text-left text-sm transition-colors hover:bg-accent ${
                locale === lang.code ? "font-medium text-primary" : ""
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
