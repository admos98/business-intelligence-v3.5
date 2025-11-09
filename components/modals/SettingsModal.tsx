import React, { useState, useEffect } from 'react';
import { t } from '../../translations';
import { useShoppingStore } from '../../store/useShoppingStore';
import { useToast } from '../common/Toast';

interface SettingsModalProps {
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const { githubToken: currentToken, gistId: currentGistId, setApiCredentials } = useShoppingStore();
  const { addToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [githubToken, setGithubToken] = useState(currentToken);
  const [gistId, setGistId] = useState(currentGistId);

  useEffect(() => { setIsOpen(true); }, []);
  
  const handleClose = () => {
    setIsOpen(false);
    setTimeout(onClose, 300);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setApiCredentials(githubToken, gistId);
    addToast(t.settingsSaved, 'success');
    handleClose();
  };

  return (
    <div
      className={`fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
      onClick={handleClose}
    >
      <div
        className={`bg-surface p-6 rounded-xl border border-border w-full max-w-md transition-all duration-300 ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-primary mb-2">{t.settingsTitle}</h2>
        <p className="text-sm text-secondary mb-6">{t.settingsDescription}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">{t.githubToken}</label>
            <input
              type="password" value={githubToken} onChange={(e) => setGithubToken(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">{t.gistId}</label>
            <input
              type="text" value={gistId} onChange={(e) => setGistId(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
              required
            />
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={handleClose} className="px-4 py-2 bg-border text-primary font-medium rounded-lg hover:bg-border/70 transition-colors">
              {t.cancel}
            </button>
            <button type="submit" className="px-4 py-2 bg-accent text-accent-text font-medium rounded-lg hover:opacity-90 transition-opacity">
              {t.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettingsModal;