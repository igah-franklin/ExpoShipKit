import React, { useRef, useEffect } from 'react';

interface BuildRecord {
  _id: string;
  projectName: string;
  slug: string;
  bundleIdentifier: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  buildUrl?: string;
  logs: string[];
  expoTokenMasked: string;
  createdAt: string;
  isNew?: boolean;
}

interface ConsoleFeedProps {
  activeBuild: BuildRecord;
  onClose: () => void;
}

export default function ConsoleFeed({
  activeBuild,
  onClose,
}: ConsoleFeedProps) {
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeBuild.logs]);

  return (
    <div className="bg-[#181D24] space-y-4">
      <div className="flex justify-between items-center border-b border-[#272E38] pb-3">
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className={`h-1.5 w-1.5 rounded-full ${
            activeBuild.status === 'completed' 
              ? 'bg-[#6FA787]' 
              : activeBuild.status === 'failed' 
              ? 'bg-[#C1604F]' 
              : 'bg-[#E3A857] animate-pulse-soft'
          }`} />
          <span className="text-[#ECE8DF] font-semibold">Console Feed: {activeBuild.projectName}</span>
          <span className="text-[#565D6B]">({activeBuild.bundleIdentifier})</span>
        </div>
        
        <div className="flex gap-2 select-none">
          {activeBuild.buildUrl && (
            <a
              href={activeBuild.buildUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1 bg-[#C08A46] text-[#11151A] font-mono text-[10px] uppercase font-bold hover:bg-[#E3A857] transition-colors border-0"
            >
              Expo Dashboard ↗
            </a>
          )}
          <button
            id="close-console-btn"
            onClick={onClose}
            className="px-3 py-1 border border-[#272E38] bg-transparent hover:border-[#3A4250] font-mono text-[10px] uppercase text-[#878E9C] hover:text-[#ECE8DF] transition-colors focus:outline-none"
          >
            ← Back to Departures
          </button>
        </div>
      </div>

      <div className="bg-[#11151A] border border-[#272E38] p-5 h-72 overflow-y-auto font-mono text-xs text-zinc-300 space-y-1.5 select-text">
        {activeBuild.logs.map((log, idx) => (
          <div
            key={idx}
            className={
              log.includes('[EAS BUILD ERROR]') || log.includes('failed')
                ? 'text-[#C1604F]'
                : log.includes('[EAS CREDS WARNING]') || log.includes('[EAS INIT WARNING]')
                ? 'text-[#E3A857]'
                : log.includes('success') || log.includes('Successful') || log.includes('linked')
                ? 'text-[#6FA787]'
                : log.includes('EAS')
                ? 'text-[#878E9C]'
                : 'text-[#ECE8DF]'
            }
          >
            {log}
          </div>
        ))}
        <div ref={terminalEndRef} />
      </div>
    </div>
  );
}
