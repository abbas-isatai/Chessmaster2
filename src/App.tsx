import React, { useState, useEffect } from 'react';
import { GameReview } from './components/GameReview';
import { OfflinePlay } from './components/OfflinePlay';
import { BotPlay } from './components/BotPlay';
import { LegalScreens } from './components/LegalScreens';
import { OnboardingModal } from './components/OnboardingModal';
import { ApkExportModal } from './components/ApkExportModal';
import { TacticsPuzzleSection } from './components/TacticsPuzzle';
import type { ActiveTab } from './types/chess';
import {
  Search,
  Users,
  Bot,
  Shield,
  Smartphone,
  Wifi,
  Battery,
  Signal,
  Flame,
  HelpCircle,
  Download,
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('review');
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [showApkModal, setShowApkModal] = useState<boolean>(false);
  const [reviewPgn, setReviewPgn] = useState<string | undefined>(undefined);
  const [currentTime, setCurrentTime] = useState<string>('09:41');

  // Check onboarding on initial mount
  useEffect(() => {
    const accepted = localStorage.getItem('chess_onboarding_accepted');
    if (!accepted) {
      setShowOnboarding(true);
    }

    const updateClock = () => {
      const d = new Date();
      const h = d.getHours().toString().padStart(2, '0');
      const m = d.getMinutes().toString().padStart(2, '0');
      setCurrentTime(`${h}:${m}`);
    };
    updateClock();
    const interval = setInterval(updateClock, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleReviewPgn = (pgn: string) => {
    setReviewPgn(pgn);
    setActiveTab('review');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex justify-center selection:bg-emerald-500 selection:text-slate-950 font-sans">
      {/* Mobile/Android Shell Container */}
      <div className="w-full max-w-2xl bg-slate-950 border-x border-slate-800/80 min-h-screen flex flex-col relative shadow-2xl overflow-hidden">
        {/* Android Native Status Bar */}
        <div className="bg-slate-950 text-slate-400 px-4 py-1.5 flex items-center justify-between text-[11px] font-mono border-b border-slate-900 select-none z-40">
          <span className="font-bold text-slate-200">{currentTime}</span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-emerald-400 font-bold tracking-tight">CPU 100% LOCAL</span>
            <Signal className="w-3.5 h-3.5 text-slate-400" />
            <Wifi className="w-3.5 h-3.5 text-slate-400" />
            <Battery className="w-4 h-4 text-slate-300" />
          </div>
        </div>

        {/* Quick APK Download Action Banner */}
        <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-emerald-950/80 border-b border-emerald-500/30 px-3 py-1.5 flex items-center justify-between text-xs z-30 shadow-sm">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="flex h-2 w-2 relative flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-semibold text-slate-200 truncate">
              Avelux Grand APK v1.0.0 (4.5 MB • Signed)
            </span>
          </div>
          <button
            onClick={() => setShowApkModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[11px] rounded-lg shadow transition flex-shrink-0 cursor-pointer active:scale-95"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            Download APK
          </button>
        </div>

        {/* Tab View Container */}
        <main className="flex-1 overflow-hidden relative">
          {activeTab === 'review' && (
            <GameReview
              initialPgn={reviewPgn}
              onOpenApkModal={() => setShowApkModal(true)}
              onNavigateToPuzzles={() => setActiveTab('puzzles')}
            />
          )}

          {activeTab === 'offline' && (
            <OfflinePlay onReviewGame={handleReviewPgn} />
          )}

          {activeTab === 'bots' && (
            <BotPlay onReviewGame={handleReviewPgn} />
          )}

          {activeTab === 'puzzles' && (
            <TacticsPuzzleSection onGoToReview={() => setActiveTab('review')} />
          )}

          {activeTab === 'legal' && (
            <LegalScreens onBack={() => setActiveTab('review')} />
          )}
        </main>

        {/* Android Material You Bottom Navigation Bar */}
        <nav className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto bg-slate-900/95 backdrop-blur-lg border-t border-slate-800/80 px-2 py-2 flex items-center justify-around z-40 select-none shadow-2xl">
          {/* Review Tab */}
          <button
            onClick={() => setActiveTab('review')}
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-2xl transition ${
              activeTab === 'review' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className={`p-1.5 rounded-xl transition ${activeTab === 'review' ? 'bg-emerald-500/20' : ''}`}>
              <Search className="w-5 h-5" />
            </div>
            <span className="text-[10px] tracking-tight">Review</span>
          </button>

          {/* Tactics Puzzle Tab */}
          <button
            onClick={() => setActiveTab('puzzles')}
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-2xl transition ${
              activeTab === 'puzzles' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className={`p-1.5 rounded-xl transition ${activeTab === 'puzzles' ? 'bg-amber-500/20' : ''}`}>
              <Flame className="w-5 h-5" />
            </div>
            <span className="text-[10px] tracking-tight">Puzzles</span>
          </button>

          {/* Offline 2P Tab */}
          <button
            onClick={() => setActiveTab('offline')}
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-2xl transition ${
              activeTab === 'offline' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className={`p-1.5 rounded-xl transition ${activeTab === 'offline' ? 'bg-emerald-500/20' : ''}`}>
              <Users className="w-5 h-5" />
            </div>
            <span className="text-[10px] tracking-tight">Pass & Play</span>
          </button>

          {/* Bots Tab */}
          <button
            onClick={() => setActiveTab('bots')}
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-2xl transition ${
              activeTab === 'bots' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className={`p-1.5 rounded-xl transition ${activeTab === 'bots' ? 'bg-emerald-500/20' : ''}`}>
              <Bot className="w-5 h-5" />
            </div>
            <span className="text-[10px] tracking-tight">Bots (7-19)</span>
          </button>

          {/* APK Center Button */}
          <button
            onClick={() => setShowApkModal(true)}
            className="flex flex-col items-center gap-1 py-1 px-2.5 rounded-2xl text-emerald-400 hover:text-emerald-300 transition"
            title="Convert to Android APK & View Java Source"
          >
            <div className="p-1.5 rounded-xl bg-emerald-600/30 border border-emerald-500/50">
              <Smartphone className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-[10px] font-bold tracking-tight text-emerald-300">APK / Java</span>
          </button>

          {/* Legal / ToS Tab */}
          <button
            onClick={() => setActiveTab('legal')}
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-2xl transition ${
              activeTab === 'legal' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className={`p-1.5 rounded-xl transition ${activeTab === 'legal' ? 'bg-emerald-500/20' : ''}`}>
              <Shield className="w-5 h-5" />
            </div>
            <span className="text-[10px] tracking-tight">Legal</span>
          </button>
        </nav>

        {/* Android Bottom Navigation Pill Gesture Bar */}
        <div className="fixed bottom-0.5 left-0 right-0 max-w-2xl mx-auto flex justify-center pointer-events-none z-50">
          <div className="w-28 h-1 bg-slate-600/60 rounded-full" />
        </div>
      </div>

      {/* Onboarding Flow Modal */}
      <OnboardingModal
        isOpen={showOnboarding}
        onComplete={() => setShowOnboarding(false)}
      />

      {/* APK & Java Source Center Modal */}
      <ApkExportModal
        isOpen={showApkModal}
        onClose={() => setShowApkModal(false)}
      />
    </div>
  );
}
