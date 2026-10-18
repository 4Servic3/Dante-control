import React, { useState } from 'react';
import {
  Check,
  Copy,
  Mic,
  Play,
  Smartphone,
  Sparkles,
  X,
} from 'lucide-react';
import { SiriCommandKey, useRoutine } from '../context/RoutineContext';

interface SiriShortcutItem {
  param: SiriCommandKey;
  voicePhrase: string;
  description: string;
  tone: 'peach' | 'blue' | 'indigo';
}

const SIRI_SHORTCUTS: SiriShortcutItem[] = [
  {
    param: 'mamar_esquerdo',
    voicePhrase: '"E aí Siri, mamar peito esquerdo"',
    description: 'Inicia o cronômetro de mamada no Peito Esquerdo',
    tone: 'peach',
  },
  {
    param: 'mamar_direito',
    voicePhrase: '"E aí Siri, mamar peito direito"',
    description: 'Inicia o cronômetro de mamada no Peito Direito',
    tone: 'peach',
  },
  {
    param: 'parar_mamada',
    voicePhrase: '"E aí Siri, parar mamada"',
    description: 'Finaliza a mamada ativa e salva no histórico',
    tone: 'peach',
  },
  {
    param: 'xixi',
    voicePhrase: '"E aí Siri, fralda de xixi"',
    description: 'Registra imediatamente uma fralda de Só Xixi',
    tone: 'blue',
  },
  {
    param: 'coco',
    voicePhrase: '"E aí Siri, fralda de cocô"',
    description: 'Registra imediatamente uma fralda de Só Cocô',
    tone: 'blue',
  },
  {
    param: 'xixi_coco',
    voicePhrase: '"E aí Siri, fralda de xixi e cocô"',
    description: 'Registra imediatamente uma fralda de Xixi + Cocô',
    tone: 'blue',
  },
  {
    param: 'dormiu',
    voicePhrase: '"E aí Siri, o bebê dormiu"',
    description: 'Inicia o cronômetro de sono do bebê',
    tone: 'indigo',
  },
  {
    param: 'acordou',
    voicePhrase: '"E aí Siri, o bebê acordou"',
    description: 'Finaliza o cronômetro de sono e salva no histórico',
    tone: 'indigo',
  },
];

interface SiriShortcutsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SiriShortcutsPanel: React.FC<SiriShortcutsPanelProps> = ({
  isOpen,
  onClose,
}) => {
  const { executeSiriCommand } = useRoutine();
  const [copiedParam, setCopiedParam] = useState<string | null>(null);

  if (!isOpen) return null;

  const baseUrl =
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';

  const handleCopyUrl = async (param: string) => {
    const fullUrl = `${baseUrl}/?siri=${param}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopiedParam(param);
      window.setTimeout(() => setCopiedParam(null), 2200);
    } catch {
      const input = document.createElement('input');
      input.value = fullUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopiedParam(param);
      window.setTimeout(() => setCopiedParam(null), 2200);
    }
  };

  const handleTestCommand = (param: SiriCommandKey) => {
    try {
      window.history.replaceState({}, '', `/?siri=${param}`);
    } catch {
      // ignore
    }
    executeSiriCommand(param);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-md max-h-[88vh] bg-[#F2F2F7] rounded-t-3xl sm:rounded-3xl flex flex-col shadow-2xl overflow-hidden">
        {/* Cabeçalho Estilo iOS Sheet */}
        <div className="px-5 py-4 bg-white/90 backdrop-blur-xl border-b border-black/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#EBF5FF] flex items-center justify-center text-[#007AFF]">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1C1C1E] leading-tight">
                Atalhos da Siri
              </h2>
              <p className="text-xs text-[#8E8E93]">
                Comandos de voz sem usar as mãos
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-[#F2F2F7] text-[#8E8E93] hover:text-[#1C1C1E] active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Conteúdo rolável */}
        <div className="p-4 space-y-3.5 overflow-y-auto">
          {/* Guia Rápido de Atalhos do iOS */}
          <div className="rounded-2xl bg-white p-4 shadow-sm border border-black/[0.04] space-y-1.5">
            <div className="text-xs font-bold text-[#1C1C1E] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#007AFF]" />
              Como configurar no app "Atalhos" do iPhone:
            </div>
            <ol className="text-xs text-[#8E8E93] space-y-1 list-decimal list-inside">
              <li>Copie o link do comando desejado abaixo.</li>
              <li>
                Abra o app <strong className="text-[#1C1C1E]">Atalhos</strong> no iPhone e toque em{' '}
                <strong className="text-[#1C1C1E]">+</strong>.
              </li>
              <li>
                Adicione a ação <strong className="text-[#1C1C1E]">"Abrir URLs"</strong> e cole o link.
              </li>
              <li>Dê o nome do comando de voz (ex: "Mamar peito esquerdo").</li>
            </ol>
          </div>

          {/* Lista de Links Exatos para a Siri */}
          <div className="space-y-2.5">
            {SIRI_SHORTCUTS.map((item) => {
              const fullUrl = `${baseUrl}/?siri=${item.param}`;
              const isCopied = copiedParam === item.param;

              return (
                <div
                  key={item.param}
                  className="rounded-2xl bg-white p-3.5 shadow-sm border border-black/[0.04] space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div
                        className={`text-xs font-bold ${
                          item.tone === 'peach'
                            ? 'text-[#FF6B4A]'
                            : item.tone === 'blue'
                            ? 'text-[#007AFF]'
                            : 'text-[#5856D6]'
                        }`}
                      >
                        {item.voicePhrase}
                      </div>
                      <p className="text-[11px] text-[#8E8E93] mt-0.5">
                        {item.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleTestCommand(item.param)}
                      className="px-3 py-1.5 rounded-full bg-[#F2F2F7] text-[11px] font-semibold text-[#1C1C1E] flex items-center gap-1 shrink-0 active:scale-95"
                      title="Simular comando da Siri agora"
                    >
                      <Play className="w-3 h-3 fill-current text-[#007AFF]" />
                      Testar
                    </button>
                  </div>

                  {/* Caixa com URL exata e botão Copiar */}
                  <div className="flex items-center justify-between gap-2 bg-[#F2F2F7] rounded-xl px-3 py-2">
                    <code className="text-[11px] font-mono text-[#1C1C1E] truncate">
                      {fullUrl}
                    </code>

                    <button
                      type="button"
                      onClick={() => handleCopyUrl(item.param)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 shrink-0 transition-all active:scale-95 ${
                        isCopied
                          ? 'bg-[#34C759] text-white'
                          : 'bg-[#007AFF] text-white'
                      }`}
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3 h-3 stroke-[3]" />
                          Copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          Copiar Link
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dica de Instalação PWA no Safari do iPhone */}
          <div className="rounded-2xl bg-[#EBF5FF] p-3.5 flex items-start gap-2.5">
            <Smartphone className="w-4 h-4 text-[#007AFF] shrink-0 mt-0.5" />
            <div className="text-xs text-[#1C1C1E] leading-relaxed">
              <strong className="text-[#007AFF]">Instalar no iPhone:</strong> No Safari, toque em{' '}
              <strong>Compartilhar</strong> e selecione{' '}
              <strong>"Adicionar à Tela de Início"</strong> para abrir em tela cheia.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
