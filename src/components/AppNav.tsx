import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import neoLogo from '../assets/neo-logo.svg';

interface AppNavProps {
  breadcrumbText?: string;
  subtitle?: string;
  rightActions?: React.ReactNode;
}

const AppNav: React.FC<AppNavProps> = ({ breadcrumbText, subtitle, rightActions }) => {
  const navigate = useNavigate();

  return (
    <div className="flex-shrink-0">
      <div className="bg-card rounded-2xl shadow-sm">
        <div className="mx-auto px-3 md:px-6 py-2 md:py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
            <div className="min-w-0">
              <div className="flex items-center gap-1 md:gap-2">
                <Button
                  variant="ghost"
                  onClick={() => navigate('/')}
                  className="h-auto p-0 text-xl md:text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent hover:opacity-80 cursor-pointer shrink-0"
                >
                  NeoStudio
                </Button>
                {breadcrumbText && (
                  <>
                    <ChevronRight className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground shrink-0 hidden sm:block" />
                    <img src={neoLogo} alt="Neo" className="h-4 w-4 md:h-5 md:w-5 shrink-0 hidden sm:block" />
                    <span className="text-base md:text-lg font-semibold text-muted-foreground truncate hidden sm:inline">{breadcrumbText}</span>
                  </>
                )}
              </div>
              {subtitle && (
                <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">{subtitle}</p>
              )}
            </div>
          </div>
          {rightActions && (
            <div className="flex items-center gap-1 md:gap-2 shrink-0">
              {rightActions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppNav;

