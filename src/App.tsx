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
      <div className="min-h-screen bg-[#E5E5EA] text-[#1C1C1E] flex justify-center">
        {/* Proporção nativa de iPhone no padrão Apple Health Light Mode (#F2F2F7) */}
        <div className="w-full max-w-md mx-auto min-h-screen bg-[#F2F2F7] flex flex-col relative shadow-sm">
          {/* Cabeçalho e Painel de Tranquilidade no topo */}
          <TranquilityHeader />

          {/* Área principal das abas */}
          <main className="flex-1 flex flex-col">
            {activeTab === 'Rotina' && <RoutineControls />}
            {activeTab === 'Histórico' && <HistoryView />}
            {activeTab === 'Pediatra' && <PediatricianView />}
          </main>

          {/* Barra de Navegação Inferior Nativa do iOS */}
          <BottomNav activeTab={activeTab} onSelectTab={setActiveTab} />
        </div>
      </div>
    </RoutineProvider>
  );
};

export default App;
