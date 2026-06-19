import React, { useState, useRef } from 'react';
import JSZip from 'jszip';
import { Loader2Icon, GitBranchIcon } from 'lucide-react';

interface StepProjectProps {
  folderName: string;
  filesCount: number;
  onProjectZip: (zip: Blob, folderName: string, filesCount: number) => void;
  setErrorMsg: (msg: string) => void;
  projectSource: 'local' | 'github';
  setProjectSource: (src: 'local' | 'github') => void;
  githubUrl: string;
  setGithubUrl: (url: string) => void;
  githubBranch: string;
  setGithubBranch: (branch: string) => void;
}

export default function StepProject({
  folderName,
  filesCount,
  onProjectZip,
  setErrorMsg,
  projectSource,
  setProjectSource,
  githubUrl,
  setGithubUrl,
  githubBranch,
  setGithubBranch,
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
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-[#C08A46] block mb-1">Step 01</span>
          <h2 className="text-2xl font-medium tracking-tight spectral-serif text-[#ECE8DF]">Project Source</h2>
          <p className="text-xs text-[#878E9C] mt-1">Provide your Expo application source files.</p>
        </div>

        {/* Tab Selector */}
        <div className="flex border border-[#272E38] p-0.5 bg-[#11151A] self-start md:self-end">
          <button
            type="button"
            onClick={() => setProjectSource('local')}
            className={`px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-all focus:outline-none ${
              projectSource === 'local'
                ? 'bg-[#E3A857] text-[#11151A] font-bold'
                : 'text-[#878E9C] hover:text-[#ECE8DF]'
            }`}
          >
            Local Folder
          </button>
          <button
            type="button"
            onClick={() => setProjectSource('github')}
            className={`px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-all focus:outline-none ${
              projectSource === 'github'
                ? 'bg-[#E3A857] text-[#11151A] font-bold'
                : 'text-[#878E9C] hover:text-[#ECE8DF]'
            }`}
          >
            GitHub Repo
          </button>
        </div>
      </div>

      {projectSource === 'local' ? (
        <div
          id="dropzone"
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border border-dashed p-10 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-3 rounded-none ${
            dragActive
              ? 'border-[#E3A857] bg-[#1F2530]/50'
              : 'border-[#272E38] hover:border-[#3A4250] bg-[#14181F]/30'
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
      ) : (
        <div className="space-y-4 max-w-xl bg-[#14181F]/30 border border-[#272E38] p-6 animate-fade-in">
          <div className="flex items-center gap-2 mb-2 text-[#C08A46]">
            <GitBranchIcon className="h-4 w-4" />
            <span className="font-mono text-xs uppercase tracking-wider font-semibold">GitHub Integration</span>
          </div>

          <div className="space-y-2">
            <label htmlFor="github-url" className="block font-mono text-[11px] text-[#878E9C] uppercase tracking-wider">
              GitHub Repository URL <span className="text-[#C1604F]">*</span>
            </label>
            <input
              id="github-url"
              type="text"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="e.g. https://github.com/username/my-expo-app"
              className="w-full bg-[#11151A] border border-[#272E38] focus:border-[#3A4250] text-[#ECE8DF] font-mono text-sm px-4 py-2.5 focus:outline-none focus:ring-0 rounded-none transition-colors"
            />
            <p className="text-[10px] text-[#565D6B] font-mono">
              Supports public repositories (format: https://github.com/owner/repo)
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="github-branch" className="block font-mono text-[11px] text-[#878E9C] uppercase tracking-wider">
              Branch Name <span className="text-[#565D6B]">(Optional)</span>
            </label>
            <input
              id="github-branch"
              type="text"
              value={githubBranch}
              onChange={(e) => setGithubBranch(e.target.value)}
              placeholder="e.g. main"
              className="w-full bg-[#11151A] border border-[#272E38] focus:border-[#3A4250] text-[#ECE8DF] font-mono text-sm px-4 py-2.5 focus:outline-none focus:ring-0 rounded-none transition-colors"
            />
          </div>
        </div>
      )}
    </div>
  );
}
