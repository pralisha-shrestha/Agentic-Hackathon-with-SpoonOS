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
        <div className="mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={() => navigate('/')}
                  className="h-auto p-0 text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent hover:opacity-80 cursor-pointer"
                >
                  NeoStudio
                </Button>
                {breadcrumbText && (
                  <>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    <img src={neoLogo} alt="Neo" className="h-5 w-5" />
                    <span className="text-lg font-semibold text-muted-foreground">{breadcrumbText}</span>
                  </>
                )}
              </div>
              {subtitle && (
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              )}
            </div>
          </div>
          {rightActions && (
            <div className="flex items-center gap-2">
              {rightActions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppNav;

