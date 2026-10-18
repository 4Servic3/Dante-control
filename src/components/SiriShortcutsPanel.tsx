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
  tone: 'amber' | 'emerald' | 'sky';
}

const SIRI_SHORTCUTS: SiriShortcutItem[] = [
  {
    param: 'mamar_esquerdo',
    voicePhrase: '"E aí Siri, mamar peito esquerdo"',
    description: 'Inicia o cronômetro de mamada no Peito Esquerdo',
    tone: 'amber',
  },
  {
    param: 'mamar_direito',
    voicePhrase: '"E aí Siri, mamar peito direito"',
    description: 'Inicia o cronômetro de mamada no Peito Direito',
    tone: 'amber',
  },
  {
    param: 'parar_mamada',
    voicePhrase: '"E aí Siri, parar mamada"',
    description: 'Finaliza a mamada ativa e salva no histórico',
    tone: 'amber',
  },
  {
    param: 'xixi',
    voicePhrase: '"E aí Siri, fralda de xixi"',
    description: 'Registra imediatamente uma fralda de Só Xixi',
    tone: 'emerald',
  },
  {
    param: 'coco',
    voicePhrase: '"E aí Siri, fralda de cocô"',
    description: 'Registra imediatamente uma fralda de Só Cocô',
    tone: 'emerald',
  },
  {
    param: 'xixi_coco',
    voicePhrase: '"E aí Siri, fralda de xixi e cocô"',
    description: 'Registra imediatamente uma fralda de Xixi + Cocô',
    tone: 'emerald',
  },
  {
    param: 'dormiu',
    voicePhrase: '"E aí Siri, o bebê dormiu"',
    description: 'Inicia o cronômetro de sono do bebê',
    tone: 'sky',
  },
  {
    param: 'acordou',
    voicePhrase: '"E aí Siri, o bebê acordou"',
    description: 'Finaliza o cronômetro de sono e salva no histórico',
    tone: 'sky',
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
      // Fallback caso clipboard não esteja disponível
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
    // Atualiza a URL com ?siri=... antes de disparar para demonstrar a limpeza via replaceState
    try {
      window.history.replaceState({}, '', `/?siri=${param}`);
    } catch {
      // ignore
    }
    executeSiriCommand(param);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-md max-h-[88vh] bg-[#0f172a] border-t sm:border border-slate-700/80 rounded-t-3xl sm:rounded-3xl flex flex-col shadow-2xl overflow-hidden">
        {/* Cabeçalho do Modal Configurar Siri */}
        <div className="px-4 py-3.5 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-amber-500/25 via-sky-500/25 to-emerald-500/25 border border-amber-400/40 flex items-center justify-center text-amber-200">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-100 leading-tight">
                Configurar Siri & Instalar no iPhone
              </h2>
              <p className="text-[11px] text-slate-400">
                Comandos de voz de madrugada sem usar as mãos
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 text-slate-300 hover:text-white active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Conteúdo rolável com links exatos para copiar */}
        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Guia Rápido de Atalhos do iOS */}
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-3 space-y-1.5">
            <div className="text-xs font-bold text-amber-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Como configurar no app "Atalhos" do iPhone:
            </div>
            <ol className="text-[11px] text-slate-300 space-y-1 list-decimal list-inside">
              <li>Copie o link do comando desejado abaixo.</li>
              <li>
                Abra o app <strong>Atalhos (Shortcuts)</strong> no iPhone e toque em{' '}
                <strong>+</strong>.
              </li>
              <li>
                Adicione a ação <strong>"Abrir URLs"</strong> e cole o link copiado.
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
                  className="rounded-2xl bg-slate-900/90 border border-slate-800/90 p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div
                        className={`text-xs font-bold ${
                          item.tone === 'amber'
                            ? 'text-amber-200'
                            : item.tone === 'emerald'
                            ? 'text-emerald-200'
                            : 'text-sky-200'
                        }`}
                      >
                        {item.voicePhrase}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {item.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleTestCommand(item.param)}
                      className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-semibold text-slate-200 flex items-center gap-1 shrink-0 active:scale-95"
                      title="Simular comando da Siri agora"
                    >
                      <Play className="w-3 h-3 fill-current text-amber-300" />
                      Testar
                    </button>
                  </div>

                  {/* Caixa com URL exata e botão Copiar */}
                  <div className="flex items-center justify-between gap-2 bg-slate-950/90 border border-slate-800 rounded-xl px-2.5 py-1.5">
                    <code className="text-[11px] font-mono text-slate-300 truncate">
                      {fullUrl}
                    </code>

                    <button
                      type="button"
                      onClick={() => handleCopyUrl(item.param)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 shrink-0 transition-all active:scale-95 ${
                        isCopied
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-amber-500/20 text-amber-200 border border-amber-400/40 hover:bg-amber-500/30'
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
          <div className="rounded-2xl bg-sky-950/30 border border-sky-500/30 p-3 flex items-start gap-2.5">
            <Smartphone className="w-4 h-4 text-sky-300 shrink-0 mt-0.5" />
            <div className="text-[11px] text-sky-100/90 leading-relaxed">
              <strong>Instalar como App no iPhone (Tela Cheia):</strong> No Safari, toque em{' '}
              <strong>Compartilhar</strong> e selecione{' '}
              <strong>"Adicionar à Tela de Início"</strong>. O app abrirá como{' '}
              <em>Rotina Bebê</em> sem barras do navegador.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
