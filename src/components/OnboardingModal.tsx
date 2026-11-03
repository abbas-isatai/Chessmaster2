import React, { useState } from 'react';
import { Shield, Check, Cpu, Sparkles, ChevronRight, FileText, Lock } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onComplete }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [hasAgreed, setHasAgreed] = useState<boolean>(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-lg w-full p-6 shadow-2xl flex flex-col justify-between max-h-[90vh] overflow-y-auto">
        {/* Step Indicator */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-xs">
              {step}/3
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                Onboarding Setup
              </span>
              <h3 className="text-xs font-bold text-white">
                {step === 1 && 'Welcome & Core Architecture'}
                {step === 2 && 'Terms of Service (ToS)'}
                {step === 3 && 'Privacy Policy & Local CPU Execution'}
              </h3>
            </div>
          </div>

          <div className="flex gap-1.5">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`w-6 h-1 rounded-full transition-all ${
                  s === step ? 'bg-emerald-400 w-8' : s < step ? 'bg-emerald-600' : 'bg-slate-800'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step Contents */}
        <div className="py-5">
          {step === 1 && (
            <div className="space-y-4">
              <div className="text-center py-2">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white mx-auto shadow-lg shadow-emerald-950 mb-3">
                  <Sparkles className="w-8 h-8" />
                </div>
                <h2 className="text-lg font-black text-white">Stockfish Chess Review</h2>
                <p className="text-xs text-slate-400 mt-1">
                  High-speed engine analysis, move classifications & offline play running directly on your phone's CPU.
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-start gap-3 p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <Cpu className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-white">100% On-Device CPU Processing</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Evaluates chess positions locally in WebAssembly & Web Workers. Zero server latency, works completely offline.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <Sparkles className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-white">Full Move Classifications</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Brilliant (!!), Great (!), Best, Excellent, Inaccuracy, Mistake, Miss & Blunder ratings with an animated dynamic evaluation bar.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <Shield className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-white">Chess.com Sync & Turn-by-Turn Offline</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Fetch games by entering your username, or pass and play on one phone with full FIDE rules and clocks.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300 mb-1">
                <FileText className="w-4 h-4 text-emerald-400" />
                Please review our Terms of Service
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-300 space-y-3 max-h-60 overflow-y-auto leading-relaxed">
                <p>
                  <strong>1. Fair Play Integrity:</strong> This engine evaluation tool is provided for educational review, post-game analysis, and offline bot matches. Do not use this application during live rated matches on Chess.com, Lichess, or FIDE tournaments.
                </p>
                <p>
                  <strong>2. Open Source Attribution:</strong> The chess calculation core relies on the official open-source Stockfish engine licensed under GNU General Public License v3.
                </p>
                <p>
                  <strong>3. Third Party Marks:</strong> Chess.com is a trademark of Chess.com, LLC. This app is an independent client tool using public REST endpoints.
                </p>
                <p>
                  <strong>4. Disclaimer:</strong> Calculations and classifications are heuristic engine outputs rendered for recreational and training purposes.
                </p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300 mb-1">
                <Lock className="w-4 h-4 text-emerald-400" />
                Privacy & Data Policy
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-300 space-y-3 max-h-60 overflow-y-auto leading-relaxed">
                <div className="p-2.5 bg-emerald-950/50 border border-emerald-800/60 rounded-lg text-emerald-300 font-semibold">
                  ✓ 100% Client-Side Privacy: Your games, PGNs, and moves are processed directly on your device CPU and never uploaded to any remote server.
                </div>
                <p>
                  <strong>Zero Telemetry:</strong> We do not track your device identifiers, location, or usage habits.
                </p>
                <p>
                  <strong>Local Storage Only:</strong> Your preferences and game history are stored only in your local browser sandbox.
                </p>
              </div>

              {/* Agreement checkbox */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-800/80 border border-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasAgreed}
                  onChange={(e) => setHasAgreed(e.target.checked)}
                  className="mt-0.5 rounded accent-emerald-500 w-4 h-4"
                />
                <span className="text-xs text-slate-200">
                  I accept the <strong>Terms of Service</strong> and <strong>Privacy Policy</strong> and confirm this tool will be used in accordance with fair play guidelines.
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          {step > 1 ? (
            <button
              onClick={() => setStep((s) => (s - 1) as any)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              onClick={() => setStep((s) => (s + 1) as any)}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1.5 shadow-md shadow-emerald-950"
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => {
                if (hasAgreed) {
                  localStorage.setItem('chess_onboarding_accepted', 'true');
                  onComplete();
                }
              }}
              disabled={!hasAgreed}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition flex items-center gap-1.5 shadow-md shadow-emerald-950"
            >
              <Check className="w-4 h-4" />
              Agree & Launch App
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
