import React from 'react';

interface StepReviewProps {
  folderName: string;
  expoToken: string;
  appleKeyFile: File | null;
  issuerId: string;
  keyId: string;
}

export default function StepReview({
  folderName,
  expoToken,
  appleKeyFile,
  issuerId,
  keyId,
}: StepReviewProps) {
  const maskSensitive = (val: string) => {
    if (!val) return '—';
    if (val.length <= 4) return '••••';
    return `•••• ${val.slice(-4)}`;
  };

  const rows = [
    { label: 'project', val: folderName || 'No project loaded' },
    { label: 'build profile', val: 'production' },
    { label: 'masked token', val: maskSensitive(expoToken) },
    { label: 'signing key filename', val: appleKeyFile?.name || '' },
    { label: 'issuer ID', val: maskSensitive(issuerId) },
    { label: 'key ID', val: keyId },
    { label: 'destination', val: 'Expo Cloud / EAS' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-[#C08A46] block mb-1">Step 04</span>
        <h2 className="text-2xl font-medium tracking-tight spectral-serif text-[#ECE8DF]">Review</h2>
        <p className="text-xs text-[#878E9C] mt-1">Confirm configuration parameters before triggering EAS runner.</p>
      </div>

      <div className="border border-[#272E38] bg-[#11151A]/50 divide-y divide-[#272E38] max-w-xl">
        {rows.map((row, idx) => (
          <div key={idx} className="flex justify-between items-center px-4 py-2.5 text-xs">
            <span className="font-mono text-[11px] text-[#878E9C] uppercase tracking-wider">{row.label}</span>
            <span className="font-mono text-[#ECE8DF] font-medium text-right break-all max-w-[70%]">{row.val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
