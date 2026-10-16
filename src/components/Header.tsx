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
        <span className="app-header__stamp">90/180</span>
        <div className="app-header__text">
          <h1>{t.appTitle}</h1>
          <p>{t.appSubtitle}</p>
        </div>
      </div>
    </header>
  );
}
