import React from 'react';
import { RefreshCwIcon, Loader2Icon } from 'lucide-react';

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

interface DeparturesBoardProps {
  combinedBuilds: BuildRecord[];
  isLoadingHistory: boolean;
  fetchBuildHistory: () => void;
  onInspectLogs: (build: BuildRecord) => void;
}

export default function DeparturesBoard({
  combinedBuilds,
  isLoadingHistory,
  fetchBuildHistory,
  onInspectLogs,
}: DeparturesBoardProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-[#C08A46] block mb-1">Step 05</span>
          <h2 className="text-2xl font-medium tracking-tight spectral-serif text-[#ECE8DF]">Departures</h2>
          <p className="text-xs text-[#878E9C] mt-1">Clearance log history and remote EAS cloud status board.</p>
        </div>
        <button
          id="refresh-departures-btn"
          onClick={fetchBuildHistory}
          disabled={isLoadingHistory}
          className="bg-[#11151A] hover:bg-[#1F2530] border border-[#272E38] p-2 hover:text-[#ECE8DF] text-[#878E9C] disabled:opacity-50 transition-colors focus:outline-none"
        >
          <RefreshCwIcon className={`h-3.5 w-3.5 ${isLoadingHistory ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="overflow-x-auto border border-[#272E38] bg-[#11151A]/50">
        <table className="w-full text-left font-mono text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#272E38] text-[#565D6B] bg-[#11151A]/50 select-none">
              <th className="px-4 py-3 font-semibold tracking-wider uppercase text-[10px]">App</th>
              <th className="px-4 py-3 font-semibold tracking-wider uppercase text-[10px]">Platform</th>
              <th className="px-4 py-3 font-semibold tracking-wider uppercase text-[10px]">Status</th>
              <th className="px-4 py-3 font-semibold tracking-wider uppercase text-[10px]">Started</th>
              <th className="px-4 py-3 font-semibold tracking-wider uppercase text-[10px] hidden md:table-cell">Gate</th>
              <th className="px-4 py-3 font-semibold tracking-wider uppercase text-[10px] text-right">Clearance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#272E38]">
            {isLoadingHistory && combinedBuilds.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-[#565D6B]">
                  <Loader2Icon className="h-5 w-5 animate-spin mx-auto text-[#C08A46] mb-2" /> Loading departure logs...
                </td>
              </tr>
            ) : combinedBuilds.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-[#565D6B]">
                  No departures cleared. Trigger a pre-flight build to populate.
                </td>
              </tr>
            ) : (
              combinedBuilds.map((build) => {
                const dateFormatted = new Date(build.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                const shortId = build._id.substring(0, 8);
                
                return (
                  <tr 
                    key={build._id} 
                    className={`hover:bg-[#1F2530]/20 transition-colors ${
                      build.isNew ? 'animate-row-entry bg-[#1F2530]/40' : ''
                    }`}
                  >
                    <td className="px-4 py-4">
                      <div className="font-semibold text-[#ECE8DF]">{build.projectName}</div>
                      <div className="text-[10px] text-[#565D6B] font-normal">#{shortId}</div>
                    </td>
                    <td className="px-4 py-4 text-[#878E9C] select-none">iOS</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        {build.status === 'completed' ? (
                          <>
                            <span className="h-2 w-2 rounded-full bg-[#6FA787]" />
                            <span className="text-[#6FA787] font-semibold uppercase tracking-wider text-[10px]">ready</span>
                          </>
                        ) : build.status === 'failed' ? (
                          <>
                            <span className="h-2 w-2 rounded-full bg-[#C1604F]" />
                            <span className="text-[#C1604F] font-semibold uppercase tracking-wider text-[10px]">failed</span>
                          </>
                        ) : build.status === 'running' ? (
                          <>
                            <span className="h-2 w-2 rounded-full bg-[#E3A857] animate-pulse-soft" />
                            <span className="text-[#E3A857] font-semibold uppercase tracking-wider text-[10px]">building</span>
                          </>
                        ) : build.status === 'pending' ? (
                          <>
                            <span className="h-2 w-2 rounded-full bg-[#878E9C]" />
                            <span className="text-[#878E9C] font-semibold uppercase tracking-wider text-[10px]">queued</span>
                          </>
                        ) : (
                          <>
                            <span className="h-2 w-2 rounded-full bg-[#5A7FA8]" />
                            <span className="text-[#5A7FA8] font-semibold uppercase tracking-wider text-[10px]">submitting</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-[#878E9C] select-none">{dateFormatted}</td>
                    <td className="px-4 py-4 text-[#878E9C] hidden md:table-cell select-none">EAS_G1</td>
                    <td className="px-4 py-4 text-right select-none">
                      <div className="flex justify-end gap-2">
                        <button
                          id={`btn-inspect-logs-${build._id}`}
                          onClick={() => onInspectLogs(build)}
                          className="px-2 py-1 bg-[#11151A] hover:bg-[#1F2530] border border-[#272E38] text-[10px] uppercase text-[#878E9C] hover:text-[#ECE8DF] transition-colors focus:outline-none"
                        >
                          Console
                        </button>
                        {build.buildUrl && (
                          <a
                            id={`link-eas-dashboard-${build._id}`}
                            href={build.buildUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2 py-1 bg-[#C08A46] text-[#11151A] text-[10px] uppercase font-bold hover:bg-[#E3A857] transition-colors inline-flex items-center gap-0.5"
                          >
                            View ↗
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
