import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Lang, Dict, translations, LANGUAGES } from "./translations";

const STORAGE_KEY = "schengen-days-lang";
export type LangSelection = "system" | Lang;

function browserLang(): Lang {
  const browser = navigator.language.slice(0, 2).toLowerCase();
  const match = LANGUAGES.find((l) => l.code === browser);
  return match ? match.code : "en";
}

function loadSelection(): LangSelection {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "system") return "system";
  if (saved && translations[saved as Lang]) return saved as Lang;
  return "system";
}

interface LanguageContextValue {
  lang: Lang;
  selection: LangSelection;
  setLang: (l: LangSelection) => void;
  t: Dict;
  isRtl: boolean;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [selection, setSelectionState] = useState<LangSelection>(loadSelection);
  const lang: Lang = selection === "system" ? browserLang() : selection;

  const setLang = (l: LangSelection) => {
    setSelectionState(l);
    localStorage.setItem(STORAGE_KEY, l);
  };

  const isRtl = Boolean(LANGUAGES.find((l) => l.code === lang)?.rtl);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = isRtl ? "rtl" : "ltr";
  }, [lang, isRtl]);

  return (
    <LanguageContext.Provider value={{ lang, selection, setLang, t: translations[lang], isRtl }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside LanguageProvider");
  return ctx;
}
