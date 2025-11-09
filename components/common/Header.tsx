import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../hooks/useTheme';
import ThemeToggleButton from './ThemeToggleButton';
import { logoSvg } from '../../assets/logo';
import { t } from '../../translations';

interface HeaderProps {
  title: string;
  onBack?: () => void;
  backText?: string;
  children?: React.ReactNode;
  onLogout?: () => void;
}

const MenuIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
);

const Header: React.FC<HeaderProps> = ({ title, onBack, backText, children, onLogout }) => {
  const [theme, toggleTheme] = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);


  return (
    <header className="bg-surface/80 backdrop-blur-lg sticky top-0 z-20 border-b border-border">
      <div className="max-w-7xl mx-auto py-3 px-4 sm:px-6 lg:px-8 relative">
        <div className="flex items-center justify-between gap-4">

          {/* RIGHT Group (Logo & Title) */}
          <div className="flex items-center gap-3">
             <h1 className="text-lg font-bold text-primary tracking-tight text-right">
                {title}
             </h1>
             <div className="w-10 h-10" dangerouslySetInnerHTML={{ __html: logoSvg }} />
          </div>

          {/* LEFT Group (Buttons) */}
          <div className="flex items-center justify-end gap-2">
            {onBack && (
              <button onClick={onBack} className="text-accent hover:underline transition-colors text-sm font-medium hidden sm:block">
                &larr; {backText}
              </button>
            )}

            <div className="hidden sm:flex items-center gap-2">
                {children}
                {onLogout && (
                    <button onClick={onLogout} className="px-3 py-1.5 text-sm bg-danger-soft text-danger font-medium rounded-lg hover:bg-danger hover:text-primary transition-colors border border-danger/50">
                        {t.logout}
                    </button>
                )}
            </div>

            <ThemeToggleButton theme={theme} toggleTheme={toggleTheme} />

            {(React.Children.count(children) > 0 || onLogout || onBack) && (
                <div className="sm:hidden">
                    <button
                        onClick={() => setIsMenuOpen(prev => !prev)}
                        className="p-2 rounded-full text-secondary hover:text-primary hover:bg-border transition-colors"
                        aria-label={t.openMenu}
                    >
                        <MenuIcon />
                    </button>
                </div>
            )}
          </div>

        </div>

        {isMenuOpen && (React.Children.count(children) > 0 || onLogout || onBack) && (
            <div ref={menuRef} className="sm:hidden absolute top-full right-4 mt-2 w-56 bg-surface rounded-md shadow-lg border border-border z-30 p-2 animate-fade-in-down">
                <div className="flex flex-col gap-1">
                    {onBack && (
                      <button onClick={() => { onBack(); setIsMenuOpen(false); }} className="w-full text-right justify-start px-3 py-2 text-sm text-accent font-medium rounded-lg hover:bg-border transition-colors flex items-center gap-2">
                         &larr; {backText}
                      </button>
                    )}

                    {React.Children.map(children, (child) => {
                        if (React.isValidElement<{ onClick?: () => void; className?: string }>(child)) {
                            return React.cloneElement(child, {
                                className: 'w-full text-right justify-start px-3 py-2 text-sm text-primary font-medium rounded-lg hover:bg-border transition-colors flex items-center gap-2',
                                onClick: () => {
                                    if (child.props.onClick) {
                                        child.props.onClick();
                                    }
                                    setIsMenuOpen(false);
                                },
                            });
                        }
                        return child;
                    })}
                    {(onBack || React.Children.count(children) > 0) && (onLogout) && <div className="border-t border-border my-1"></div>}

                    {onLogout && (
                          <button onClick={() => { onLogout(); setIsMenuOpen(false); }} className="w-full text-right justify-start px-3 py-2 text-sm text-danger font-medium rounded-lg hover:bg-danger-soft transition-colors flex items-center gap-2">
                              {t.logout}
                          </button>
                    )}
                </div>
                 <style>{`
                    @keyframes fade-in-down {
                        0% { opacity: 0; transform: translateY(-10px) scale(0.95); }
                        100% { opacity: 1; transform: translateY(0) scale(1); }
                    }
                    .animate-fade-in-down { animation: fade-in-down 0.2s ease-out forwards; }
                `}</style>
            </div>
        )}
      </div>
    </header>
  );
};

export default Header;
