import React, { useState } from 'react';
import { RoutineProvider } from './context/RoutineContext';
import { TranquilityHeader } from './components/TranquilityHeader';
import { RoutineControls } from './components/RoutineControls';
import { HistoryView } from './components/HistoryView';
import { PediatricianView } from './components/PediatricianView';
import { BottomNav } from './components/BottomNav';
import { ActiveTab } from './types/routine';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('Rotina');

  return (
    <RoutineProvider>
      {/* Fundo externo escuro para destaque suave em telas maiores */}
      <div className="min-h-screen bg-[#070b14] text-slate-100 flex justify-center">
        {/* Container principal simulando proporção de iPhone (max-w-md mx-auto min-h-screen) */}
        <div className="w-full max-w-md mx-auto min-h-screen bg-[#0f172a] flex flex-col shadow-2xl border-x border-slate-800/60 relative">
          {/* Painel de Tranquilidade sempre visível no topo */}
          <TranquilityHeader />

          {/* Área central ativa conforme a aba selecionada */}
          <main className="flex-1 flex flex-col">
            {activeTab === 'Rotina' && <RoutineControls />}
            {activeTab === 'Histórico' && <HistoryView />}
            {activeTab === 'Pediatra' && <PediatricianView />}
          </main>

          {/* Barra de navegação inferior simples para um polegar */}
          <BottomNav activeTab={activeTab} onSelectTab={setActiveTab} />
        </div>
      </div>
    </RoutineProvider>
  );
};

export default App;
