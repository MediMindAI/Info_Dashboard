import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { t as tFn, getLang } from '../i18n';

interface TranslationContextValue {
  t: (key: string) => string;
  lang: string;
}

const TranslationContext = createContext<TranslationContextValue>({
  t: tFn,
  lang: getLang(),
});

export function useTranslation(): TranslationContextValue {
  return useContext(TranslationContext);
}

export function TranslationProvider({ children }: { children: ReactNode }): JSX.Element {
  return (
    <TranslationContext.Provider value={{ t: tFn, lang: getLang() }}>
      {children}
    </TranslationContext.Provider>
  );
}
