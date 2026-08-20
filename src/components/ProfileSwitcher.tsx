import { useState } from "react";
import { Profile } from "../utils/useProfiles";
import { useLanguage } from "../i18n/LanguageContext";

interface Props {
  profiles: Profile[];
  activeProfileId: string;
  onSwitch: (id: string) => void;
  onAdd: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

export default function ProfileSwitcher({ profiles, activeProfileId, onSwitch, onAdd, onRename, onDelete }: Props) {
  const { t } = useLanguage();
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");

  const active = profiles.find((p) => p.id === activeProfileId);

  const startRename = () => {
    setNameDraft(active?.name ?? "");
    setEditing(true);
  };

  const confirmRename = () => {
    if (active && nameDraft.trim()) onRename(active.id, nameDraft.trim());
    setEditing(false);
  };

  const confirmAdd = () => {
    if (newName.trim()) onAdd(newName.trim());
    setNewName("");
    setAdding(false);
  };

  return (
    <section className="profile-switcher">
      <div className="profile-switcher__row">
        <select
          className="profile-switcher__select"
          value={activeProfileId}
          onChange={(e) => onSwitch(e.target.value)}
          aria-label={t.profileLabel}
        >
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <button type="button" onClick={startRename} className="profile-switcher__icon-btn" aria-label={t.renameProfile}>
          ✎
        </button>
        <button type="button" onClick={() => setAdding(true)} className="profile-switcher__icon-btn" aria-label={t.addProfile}>
          +
        </button>
        {profiles.length > 1 && (
          <button
            type="button"
            onClick={() => window.confirm(t.deleteProfileConfirm) && onDelete(activeProfileId)}
            className="profile-switcher__icon-btn"
            aria-label={t.deleteProfile}
          >
            ✕
          </button>
        )}
      </div>

      {editing && (
        <div className="profile-switcher__inline-form">
          <input
            type="text"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            maxLength={40}
            autoFocus
          />
          <button type="button" onClick={confirmRename}>
            {t.saveChanges}
          </button>
        </div>
      )}

      {adding && (
        <div className="profile-switcher__inline-form">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t.newProfilePlaceholder}
            maxLength={40}
            autoFocus
          />
          <button type="button" onClick={confirmAdd}>
            {t.addProfile}
          </button>
        </div>
      )}
    </section>
  );
}
