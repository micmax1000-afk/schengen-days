import { useLanguage } from "../i18n/LanguageContext";
import LanguageSwitcher from "./LanguageSwitcher";
import ProfileSwitcher from "./ProfileSwitcher";
import { Profile } from "../utils/useProfiles";

interface Props {
  profiles: Profile[];
  activeProfileId: string;
  onSwitchProfile: (id: string) => void;
  onAddProfile: (name: string) => void;
  onRenameProfile: (id: string, name: string) => void;
  onDeleteProfile: (id: string) => void;
}

export default function Header({
  profiles,
  activeProfileId,
  onSwitchProfile,
  onAddProfile,
  onRenameProfile,
  onDeleteProfile,
}: Props) {
  const { t } = useLanguage();
  return (
    <header className="app-header">
      <div className="app-header__top">
        <span className="app-header__stamp">90/180</span>
        <div className="app-header__text">
          <h1>{t.appTitle}</h1>
          <p>{t.appSubtitle}</p>
        </div>
      </div>
      <p className="app-header__disclaimer">⚠️ {t.disclaimer}</p>
      <div className="app-header__controls">
        <ProfileSwitcher
          profiles={profiles}
          activeProfileId={activeProfileId}
          onSwitch={onSwitchProfile}
          onAdd={onAddProfile}
          onRename={onRenameProfile}
          onDelete={onDeleteProfile}
        />
        <LanguageSwitcher />
      </div>
    </header>
  );
}
