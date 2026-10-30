import { useLanguage } from "../i18n/LanguageContext";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Header() {
  const { t } = useLanguage();
  return (
    <header className="app-header">
      <div className="app-header__controls">
        <LanguageSwitcher />
      </div>
      <div className="app-header__top">
        <img className="app-header__logo" src={`${import.meta.env.BASE_URL}logo.svg`} alt="" width={56} height={56} />
        <div className="app-header__text">
          <h1>{t.appTitle}</h1>
          <p>{t.appSubtitle}</p>
        </div>
      </div>
    </header>
  );
}
