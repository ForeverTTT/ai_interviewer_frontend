import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import zh from '../locales/zh.json'
import en from '../locales/en.json'
import de from '../locales/de.json'

const resources = {
  zh: { translation: zh },
  en: { translation: en },
  de: { translation: de },
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'zh',
    supportedLngs: ['zh', 'en', 'de'],
    load: 'languageOnly',
    nonExplicitSupportedLngs: true,
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'interviewde_lang',
      convertDetectedLanguage: (lng) => {
        const b = (lng || '').split('-')[0]
        return ['zh', 'en', 'de'].includes(b) ? b : 'zh'
      },
    },
  })

function applyHtmlLang(lng) {
  const map = { zh: 'zh-CN', en: 'en', de: 'de' }
  document.documentElement.lang = map[lng] || 'zh-CN'
}

applyHtmlLang(i18n.language || 'zh')
i18n.on('languageChanged', applyHtmlLang)

export default i18n
