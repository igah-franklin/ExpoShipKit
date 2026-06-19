'use client';

import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import LeftRail from './components/LeftRail';
import StepProject from './components/StepProject';
import StepExpo from './components/StepExpo';
import StepApple from './components/StepApple';
import StepReview from './components/StepReview';
import DeparturesBoard from './components/DeparturesBoard';
import ConsoleFeed from './components/ConsoleFeed';
import { ArrowRightIcon, Loader2Icon, PlayIcon, XCircleIcon } from 'lucide-react';

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

const BACKEND_URL = 'http://localhost:5001';

export default function Home() {
  // Navigation & Wizard State
  const [step, setStep] = useState(1);
  const [activeTab, setActiveTab] = useState<'build' | 'history'>('build');
  const [buildHistory, setBuildHistory] = useState<BuildRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Step 1: Project dropzone state
  const [folderName, setFolderName] = useState('');
  const [filesCount, setFilesCount] = useState(0);
  const [projectZip, setProjectZip] = useState<Blob | null>(null);

  // Step 2: Expo token state
  const [expoToken, setExpoToken] = useState('');

  // Step 3: Apple credentials state
  const [appleKeyFile, setAppleKeyFile] = useState<File | null>(null);
  const [issuerId, setIssuerId] = useState('');
  const [keyId, setKeyId] = useState('');
  const [appleTeamId, setAppleTeamId] = useState('');
  const [appleTeamType, setAppleTeamType] = useState('COMPANY_OR_ORGANIZATION');
  const [customBundleId, setCustomBundleId] = useState('');

  // Step 4: Submission & Polling State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeBuildId, setActiveBuildId] = useState<string | null>(null);
  const [activeBuild, setActiveBuild] = useState<BuildRecord | null>(null);
  const [temporaryBuilds, setTemporaryBuilds] = useState<BuildRecord[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  // Step status helpers for ticket stubs
  const isStep1Complete = !!projectZip;
  const isStep2Complete = expoToken.trim().length > 10;
  const isStep3Complete = !!appleKeyFile && issuerId.trim().length > 5 && keyId.trim().length > 4 && appleTeamId.trim().length > 4;
  const isStep4Complete = activeBuildId !== null;

  // Load history & token on mount
  useEffect(() => {
    fetchBuildHistory();
    const savedToken = localStorage.getItem('expo_ship_token');
    if (savedToken) setExpoToken(savedToken);
  }, []);

  // Poll active build details in background
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeBuildId) {
      interval = setInterval(() => {
        fetchBuildDetails(activeBuildId);
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [activeBuildId]);

  const fetchBuildHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const res = await fetch(`${BACKEND_URL}/api/builds`);
      const data = await res.json();
      if (data.success) {
        setBuildHistory(data.builds);
      }
    } catch (err) {
      console.error('Failed to retrieve clearances:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const fetchBuildDetails = async (id: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/builds/${id}`);
      const data = await res.json();
      if (data.success) {
        setActiveBuild(data.build);

        // Update temporaryBuilds matching state
        setTemporaryBuilds(prev => 
          prev.map(b => b._id === id ? { ...data.build, isNew: b.isNew } : b)
        );

        // Terminate polling on terminal states
        if (data.build.status === 'completed' || data.build.status === 'failed') {
          setActiveBuildId(null);
          fetchBuildHistory(); // reload logs database records
        }
      }
    } catch (err) {
      console.error('Failed to stream logs details:', err);
    }
  };

  const saveExpoToken = () => {
    if (!expoToken.trim()) return;
    localStorage.setItem('expo_ship_token', expoToken);
    setStep(3);
  };

  const handleTriggerBuild = async () => {
    if (!projectZip || !appleKeyFile || !expoToken || !issuerId || !keyId || !appleTeamId) {
      setErrorMsg('Pre-flight check failed. Core settings are incomplete.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    const formData = new FormData();
    formData.append('project', projectZip, 'project.zip');
    formData.append('appleKey', appleKeyFile);
    formData.append('expoToken', expoToken);
    formData.append('issuerId', issuerId);
    formData.append('keyId', keyId);
    formData.append('appleTeamId', appleTeamId);
    formData.append('appleTeamType', appleTeamType);
    if (customBundleId.trim()) {
      formData.append('customBundleId', customBundleId.trim());
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/builds`, {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Build initialization rejected.');
      }

      // Add to temporary departures board with animation
      const tempId = data.build._id;
      const newRow: BuildRecord = {
        _id: tempId,
        projectName: folderName || 'Expo App',
        slug: 'expo-app',
        bundleIdentifier: customBundleId || 'Pending detection...',
        status: 'pending',
        logs: ['Enqueuing build pipeline...'],
        expoTokenMasked: expoToken.substring(0, 4) + '...' + expoToken.substring(expoToken.length - 4),
        createdAt: new Date().toISOString(),
        isNew: true
      };
      
      setTemporaryBuilds(prev => [newRow, ...prev]);
      setActiveBuildId(tempId);
      setActiveBuild(newRow);
      setActiveTab('history'); // Switch right panel to history immediately to watch build console!

      // Reset Wizard state to step 1 for subsequent triggers
      setFolderName('');
      setFilesCount(0);
      setProjectZip(null);
      setAppleKeyFile(null);
      setIssuerId('');
      setKeyId('');
      setAppleTeamId('');
      setAppleTeamType('COMPANY_OR_ORGANIZATION');
      setCustomBundleId('');
      setStep(1);
    } catch (err) {
      console.error(err);
      setErrorMsg((err as Error).message || 'Server connection failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const viewBuildLogs = (build: BuildRecord) => {
    setActiveBuild(build);
    if (build.status === 'running' || build.status === 'pending') {
      setActiveBuildId(build._id);
    } else {
      setActiveBuildId(null);
    }
  };

  // Combine temporary and server history builds
  const combinedBuilds = [
    ...temporaryBuilds,
    ...buildHistory.filter(h => !temporaryBuilds.some(t => t._id === h._id))
  ];

  return (
    <div className="flex flex-col flex-1 bg-[#11151A] text-[#ECE8DF] min-h-screen relative font-sans select-none">
      
      {/* HEADER */}
      <Header />

      {/* MAIN LAYOUT CONTAINER */}
      <main className="max-w-6xl w-full mx-auto px-6 py-8 flex flex-col gap-8 flex-1">
        
        {/* TWO-COLUMN WIZARD/HISTORY CONTAINER */}
        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] bg-[#181D24] border border-[#272E38] min-h-[460px] relative">
          
          {/* LEFT RAIL (Step Selector Ticket Stubs) */}
          <LeftRail
            step={step}
            setStep={setStep}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isStep1Complete={isStep1Complete}
            isStep2Complete={isStep2Complete}
            isStep3Complete={isStep3Complete}
            isStep4Complete={isStep4Complete}
          />

          {/* RIGHT PANEL */}
          <section className="p-8 flex flex-col justify-between min-h-[420px]">
            <div>
              {/* Error messages box */}
              {errorMsg && (
                <div id="wizard-error-msg" className="mb-6 px-4 py-3 border border-[#C1604F] bg-[#C1604F]/10 text-[#C1604F] text-xs font-mono flex items-center gap-2 animate-shake">
                  <XCircleIcon className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {activeTab === 'build' ? (
                <>
                  {/* STEP 1: PROJECT FILE ACCESS */}
                  {step === 1 && (
                    <StepProject
                      folderName={folderName}
                      filesCount={filesCount}
                      onProjectZip={(zip, name, count) => {
                        setProjectZip(zip);
                        setFolderName(name);
                        setFilesCount(count);
                        setStep(2);
                      }}
                      setErrorMsg={setErrorMsg}
                    />
                  )}

                  {/* STEP 2: EXPO TOKEN */}
                  {step === 2 && (
                    <StepExpo
                      expoToken={expoToken}
                      setExpoToken={setExpoToken}
                      onSave={saveExpoToken}
                    />
                  )}

                  {/* STEP 3: APPLE DEVELOPER DETAILS */}
                  {step === 3 && (
                    <StepApple
                      appleKeyFile={appleKeyFile}
                      setAppleKeyFile={setAppleKeyFile}
                      issuerId={issuerId}
                      setIssuerId={setIssuerId}
                      keyId={keyId}
                      setKeyId={setKeyId}
                      appleTeamId={appleTeamId}
                      setAppleTeamId={setAppleTeamId}
                      appleTeamType={appleTeamType}
                      setAppleTeamType={setAppleTeamType}
                      customBundleId={customBundleId}
                      setCustomBundleId={setCustomBundleId}
                      setErrorMsg={setErrorMsg}
                      onNext={() => setStep(4)}
                    />
                  )}

                  {/* STEP 4: REVIEW MANIFEST */}
                  {step === 4 && (
                    <StepReview
                      folderName={folderName}
                      expoToken={expoToken}
                      appleKeyFile={appleKeyFile}
                      issuerId={issuerId}
                      keyId={keyId}
                    />
                  )}
                </>
              ) : (
                <>
                  {/* STEP 5 / HISTORY: DEPARTURES & LIVE CONSOLE */}
                  {activeBuild ? (
                    <ConsoleFeed
                      activeBuild={activeBuild}
                      onClose={() => setActiveBuild(null)}
                    />
                  ) : (
                    <DeparturesBoard
                      combinedBuilds={combinedBuilds}
                      isLoadingHistory={isLoadingHistory}
                      fetchBuildHistory={fetchBuildHistory}
                      onInspectLogs={viewBuildLogs}
                    />
                  )}
                </>
              )}
            </div>

            {/* STEP FOOTER CONTROLS (Only visible in Build mode) */}
            {activeTab === 'build' && (
              <div className="flex justify-between items-center border-t border-[#272E38] pt-6 mt-8 select-none">
                <div>
                  {step > 1 ? (
                    <button
                      id="btn-nav-back"
                      onClick={() => setStep(step - 1)}
                      className="px-0 py-2.5 bg-transparent border-0 text-[#878E9C] hover:text-[#ECE8DF] font-mono text-xs uppercase tracking-wider transition-colors focus:outline-none"
                    >
                      Back
                    </button>
                  ) : (
                    <div />
                  )}
                </div>

                <div>
                  {step === 1 && (
                    <button
                      id="btn-nav-step1"
                      onClick={() => setStep(2)}
                      disabled={!projectZip}
                      className="px-5 py-2.5 bg-[#E3A857] hover:bg-[#cfa15f] disabled:opacity-50 text-[#11151A] font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors disabled:cursor-not-allowed border-0 focus:outline-none rounded-none"
                    >
                      Next <ArrowRightIcon className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {step === 2 && (
                    <button
                      id="btn-nav-step2"
                      onClick={saveExpoToken}
                      disabled={expoToken.trim().length <= 10}
                      className="px-5 py-2.5 bg-[#E3A857] hover:bg-[#cfa15f] disabled:opacity-50 text-[#11151A] font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors disabled:cursor-not-allowed border-0 focus:outline-none rounded-none"
                    >
                      Next <ArrowRightIcon className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {step === 3 && (
                    <button
                      id="btn-nav-step3"
                      onClick={() => setStep(4)}
                      disabled={!appleKeyFile || !issuerId.trim() || !keyId.trim() || !appleTeamId.trim()}
                      className="px-5 py-2.5 bg-[#E3A857] hover:bg-[#cfa15f] disabled:opacity-50 text-[#11151A] font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors disabled:cursor-not-allowed border-0 focus:outline-none rounded-none"
                    >
                      Next <ArrowRightIcon className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {step === 4 && (
                    <button
                      id="btn-nav-begin-build"
                      onClick={handleTriggerBuild}
                      disabled={isSubmitting || !projectZip || !appleKeyFile || !expoToken || !issuerId || !keyId || !appleTeamId}
                      className="px-6 py-2.5 bg-[#E3A857] hover:bg-[#cfa15f] disabled:opacity-50 text-[#11151A] font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors disabled:cursor-not-allowed border-0 focus:outline-none rounded-none"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> clearance processing...
                        </>
                      ) : (
                        <>
                          <PlayIcon className="h-3.5 w-3.5" /> Begin build
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>

      </main>

      {/* FOOTER */}
      <Footer />
    </div>
  );
}
