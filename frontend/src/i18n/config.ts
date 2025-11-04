import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enUS from './locales/en-US.json';
import hu from './locales/hu.json';
import de from './locales/de.json';

const resources = {
    'en-US': { translation: enUS },
    'hu': { translation: hu },
    'de': { translation: de }
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'en-US',
        supportedLngs: ['en-US', 'hu', 'de'],
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage'],
            lookupLocalStorage: 'i18nextLng'
        },
        interpolation: {
            escapeValue: false
        }
    });

export default i18n;
