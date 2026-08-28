import { useLocale } from '../context/LocaleContext';

export function LanguageToggle() {
  const { locale, setLocale, t } = useLocale();

  return (
    <div className="lang-toggle" role="group" aria-label={t('language')}>
      <button
        type="button"
        className={locale === 'ko' ? 'active' : ''}
        onClick={() => setLocale('ko')}
      >
        한
      </button>
      <button
        type="button"
        className={locale === 'en' ? 'active' : ''}
        onClick={() => setLocale('en')}
      >
        EN
      </button>
    </div>
  );
}
