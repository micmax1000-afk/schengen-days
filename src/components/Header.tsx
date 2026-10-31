import { useLanguage } from "../i18n/LanguageContext";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Header() {
  const { t } = useLanguage();
  return (
    <header className="app-header">
      <img className="app-header__logo" src={`${import.meta.env.BASE_URL}logo.svg`} alt="" width={56} height={56} />
      {/* Il nome non si vede (resta solo l'icona), ma lo leggono i lettori di schermo */}
      <h1 className="visually-hidden">{t.appTitle}</h1>
      <LanguageSwitcher />
    </header>
  );
}
