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
      icon: <Baby className="w-5 h-5" />,
    },
    {
      id: 'Histórico',
      label: 'Histórico',
      icon: <History className="w-5 h-5" />,
    },
    {
      id: 'Pediatra',
      label: 'Pediatra',
      icon: <Stethoscope className="w-5 h-5" />,
    },
  ];

  return (
    <nav
      aria-label="Navegação principal"
      className="sticky bottom-0 z-20 bg-[#0f172a]/95 backdrop-blur-lg border-t border-slate-800/90 px-4 pt-2 pb-4"
    >
      <div className="grid grid-cols-3 gap-2">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`py-2 px-3 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${
                isActive
                  ? 'bg-slate-800/90 text-amber-300 border border-amber-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              {item.icon}
              <span className="text-[11px] font-semibold tracking-wide">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Indicador visual estilo barra Home do iPhone */}
      <div className="mt-2.5 flex justify-center">
        <div className="w-28 h-1 rounded-full bg-slate-700/70" />
      </div>
    </nav>
  );
};
