import React from 'react';

interface LeftRailProps {
  step: number;
  setStep: (step: number) => void;
  activeTab: 'build' | 'history' | 'console';
  setActiveTab: (tab: 'build' | 'history' | 'console') => void;
  isStep1Complete: boolean;
  isStep2Complete: boolean;
  isStep3Complete: boolean;
  isStep4Complete: boolean;
}

export default function LeftRail({
  step,
  setStep,
  activeTab,
  setActiveTab,
  isStep1Complete,
  isStep2Complete,
  isStep3Complete,
  isStep4Complete,
}: LeftRailProps) {
  const steps = [
    { num: 1, label: 'Project', sub: 'Directory package', isDone: isStep1Complete, tab: 'build' as const },
    { num: 2, label: 'Expo', sub: 'Access tokens', isDone: isStep2Complete, tab: 'build' as const },
    { num: 3, label: 'Apple', sub: 'Developer profiles', isDone: isStep3Complete, tab: 'build' as const },
    { num: 4, label: 'Review', sub: 'Launch build', isDone: isStep4Complete, tab: 'build' as const },
    { num: 5, label: 'Builds', sub: 'Clearance logs', isDone: false, tab: 'history' as const },
    { num: 6, label: 'Console', sub: 'Real-time feed', isDone: false, tab: 'console' as const },
  ];

  return (
    <nav className="flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible border-b md:border-b-0 md:border-r border-[#272E38] bg-[#181D24] select-none shrink-0 animate-fade-in">
      {steps.map((s) => {
        const isActive = activeTab === s.tab && (s.tab !== 'build' || step === s.num);
        const isDone = s.isDone;
        
        return (
          <button
            key={s.num}
            id={`rail-stub-step-${s.num}`}
            onClick={() => {
              setActiveTab(s.tab);
              if (s.tab === 'build') {
                setStep(s.num);
              }
            }}
            className={`text-left px-5 py-5 border-r border-b-0 md:border-r-0 md:border-b border-dashed border-[#272E38] transition-all duration-200 relative focus:outline-none shrink-0 w-[140px] md:w-full select-none ${
              isActive
                ? 'bg-[#1F2530] text-[#ECE8DF]'
                : isDone
                ? 'bg-[#181D24] text-[#565D6B] hover:bg-[#1F2530]/20'
                : 'bg-[#181D24] text-[#878E9C] hover:bg-[#1F2530]/20 hover:text-[#ECE8DF]'
            }`}
          >
            {/* Active indicator bar */}
            {isActive && (
              <div className="absolute left-0 bottom-0 md:bottom-0 md:top-0 w-full h-[3px] md:w-[3px] md:h-full bg-[#E3A857] transition-all" />
            )}

            <div className="flex justify-between items-center mb-1">
              <span className={`font-mono text-xs ${
                isActive 
                  ? 'text-[#E3A857]' 
                  : isDone 
                  ? 'text-[#565D6B]' 
                  : 'text-[#C08A46]'
              }`}>
                0{s.num}{isDone ? ' ✓' : ''}
              </span>
            </div>
            <h3 className={`text-xs font-semibold tracking-wider uppercase font-mono ${
              isActive 
                ? 'text-[#ECE8DF]' 
                : isDone 
                ? 'text-[#565D6B]' 
                : 'text-[#ECE8DF]/90'
            }`}>
              {s.label}
            </h3>
            <p className={`text-[10px] mt-1 font-mono ${
              isActive 
                ? 'text-[#878E9C]' 
                : isDone 
                ? 'text-[#565D6B]/70' 
                : 'text-[#565D6B]'
            }`}>
              {s.sub}
            </p>
          </button>
        );
      })}
      <div className="hidden md:block flex-1 bg-[#181D24]" />
    </nav>
  );
}
