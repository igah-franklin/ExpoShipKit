import React, { useState } from 'react';

interface StepExpoProps {
  expoToken: string;
  setExpoToken: (token: string) => void;
  onSave: () => void;
}

export default function StepExpo({
  expoToken,
  setExpoToken,
  onSave,
}: StepExpoProps) {
  const [showToken, setShowToken] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-[#C08A46] block mb-1">Step 02</span>
        <h2 className="text-2xl font-medium tracking-tight spectral-serif text-[#ECE8DF]">Expo</h2>
        <p className="text-xs text-[#878E9C] mt-1">Input authentication secrets to fetch EAS profiles.</p>
      </div>

      <div className="space-y-2 max-w-md">
        <label htmlFor="expo-access-token" className="block font-mono text-[11px] text-[#878E9C] uppercase tracking-wider">
          Access token <span className="text-[#C1604F]">*</span>
        </label>
        <div className="relative">
          <input
            id="expo-access-token"
            type={showToken ? 'text' : 'password'}
            value={expoToken}
            onChange={(e) => setExpoToken(e.target.value)}
            placeholder="expo_tkn_..."
            className="w-full bg-[#11151A] border border-[#272E38] focus:border-[#3A4250] text-[#ECE8DF] font-mono text-sm px-4 py-2.5 pr-14 focus:outline-none focus:ring-0 rounded-none"
          />
          <button
            id="btn-toggle-token"
            type="button"
            onClick={() => setShowToken(!showToken)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 font-mono text-[10px] uppercase text-[#878E9C] hover:text-[#ECE8DF] select-none focus:outline-none"
          >
            {showToken ? 'hide' : 'show'}
          </button>
        </div>
        {expoToken.trim().length > 10 ? (
          <p id="token-format-indicator" className="font-mono text-[11px] text-[#6FA787]">
            ✓ Access token successfully loaded.
          </p>
        ) : null}
      </div>

    </div>
  );
}
