/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { FileDown, UploadCloud, AlertCircle, RefreshCw, Layers, Sparkles, BookOpen, Clock } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { GenerationJob } from "../types";

interface UploadPageProps {
  token: string;
  onNavigate: (page: string, extra?: any) => void;
}

export default function UploadPage({ token, onNavigate }: UploadPageProps) {
  const [dragActive, setDragActive] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [customTitle, setCustomTitle] = React.useState("");
  const [statusMessage, setStatusMessage] = React.useState("");
  const [errorMessage, setErrorMessage] = React.useState("");
  const [job, setJob] = React.useState<GenerationJob | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const pollTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Clean timer on unmount
  React.useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    setErrorMessage("");
    if (selectedFile.type !== "application/pdf") {
      setErrorMessage("Only PDF documents are supported for intelligent ingestion.");
      return;
    }
    
    // Check size limit: 30MB Max
    const limitBytes = 30 * 1024 * 1024;
    if (selectedFile.size > limitBytes) {
      setErrorMessage("PDF size exceeds 30MB. Please optimize and upload a compressed file.");
      return;
    }

    setFile(selectedFile);
    // Pre-populate title with cleaner filename
    const cleanName = selectedFile.name.replace(/\.pdf$/i, "").replace(/[-_]/g, " ");
    setCustomTitle(cleanName);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  // Convert PDF to base64 and POST to backend REST endpoint
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setIsSubmitting(true);
    setErrorMessage("");
    setStatusMessage("Converting document to base64 buffer stream...");

    try {
      const reader = new FileReader();
      
      // Wrap FileReader in promise
      const convertBase64 = () => new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
      });

      const base64Data = await convertBase64();
      setStatusMessage("Pushing segment data to parsing queue...");

      const response = await fetch("/api/upload-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          pdfBase64: base64Data,
          customTitle: customTitle.trim() || undefined
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to trigger PDF ingestion pipeline.");
      }

      const jobId = data.jobId;
      startPolling(jobId);
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
      setErrorMessage(err instanceof Error ? err.message : "Ingestion crashed unexpectedly.");
    }
  };

  const startPolling = (jobId: string) => {
    setIsSubmitting(false);
    
    const poll = async () => {
      try {
        const response = await fetch(`/api/upload-status/${jobId}`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        const currentJob = (await response.json()) as GenerationJob;

        if (!response.ok) {
          throw new Error(currentJob.error || "Failed to check generation status.");
        }

        setJob(currentJob);

        if (currentJob.status === "completed" && currentJob.deckId) {
          // Success! Redirect to study deck view automatically
          const deckId = currentJob.deckId;
          setStatusMessage("Deck assembled! Launching deck library...");
          setTimeout(() => {
            onNavigate("study", deckId);
          }, 1500);
          return;
        }

        if (currentJob.status === "failed") {
          setErrorMessage(currentJob.error || "Background flashcard compilation failed.");
          return;
        }

        // Loop next interval
        pollTimerRef.current = setTimeout(poll, 1500);
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : "Polling status check crashed.");
      }
    };

    poll();
  };

  const getStatusExplanation = (status: GenerationJob["status"]) => {
    switch (status) {
      case "pending":
        return "Initializing ingestion threads on Cloud container...";
      case "analyzing":
        return "Extracting metadata and layout structures. Estimating school themes...";
      case "generating":
        return "Gemini AI is parsing content to construct active-recall pairs and clozes...";
      case "filtering":
        return "Running content audits, stripping clutter, and writing metadata records...";
      case "completed":
        return "Complete! Building card indices...";
      default:
        return "Assembling components...";
    }
  };

  const handleReset = () => {
    setFile(null);
    setCustomTitle("");
    setJob(null);
    setErrorMessage("");
    setStatusMessage("");
    setIsSubmitting(false);
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
  };

  return (
    <div className="w-full min-h-screen bg-[#0A0A0B] text-slate-350 p-6 md:p-12 relative flex justify-center">
      {/* Immersive radial glow background */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-indigo-500/5 rounded-full filter blur-3xl pointer-events-none" />

      <div className="w-full max-w-2xl flex flex-col relative z-10">
        
        {/* Navigation Breadcrumb */}
        <section className="mb-8 select-none">
          <button
            onClick={() => onNavigate("dashboard")}
            className="text-xs font-mono text-slate-500 hover:text-slate-300 font-medium transition-colors flex items-center gap-1 cursor-pointer"
          >
            ← Back to Dashboard
          </button>
          <h1 className="font-sans font-extrabold text-2xl tracking-tight text-white mt-1">
            Intelligent PDF Ingestion
          </h1>
        </section>

        {/* Content body */}
        <div className="p-6 rounded-2xl bg-[#161618] border border-[#262626] shadow-2xl">
          
          <AnimatePresence mode="wait">
            {!isSubmitting && !job ? (
              <motion.form
                key="upload-input"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onSubmit={handleUploadSubmit}
                className="flex flex-col gap-6"
              >
                {/* Drag n Drop block */}
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                    dragActive
                      ? "border-indigo-500 bg-indigo-500/5"
                      : file
                      ? "border-indigo-500/50 bg-[#0A0A0B]"
                      : "border-[#262626] hover:border-slate-800 bg-[#0A0A0B]"
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="application/pdf"
                    className="hidden"
                  />
                  
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center border mb-4 ${
                    file ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400" : "bg-[#262626]/40 border-[#262626] text-slate-500"
                  }`}>
                    {file ? <FileDown className="w-6 h-6" /> : <UploadCloud className="w-6 h-6" />}
                  </div>

                  {file ? (
                    <div>
                      <h4 className="text-sm font-sans font-bold text-white max-w-sm truncate">
                        {file.name}
                      </h4>
                      <p className="text-xs text-indigo-400 font-medium font-mono mt-1">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB • File Validated
                      </p>
                    </div>
                  ) : (
                    <div>
                      <h4 className="text-sm font-sans font-bold text-white">
                        Drag and drop your study PDF here
                      </h4>
                      <p className="text-xs text-slate-500 max-w-xs mt-1.5 leading-relaxed mx-auto">
                        Supports textbook chapters, lecture transcripts, and document files up to 30MB limit.
                      </p>
                      <button
                        type="button"
                        className="mt-4 px-3 py-1.5 bg-[#161618] border border-[#262626] hover:bg-[#262626] text-xs font-sans font-semibold text-slate-300 rounded-lg transition-all cursor-pointer"
                      >
                        Browse file system
                      </button>
                    </div>
                  )}
                </div>

                {/* Optional Custom Deck Name */}
                {file && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-mono text-slate-500 uppercase">
                      Custom Deck Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      placeholder="e.g. Mechanical Structures Final"
                      className="px-4 py-2.5 rounded-xl bg-[#0A0A0B] border border-[#262626] focus:border-indigo-500 focus:outline-none text-sm text-slate-100 transition-colors"
                    />
                  </div>
                )}

                {/* Error Banner */}
                {errorMessage && (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex gap-2.5 items-start">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">{errorMessage}</p>
                  </div>
                )}

                {/* Submit button */}
                {file && (
                  <button
                    type="submit"
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-505 rounded-xl text-sm font-sans font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/15 cursor-pointer transition-all text-white"
                  >
                    🚀 Trigger Flashcard Generator
                  </button>
                )}
              </motion.form>
            ) : (
              <motion.div
                key="upload-status"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col gap-6"
              >
                {/* Generation state visual card */}
                <div className="p-5 rounded-2xl bg-[#0A0A0B] border border-[#262626] flex flex-col gap-5 items-center justify-center text-center py-8">
                  {errorMessage ? (
                    <>
                      <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
                        <AlertCircle className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-sans font-bold text-white text-base">Generation Failed</h4>
                        <p className="text-xs text-red-400 mt-1 max-w-md leading-relaxed">
                          {errorMessage}
                        </p>
                      </div>
                      <button
                        onClick={handleReset}
                        className="px-4 py-2 bg-[#161618] hover:bg-[#262626] text-xs text-slate-200 border border-[#262626] rounded-xl font-semibold flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Retry New PDF
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="relative flex items-center justify-center">
                        <div className="w-14 h-14 rounded-full border border-indigo-500/10 flex items-center justify-center bg-[#161618] text-indigo-400">
                          <Sparkles className="w-6 h-6 animate-pulse" />
                        </div>
                        {/* Custom outer spinner */}
                        <div className="absolute inset-0 border-t-2 border-r-2 border-indigo-500 rounded-full animate-spin" style={{ margin: "-4px" }} />
                      </div>

                      <div className="w-full">
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-2.5 max-w-sm mx-auto">
                          <span className="font-mono uppercase text-[10px] tracking-wide text-indigo-400 font-bold bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/20">
                            {job?.status || "Processing"}
                          </span>
                          <span className="font-mono text-slate-400">{job?.progress || 10}%</span>
                        </div>
                        
                        {/* Status bar */}
                        <div className="w-full max-w-sm h-1.5 rounded-full bg-[#0A0A0B] border border-[#262626] overflow-hidden mx-auto">
                          <div
                            className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                            style={{ width: `${job?.progress || 10}%` }}
                          />
                        </div>

                        <h4 className="font-sans font-bold text-white text-sm mt-4">
                          {isSubmitting ? "Converting Assets" : (job?.deckName || "Compiling Smart Deck")}
                        </h4>
                        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed h-11">
                          {isSubmitting ? statusMessage : getStatusExplanation(job?.status || "pending")}
                        </p>
                        
                        {job?.totalCardsCreated && (
                          <p className="text-xs text-indigo-400 font-mono font-medium mt-1">
                            {job.totalCardsCreated} active-recall cards extracted so far...
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Educational checklist */}
                <div className="border-t border-[#262626] pt-5">
                  <h5 className="text-xs font-mono text-slate-550 uppercase tracking-wider mb-3">Our Generation Blueprint</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="flex gap-2 text-xs text-slate-500 leading-relaxed">
                      <BookOpen className="w-4 h-4 shrink-0 text-indigo-400 mt-0.5" />
                      <span><strong>Multimodal extraction</strong> utilizes direct document layout structures, skipping simple line-by-line parsers.</span>
                    </div>
                    <div className="flex gap-2 text-xs text-slate-500 leading-relaxed">
                      <Clock className="w-4 h-4 shrink-0 text-indigo-400 mt-0.5" />
                      <span><strong>SM-2 integration</strong> optimizes card availability to start training instantly upon successful generation.</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
