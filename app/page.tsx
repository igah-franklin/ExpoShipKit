'use client';

import React, { useState, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import { 
  FolderIcon, 
  KeyIcon, 
  TerminalIcon, 
  ArrowRightIcon, 
  ArrowLeftIcon, 
  PlayIcon, 
  Loader2Icon, 
  CheckCircle2Icon, 
  XCircleIcon,
  RefreshCwIcon,
  EyeIcon,
  EyeOffIcon,
  ExternalLinkIcon
} from 'lucide-react';

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
  isNew?: boolean; // Animation trigger helper
}

const BACKEND_URL = 'http://localhost:5001';

export default function Home() {
  // Navigation & Wizard Step
  const [step, setStep] = useState(1);
  const [activeTab, setActiveTab] = useState<'build' | 'history'>('build');
  const [buildHistory, setBuildHistory] = useState<BuildRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Step 1: Project Dropzone
  const [folderName, setFolderName] = useState('');
  const [filesCount, setFilesCount] = useState(0);
  const [projectZip, setProjectZip] = useState<Blob | null>(null);
  const [isZipping, setIsZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  // Step 2: Expo token
  const [expoToken, setExpoToken] = useState('');
  const [showToken, setShowToken] = useState(false);

  // Step 3: Apple credentials
  const [appleKeyFile, setAppleKeyFile] = useState<File | null>(null);
  const [issuerId, setIssuerId] = useState('');
  const [keyId, setKeyId] = useState('');
  const [appleTeamId, setAppleTeamId] = useState('');
  const [appleTeamType, setAppleTeamType] = useState('COMPANY_OR_ORGANIZATION');
  const [customBundleId, setCustomBundleId] = useState('');
  const [appleKeyDragActive, setAppleKeyDragActive] = useState(false);

  // Step 4: Submission & Polling State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeBuildId, setActiveBuildId] = useState<string | null>(null);
  const [activeBuild, setActiveBuild] = useState<BuildRecord | null>(null);
  const [temporaryBuilds, setTemporaryBuilds] = useState<BuildRecord[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  // Refs for uploads and scrolling
  const fileInputRef = useRef<HTMLInputElement>(null);
  const p8InputRef = useRef<HTMLInputElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Step status helpers for ticket stubs
  const isStep1Complete = !!projectZip;
  const isStep2Complete = expoToken.trim().length > 10;
  const isStep3Complete = !!appleKeyFile && issuerId.trim().length > 5 && keyId.trim().length > 4 && appleTeamId.trim().length > 4;
  const isStep4Complete = activeBuildId !== null;

  // Load history on mount
  useEffect(() => {
    fetchBuildHistory();
    const savedToken = localStorage.getItem('expo_ship_token');
    if (savedToken) setExpoToken(savedToken);
  }, []);

  // Poll build details in background
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeBuildId) {
      interval = setInterval(() => {
        fetchBuildDetails(activeBuildId);
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [activeBuildId]);

  // Scroll active terminal to the bottom when new logs arrive
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeBuild?.logs]);

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

  const shouldIgnore = (pathStr: string) => {
    const parts = pathStr.split('/');
    return parts.some(part => 
      part === 'node_modules' || 
      part === '.git' || 
      part === '.expo' || 
      part === '.next' || 
      part === 'web-build' || 
      part === 'dist' || 
      part === 'build' ||
      part === 'ios' ||
      part === 'android'
    );
  };

  const traverseDirectory = async (items: DataTransferItemList) => {
    const filesList: { file: File; path: string }[] = [];

    const traverseEntry = async (entry: any, pathStr = "") => {
      if (entry.isFile) {
        const file = await new Promise<File>((resolve) => entry.file(resolve));
        const relativePath = pathStr + file.name;
        if (!shouldIgnore(relativePath)) {
          filesList.push({ file, path: relativePath });
        }
      } else if (entry.isDirectory) {
        if (shouldIgnore(entry.name)) return;
        const dirReader = entry.createReader();
        
        const readEntriesBatch = async (): Promise<any[]> => {
          return new Promise((res) => {
            dirReader.readEntries(res);
          });
        };

        let batch = await readEntriesBatch();
        let allEntries: any[] = [];
        while (batch.length > 0) {
          allEntries = allEntries.concat(batch);
          batch = await readEntriesBatch();
        }

        for (const childEntry of allEntries) {
          await traverseEntry(childEntry, pathStr + entry.name + '/');
        }
      }
    };

    const promises = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry();
        if (entry) {
          promises.push(traverseEntry(entry));
        }
      }
    }

    await Promise.all(promises);
    return filesList;
  };

  const handleZipFiles = async (files: { file: File; path: string }[], projName: string) => {
    setIsZipping(true);
    setZipProgress(0);
    setErrorMsg('');

    try {
      const zip = new JSZip();
      const total = files.length;

      for (let i = 0; i < files.length; i++) {
        const item = files[i];
        zip.file(item.path, item.file);
        if (i % 20 === 0 || i === files.length - 1) {
          setZipProgress(Math.round(((i + 1) / total) * 100));
        }
      }

      const content = await zip.generateAsync({ type: 'blob' }, (metadata) => {
        setZipProgress(Math.round(metadata.percent));
      });

      setProjectZip(content);
      setFolderName(projName || 'Selected Project');
      setFilesCount(total);
      setStep(2);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to process project directory. Confirm app structure.');
    } finally {
      setIsZipping(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.items) {
      setIsZipping(true);
      const filesList = await traverseDirectory(e.dataTransfer.items);
      if (filesList.length === 0) {
        setErrorMsg('No files resolved. Ignore filter matched directory.');
        setIsZipping(false);
        return;
      }
      let rootDirName = 'Expo Project';
      if (e.dataTransfer.files.length > 0) {
        rootDirName = e.dataTransfer.files[0].name;
      }
      await handleZipFiles(filesList, rootDirName);
    }
  };

  const handleFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsZipping(true);
    setErrorMsg('');

    const filesList: { file: File; path: string }[] = [];
    const files = e.target.files;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const relativePath = file.webkitRelativePath || file.name;
      if (!shouldIgnore(relativePath)) {
        filesList.push({ file, path: relativePath });
      }
    }

    if (filesList.length === 0) {
      setErrorMsg('No files resolved.');
      setIsZipping(false);
      return;
    }

    const firstPath = filesList[0].path;
    const rootName = firstPath.split('/')[0] || 'Selected Project';

    await handleZipFiles(filesList, rootName);
  };

  const saveExpoToken = () => {
    if (!expoToken.trim()) return;
    localStorage.setItem('expo_ship_token', expoToken);
    setStep(3);
  };

  const processP8File = (file: File) => {
    setAppleKeyFile(file);
    const match = file.name.match(/AuthKey_([A-Z0-9]+)\.p8/i);
    if (match && match[1]) {
      setKeyId(match[1]);
    }
  };

  const handleP8Drag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setAppleKeyDragActive(true);
    } else if (e.type === "dragleave") {
      setAppleKeyDragActive(false);
    }
  };

  const handleP8Drop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setAppleKeyDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.p8') || file.name.includes('AuthKey')) {
        processP8File(file);
      } else {
        setErrorMsg('Please upload a valid App Store Connect Admin Key (.p8 file)');
      }
    }
  };

  const handleP8FileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processP8File(e.target.files[0]);
    }
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

  // Masking functions
  const maskSensitive = (val: string) => {
    if (!val) return '—';
    if (val.length <= 4) return '••••';
    return `•••• ${val.slice(-4)}`;
  };

  // Combine temporary and server history builds
  const combinedBuilds = [
    ...temporaryBuilds,
    ...buildHistory.filter(h => !temporaryBuilds.some(t => t._id === h._id))
  ];

  return (
    <div className="flex flex-col flex-1 bg-[#11151A] text-[#ECE8DF] min-h-screen relative font-sans select-none">
      
      {/* HEADER */}
      <header className="border-b border-[#272E38] bg-[#11151A]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#C08A46] inline-block" />
            <h1 id="header-logo" className="text-xl font-medium tracking-tight spectral-serif text-[#ECE8DF]">
              Hangar
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

      {/* MAIN LAYOUT CONTAINER */}
      <main className="max-w-6xl w-full mx-auto px-6 py-8 flex flex-col gap-8 flex-1">
        
        {/* TWO-COLUMN WIZARD CONTAINER */}
        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] bg-[#181D24] border border-[#272E38] min-h-[460px] relative">
          
          {/* LEFT RAIL (Step Selector Ticket Stubs) */}
          <nav className="flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible border-b md:border-b-0 md:border-r border-[#272E38] bg-[#181D24] select-none shrink-0">
            {[
              { num: 1, label: 'Project', sub: 'Directory package', isDone: isStep1Complete },
              { num: 2, label: 'Expo', sub: 'Access tokens', isDone: isStep2Complete },
              { num: 3, label: 'Apple', sub: 'Developer profiles', isDone: isStep3Complete },
              { num: 4, label: 'Review', sub: 'Launch build', isDone: isStep4Complete },
            ].map((s) => {
              const isActive = step === s.num;
              const isDone = s.isDone;
              
              return (
                <button
                  key={s.num}
                  id={`rail-stub-step-${s.num}`}
                  onClick={() => setStep(s.num)}
                  className={`text-left px-5 py-5 border-r border-b-0 md:border-r-0 md:border-b border-dashed border-[#272E38] transition-colors relative focus:outline-none shrink-0 w-[140px] md:w-full select-none ${
                    isActive
                      ? 'bg-[#1F2530] text-[#ECE8DF]'
                      : isDone
                      ? 'bg-[#181D24] text-[#565D6B] hover:bg-[#1F2530]/20'
                      : 'bg-[#181D24] text-[#878E9C] hover:bg-[#1F2530]/20 hover:text-[#ECE8DF]'
                  }`}
                >
                  {/* Active indicator bar */}
                  {isActive && (
                    <div className="absolute left-0 bottom-0 md:bottom-0 md:top-0 w-full h-[3px] md:w-[3px] md:h-full bg-[#E3A857]" />
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

          {/* RIGHT PANEL (Active wizard screen) */}
          <section className="p-8 flex flex-col justify-between min-h-[420px]">
            <div>
              {/* Error messages box */}
              {errorMsg && (
                <div id="wizard-error-msg" className="mb-6 px-4 py-3 border border-[#C1604F] bg-[#C1604F]/10 text-[#C1604F] text-xs font-mono flex items-center gap-2 animate-shake">
                  <XCircleIcon className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* STEP 1: PROJECT FILE ACCESS */}
              {step === 1 && (
                <div className="space-y-6">
                  <div>
                    <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-[#C08A46] block mb-1">Step 01</span>
                    <h2 className="text-2xl font-medium tracking-tight spectral-serif text-[#ECE8DF]">Project</h2>
                    <p className="text-xs text-[#878E9C] mt-1">Select the local root folder of your Expo app.</p>
                  </div>

                  <div
                    id="dropzone"
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border border-dashed p-10 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-3 rounded-none ${
                      dragActive
                        ? 'border-[#E3A857] bg-[#1F2530]/50'
                        : 'border-[#272E38] hover:border-[#3A4250]'
                    }`}
                  >
                    <input
                      id="project-dir-upload"
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFolderSelect}
                      {...({ webkitdirectory: "", directory: "" } as any)}
                      multiple
                      className="hidden"
                    />

                    {isZipping ? (
                      <div className="flex flex-col items-center gap-3">
                        <Loader2Icon className="h-6 w-6 text-[#C08A46] animate-spin" />
                        <p className="font-mono text-xs text-[#ECE8DF]">Compressing source files: {zipProgress}%</p>
                      </div>
                    ) : (
                      <>
                        <span className="spectral-serif italic text-3xl text-[#C08A46]">✦</span>
                        <p className="text-sm font-serif text-[#ECE8DF]">
                          Drag your project folder here, or{' '}
                          <span className="text-[#C08A46] hover:text-[#E3A857] underline font-medium">browse</span>
                        </p>
                        <p id="folder-upload-hint" className="font-mono text-[10px] text-[#565D6B]">
                          {folderName ? (
                            <span className="text-[#6FA787] font-semibold">
                              ✓ Folder received: {folderName} ({filesCount} files)
                            </span>
                          ) : (
                            'Expected files: app.json, eas.json, package.json'
                          )}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 2: EXPO TOKEN */}
              {step === 2 && (
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
                    {expoToken.trim().length > 10 && (
                      <p id="token-format-indicator" className="font-mono text-[11px] text-[#6FA787]">
                        ✓ Access token successfully loaded.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 3: APPLE DEVELOPER DETAILS */}
              {step === 3 && (
                <div className="space-y-6">
                  <div>
                    <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-[#C08A46] block mb-1">Step 03</span>
                    <h2 className="text-2xl font-medium tracking-tight spectral-serif text-[#ECE8DF]">Apple</h2>
                    <p className="text-xs text-[#878E9C] mt-1">Upload ASC private key and developer identifiers.</p>
                  </div>

                  <div className="space-y-6 max-w-xl">
                    {/* Compact P8 key upload */}
                    <div className="space-y-2">
                      <label className="block font-mono text-[11px] text-[#878E9C] uppercase tracking-wider">
                        AuthKey (.p8) Signing Key <span className="text-[#C1604F]">*</span>
                      </label>
                      <div className="flex">
                        <div
                          id="p8-dropzone"
                          onDragEnter={handleP8Drag}
                          onDragOver={handleP8Drag}
                          onDragLeave={handleP8Drag}
                          onDrop={handleP8Drop}
                          onClick={() => p8InputRef.current?.click()}
                          className={`inline-flex items-center gap-3 px-4 py-3 border border-dashed cursor-pointer transition-colors bg-[#11151A] max-w-sm rounded-none ${
                            appleKeyDragActive
                              ? 'border-[#E3A857]'
                              : 'border-[#272E38] hover:border-[#3A4250]'
                          }`}
                        >
                          <input
                            id="apple-key-p8-upload"
                            type="file"
                            ref={p8InputRef}
                            accept=".p8"
                            onChange={handleP8FileChange}
                            className="hidden"
                          />
                          <KeyIcon className={`h-4 w-4 shrink-0 ${appleKeyFile ? 'text-[#6FA787]' : 'text-[#878E9C]'}`} />
                          <span id="p8-filename-display" className="text-xs font-mono text-left">
                            {appleKeyFile ? (
                              <span className="text-[#6FA787] font-semibold">✓ {appleKeyFile.name}</span>
                            ) : (
                              <span className="text-[#878E9C]">Drag .p8 Apple key or browse</span>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Identifiers inputs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="issuer-id" className="block font-mono text-[11px] text-[#878E9C] uppercase tracking-wider">
                          Issuer ID <span className="text-[#C1604F]">*</span>
                        </label>
                        <input
                          id="issuer-id"
                          type="text"
                          value={issuerId}
                          onChange={(e) => setIssuerId(e.target.value)}
                          placeholder="e.g. 60a6c6a4-..."
                          className="w-full bg-[#11151A] border border-[#272E38] focus:border-[#3A4250] text-[#ECE8DF] font-mono text-sm px-4 py-2.5 focus:outline-none focus:ring-0 rounded-none"
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="key-id" className="block font-mono text-[11px] text-[#878E9C] uppercase tracking-wider">
                          Key ID <span className="text-[#C1604F]">*</span>
                        </label>
                        <input
                          id="key-id"
                          type="text"
                          value={keyId}
                          onChange={(e) => setKeyId(e.target.value)}
                          placeholder="e.g. 2X93T53N8G"
                          className="w-full bg-[#11151A] border border-[#272E38] focus:border-[#3A4250] text-[#ECE8DF] font-mono text-sm px-4 py-2.5 focus:outline-none focus:ring-0 rounded-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="team-id" className="block font-mono text-[11px] text-[#878E9C] uppercase tracking-wider">
                          Team ID <span className="text-[#C1604F]">*</span>
                        </label>
                        <input
                          id="team-id"
                          type="text"
                          value={appleTeamId}
                          onChange={(e) => setAppleTeamId(e.target.value)}
                          placeholder="e.g. ABC123XYZ9"
                          className="w-full bg-[#11151A] border border-[#272E38] focus:border-[#3A4250] text-[#ECE8DF] font-mono text-sm px-4 py-2.5 focus:outline-none focus:ring-0 rounded-none"
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="team-type" className="block font-mono text-[11px] text-[#878E9C] uppercase tracking-wider">
                          Team Type <span className="text-[#C1604F]">*</span>
                        </label>
                        <select
                          id="team-type"
                          value={appleTeamType}
                          onChange={(e) => setAppleTeamType(e.target.value)}
                          className="w-full bg-[#11151A] border border-[#272E38] focus:border-[#3A4250] text-[#ECE8DF] font-mono text-sm px-4 py-2.5 focus:outline-none focus:ring-0 rounded-none appearance-none cursor-pointer"
                        >
                          <option value="COMPANY_OR_ORGANIZATION">Company / Organization</option>
                          <option value="INDIVIDUAL">Individual</option>
                          <option value="IN_HOUSE">Enterprise (In-House)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="custom-bundle-id" className="block font-mono text-[11px] text-[#878E9C] uppercase tracking-wider">
                          Bundle Identifier Override <span className="text-[#565D6B]">(Optional)</span>
                        </label>
                        <input
                          id="custom-bundle-id"
                          type="text"
                          value={customBundleId}
                          onChange={(e) => setCustomBundleId(e.target.value)}
                          placeholder="e.g. com.yourcompany.app"
                          className="w-full bg-[#11151A] border border-[#272E38] focus:border-[#3A4250] text-[#ECE8DF] font-mono text-sm px-4 py-2.5 focus:outline-none focus:ring-0 rounded-none"
                        />
                      </div>
                    </div>

                    {/* Help details */}
                    <details className="group border border-[#272E38] bg-[#11151A]/50 rounded-none overflow-hidden">
                      <summary className="flex items-center justify-between px-4 py-2.5 cursor-pointer font-semibold text-xs text-[#878E9C] hover:text-[#ECE8DF] select-none transition-colors">
                        <span>How to get App Store Connect Key & Issuer ID?</span>
                        <span className="text-[#565D6B] group-open:rotate-180 transition-transform duration-200">▼</span>
                      </summary>
                      <div className="px-4 pb-4 pt-1 border-t border-[#272E38] text-[11px] text-[#878E9C] space-y-3 leading-relaxed">
                        <div>
                          <h4 className="font-bold text-[#C08A46] mb-1">1. Generate the .p8 Key and Key ID</h4>
                          <ol className="list-decimal pl-4 space-y-1">
                            <li>Log in to <a href="https://appstoreconnect.apple.com/" target="_blank" rel="noreferrer" className="text-[#C08A46] hover:underline">App Store Connect</a>.</li>
                            <li>Navigate to <strong>Users and Access</strong> &gt; <strong>Integrations</strong> &gt; <strong>Keys</strong>.</li>
                            <li>Generate a new key, select <strong>Admin</strong> as the Role, copy the <strong>Key ID</strong> and download the <code>.p8</code> file.</li>
                          </ol>
                        </div>
                        <div className="border-t border-[#272E38] pt-2">
                          <h4 className="font-bold text-[#C08A46] mb-1">2. Locate IDs</h4>
                          <p>The <strong>Issuer ID</strong> is a UUID displayed at the top of the keys table. The <strong>Apple Team ID</strong> is a 10-character code shown on the Apple Developer Account under Membership details.</p>
                        </div>
                      </div>
                    </details>
                  </div>
                </div>
              )}

              {/* STEP 4: REVIEW MANIFEST */}
              {step === 4 && (
                <div className="space-y-6">
                  <div>
                    <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-[#C08A46] block mb-1">Step 04</span>
                    <h2 className="text-2xl font-medium tracking-tight spectral-serif text-[#ECE8DF]">Review</h2>
                    <p className="text-xs text-[#878E9C] mt-1">Confirm configuration parameters before triggering EAS runner.</p>
                  </div>

                  <div className="border border-[#272E38] bg-[#11151A]/50 divide-y divide-[#272E38] max-w-xl">
                    {[
                      { label: 'project', val: folderName || 'No project loaded' },
                      { label: 'build profile', val: 'production' },
                      { label: 'masked token', val: maskSensitive(expoToken) },
                      { label: 'signing key filename', val: appleKeyFile?.name || '' },
                      { label: 'issuer ID', val: maskSensitive(issuerId) },
                      { label: 'key ID', val: keyId },
                      { label: 'destination', val: 'Expo Cloud / EAS' },
                    ].map((row, idx) => (
                      <div key={idx} className="flex justify-between items-center px-4 py-2.5 text-xs">
                        <span className="font-mono text-[11px] text-[#878E9C] uppercase tracking-wider">{row.label}</span>
                        <span className="font-mono text-[#ECE8DF] font-medium text-right break-all max-w-[70%]">{row.val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* STEP FOOTER CONTROLS */}
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
                    onClick={() => saveExpoToken()}
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
          </section>
        </div>

        {/* LOG TERMINAL DRAWER (Renders below stepped panel when a build is active or inspected) */}
        {activeBuild && (
          <div className="bg-[#181D24] border border-[#272E38] p-6 space-y-4">
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
                  onClick={() => setActiveBuild(null)}
                  className="px-3 py-1 border border-[#272E38] bg-transparent hover:border-[#3A4250] font-mono text-[10px] uppercase text-[#878E9C] hover:text-[#ECE8DF] transition-colors focus:outline-none"
                >
                  Close Console
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
        )}

        {/* DEPARTURES BOARD */}
        <section className="bg-[#181D24] border border-[#272E38]">
          <div className="px-6 py-4 border-b border-[#272E38] flex justify-between items-center">
            <h3 className="font-serif text-lg text-[#ECE8DF] font-medium">Departures</h3>
            <button
              id="refresh-departures-btn"
              onClick={fetchBuildHistory}
              disabled={isLoadingHistory}
              className="bg-[#11151A] hover:bg-[#181D24] border border-[#272E38] p-2 hover:text-[#ECE8DF] text-[#878E9C] disabled:opacity-50 transition-colors focus:outline-none"
            >
              <RefreshCwIcon className={`h-3.5 w-3.5 ${isLoadingHistory ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#272E38] text-[#565D6B] bg-[#11151A]/50 select-none">
                  <th className="px-6 py-3 font-semibold tracking-wider uppercase text-[10px]">App</th>
                  <th className="px-6 py-3 font-semibold tracking-wider uppercase text-[10px]">Platform</th>
                  <th className="px-6 py-3 font-semibold tracking-wider uppercase text-[10px]">Status</th>
                  <th className="px-6 py-3 font-semibold tracking-wider uppercase text-[10px]">Started</th>
                  <th className="px-6 py-3 font-semibold tracking-wider uppercase text-[10px] hidden md:table-cell">Gate</th>
                  <th className="px-6 py-3 font-semibold tracking-wider uppercase text-[10px] text-right">Clearance</th>
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
                        <td className="px-6 py-4">
                          <div className="font-semibold text-[#ECE8DF]">{build.projectName}</div>
                          <div className="text-[10px] text-[#565D6B] font-normal">#{shortId}</div>
                        </td>
                        <td className="px-6 py-4 text-[#878E9C] select-none">iOS</td>
                        <td className="px-6 py-4">
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
                        <td className="px-6 py-4 text-[#878E9C] select-none">{dateFormatted}</td>
                        <td className="px-6 py-4 text-[#878E9C] hidden md:table-cell select-none">EAS_G1</td>
                        <td className="px-6 py-4 text-right select-none">
                          <div className="flex justify-end gap-2">
                            <button
                              id={`btn-inspect-logs-${build._id}`}
                              onClick={() => viewBuildLogs(build)}
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
        </section>

      </main>

      {/* FOOTER */}
      <footer className="border-t border-[#272E38] bg-[#11151A] py-6 text-center text-[10px] text-[#565D6B] font-mono tracking-wider uppercase select-none">
        <p>© 2026 Hangar. EAS Clearance Operations. All rights reserved.</p>
      </footer>
    </div>
  );
}
