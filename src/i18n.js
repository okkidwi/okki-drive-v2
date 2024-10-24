import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import translationEN from './translation/en.translation.json';
import translationID from './translation/id.translation.json';

const resources = {
  en: {
    translation: translationEN
  },
  id: {
    translation: translationID
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // Default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
