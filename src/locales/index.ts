import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// 언어 리소스 import
import koTranslation from './ko.json';
import enTranslation from './en.json';

const resources = {
  ko: {
    translation: koTranslation
  },
  en: {
    translation: enTranslation
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: 'ko', // 기본 언어
    fallbackLng: 'ko', // 번역이 없을 때 사용할 언어
    
    interpolation: {
      escapeValue: false, // React에서는 XSS 보호가 기본으로 되어있음
    },
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
    
    react: {
      useSuspense: false,
    },
  });

export default i18n; 