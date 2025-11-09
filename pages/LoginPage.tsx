import React, { useState } from 'react';
import { t } from '../translations';
import { logoSvg } from '../assets/logo';
import Card from '../components/common/Card';

interface LoginPageProps {
  onLogin: (username: string, password: string) => Promise<boolean>;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
        const success = await onLogin(username, password);
        if (!success) {
          setError(t.loginError);
        }
    } catch (e) {
        setError(t.loginError);
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
            <div className="w-20 h-20 mb-4" dangerouslySetInnerHTML={{ __html: logoSvg }} />
            <h1 className="text-2xl font-bold text-primary">{t.appTitle}</h1>
        </div>

        <Card>
            <h2 className="text-xl font-bold text-primary text-center mb-6">{t.loginTitle}</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">{t.username}</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">{t.password}</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                  required
                />
              </div>

              {error && <p className="text-sm text-danger-soft bg-danger/20 p-2 rounded-lg text-center">{error}</p>}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full px-4 py-2.5 bg-accent text-accent-text font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-wait"
              >
                {isSubmitting ? '...' : t.loginButton}
              </button>
            </form>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
