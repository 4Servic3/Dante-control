import React from 'react';
import { Baby, History, Stethoscope } from 'lucide-react';
import { ActiveTab } from '../types/routine';

interface BottomNavProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onSelectTab }) => {
  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'Rotina',
      label: 'Rotina',
      icon: <Baby className="w-6 h-6" />,
    },
    {
      id: 'Histórico',
      label: 'Histórico',
      icon: <History className="w-6 h-6" />,
    },
    {
      id: 'Pediatra',
      label: 'Pediatra',
      icon: <Stethoscope className="w-6 h-6" />,
    },
  ];

  return (
    <nav
      aria-label="Navegação principal"
      className="sticky bottom-0 z-20 bg-white/85 backdrop-blur-xl border-t border-black/10 px-6 pt-2 pb-3"
    >
      <div className="grid grid-cols-3">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`py-1 flex flex-col items-center justify-center gap-0.5 transition-colors active:scale-95 ${
                isActive ? 'text-[#007AFF]' : 'text-[#8E8E93] hover:text-[#1C1C1E]'
              }`}
            >
              {item.icon}
              <span className="text-[10px] font-semibold tracking-tight">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Indicador Home nativo do iOS */}
      <div className="mt-2 flex justify-center">
        <div className="w-32 h-1 rounded-full bg-black/15" />
      </div>
    </nav>
  );
};
