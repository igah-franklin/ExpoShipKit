import React, { useState, useRef } from 'react';
import { KeyIcon } from 'lucide-react';

interface StepAppleProps {
  appleKeyFile: File | null;
  setAppleKeyFile: (file: File | null) => void;
  issuerId: string;
  setIssuerId: (val: string) => void;
  keyId: string;
  setKeyId: (val: string) => void;
  appleTeamId: string;
  setAppleTeamId: (val: string) => void;
  appleTeamType: string;
  setAppleTeamType: (val: string) => void;
  customBundleId: string;
  setCustomBundleId: (val: string) => void;
  setErrorMsg: (msg: string) => void;
  onNext: () => void;
}

export default function StepApple({
  appleKeyFile,
  setAppleKeyFile,
  issuerId,
  setIssuerId,
  keyId,
  setKeyId,
  appleTeamId,
  setAppleTeamId,
  appleTeamType,
  setAppleTeamType,
  customBundleId,
  setCustomBundleId,
  setErrorMsg,
  onNext,
}: StepAppleProps) {
  const [appleKeyDragActive, setAppleKeyDragActive] = useState(false);
  const p8InputRef = useRef<HTMLInputElement>(null);

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

  const isFormValid = !!appleKeyFile && issuerId.trim().length > 5 && keyId.trim().length > 4 && appleTeamId.trim().length > 4;

  return (
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
  );
}
