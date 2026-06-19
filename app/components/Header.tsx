import React from 'react';

export default function Header() {
  return (
    <header className="border-b border-[#272E38] bg-[#11151A]">
      <div className="max-w-6xl mx-auto px-6 py-4 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#C08A46] inline-block" />
          <h1 id="header-logo" className="text-xl font-medium tracking-tight spectral-serif text-[#ECE8DF]">
            expoship
          </h1>
        </div>
        <div className="flex items-center gap-4 text-right">
          <span className="font-mono text-[11px] tracking-[0.1em] text-[#C08A46] uppercase">
            production clearance
          </span>
          <span className="font-mono text-xs text-[#878E9C]">
            branch:main
          </span>
        </div>
      </div>
    </header>
  );
}
