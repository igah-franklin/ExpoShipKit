import React, { useState, useRef } from 'react';
import JSZip from 'jszip';
import { Loader2Icon } from 'lucide-react';

interface StepProjectProps {
  folderName: string;
  filesCount: number;
  onProjectZip: (zip: Blob, folderName: string, filesCount: number) => void;
  setErrorMsg: (msg: string) => void;
}

export default function StepProject({
  folderName,
  filesCount,
  onProjectZip,
  setErrorMsg,
}: StepProjectProps) {
  const [isZipping, setIsZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

      onProjectZip(content, projName || 'Selected Project', total);
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

  return (
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
  );
}
