import React, { useState } from 'react';
import { Shield, FileText, CheckCircle, Cpu, Lock, ArrowLeft } from 'lucide-react';

interface LegalScreensProps {
  onBack?: () => void;
}

export const LegalScreens: React.FC<LegalScreensProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'privacy' | 'tos'>('privacy');

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-y-auto pb-24">
      {/* Top Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 sticky top-0 z-20 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition mr-1"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <Shield className="w-5 h-5 text-emerald-400" />
          <h2 className="text-sm font-bold text-white">Legal, Privacy & Fair Play</h2>
        </div>

        {/* Tab switch */}
        <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs">
          <button
            onClick={() => setActiveTab('privacy')}
            className={`px-3 py-1 rounded-lg font-bold transition ${
              activeTab === 'privacy' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Privacy Policy
          </button>
          <button
            onClick={() => setActiveTab('tos')}
            className={`px-3 py-1 rounded-lg font-bold transition ${
              activeTab === 'tos' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Terms of Service
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto w-full p-4 space-y-6">
        {activeTab === 'privacy' ? (
          /* Privacy Policy Screen */
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Privacy Policy</h3>
                <p className="text-xs text-slate-400">Effective Date: November 2026 • 100% Client-Side Privacy</p>
              </div>
            </div>

            {/* Core Privacy Promise Banner */}
            <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-4 flex items-start gap-3">
              <Cpu className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-wider mb-1">
                  100% Local Device CPU Computation
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Unlike cloud chess engines that transmit your positions and games to third-party remote servers,
                  Stockfish Chess Review runs entirely in your local browser sandbox and device CPU using Web Workers and WebAssembly.
                  Your games, moves, and analysis never leave your device.
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
              <section>
                <h4 className="text-sm font-bold text-white mb-1.5 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  1. Information We Do Not Collect
                </h4>
                <p>
                  We do not collect, store, or sell any personal data, email addresses, phone identifiers, or location data.
                  No tracking cookies, analytics SDKs, or third-party advertising trackers are integrated into this application.
                </p>
              </section>

              <section>
                <h4 className="text-sm font-bold text-white mb-1.5 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  2. Chess.com Public API Interaction
                </h4>
                <p>
                  When you enter a Chess.com username to fetch game archives, your device makes direct, read-only requests
                  to the official public Chess.com REST API (<code className="bg-slate-800 px-1 py-0.5 rounded text-emerald-300">api.chess.com</code>).
                  No credentials or passwords are ever requested or stored.
                </p>
              </section>

              <section>
                <h4 className="text-sm font-bold text-white mb-1.5 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  3. Offline & Local Storage
                </h4>
                <p>
                  Game settings and onboarding acceptance tokens are stored exclusively in your browser’s local storage
                  (<code className="bg-slate-800 px-1 py-0.5 rounded text-emerald-300">localStorage</code>) on your own device.
                  You can clear this anytime through your browser or Android app settings.
                </p>
              </section>

              <section>
                <h4 className="text-sm font-bold text-white mb-1.5 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  4. Open Source Engine Attribution
                </h4>
                <p>
                  Stockfish is licensed under the GNU General Public License v3 (GPL-3.0). All engine calculation algorithms
                  respect open-source integrity and fair attribution.
                </p>
              </section>
            </div>
          </div>
        ) : (
          /* Terms of Service Screen */
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Terms of Service</h3>
                <p className="text-xs text-slate-400">Last Revised: November 2026 • Fair Play & Usage</p>
              </div>
            </div>

            <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
              <section>
                <h4 className="text-sm font-bold text-white mb-1.5">1. Acceptance of Terms</h4>
                <p>
                  By accessing or installing Stockfish Chess Review & Play, you agree to these Terms of Service.
                  This software is provided for personal analysis, educational review, and offline entertainment.
                </p>
              </section>

              <section className="bg-amber-950/40 border border-amber-800/40 rounded-xl p-3">
                <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider mb-1">
                  2. Strict Fair Play Policy
                </h4>
                <p className="text-xs text-slate-300">
                  This engine and review tool is intended strictly for post-game review, training, and offline bot matches.
                  Using this application or any engine analysis during active, ongoing games on Chess.com, Lichess,
                  or FIDE rated events is strictly prohibited and violates chess fair play rules.
                </p>
              </section>

              <section>
                <h4 className="text-sm font-bold text-white mb-1.5">3. Third-Party Trademarks & Content</h4>
                <p>
                  Chess.com is a registered trademark of Chess.com, LLC. This application is an independent open-source tool
                  using publicly available REST endpoints and is not officially affiliated with or endorsed by Chess.com.
                </p>
              </section>

              <section>
                <h4 className="text-sm font-bold text-white mb-1.5">4. Warranty Disclaimer</h4>
                <p>
                  The application is provided "as is" without warranty of any kind. Calculation results and move classifications
                  are heuristic evaluations generated by engine heuristics and may vary depending on selected search depth.
                </p>
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
