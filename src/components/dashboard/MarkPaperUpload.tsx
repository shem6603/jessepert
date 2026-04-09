"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Upload, FileImage } from "lucide-react";

const GRADE_OPTIONS = [
  { value: "", label: "Select grade level" },
  { value: "pep", label: "PEP (Primary)" },
  { value: "csec", label: "CSEC (Forms 4-5)" },
  { value: "cape", label: "CAPE (Form 6)" },
] as const;

const SUBJECT_OPTIONS = [
  { value: "", label: "Select subject" },
  { value: "english-a", label: "English A" },
  { value: "mathematics", label: "Mathematics" },
  { value: "biology", label: "Biology" },
  { value: "social-studies", label: "Social Studies" },
] as const;

const selectClassName =
  "w-full min-h-[44px] appearance-none rounded-xl border border-dark-teal/25 bg-white px-4 py-3 text-sm font-medium text-navy shadow-sm outline-none transition focus:border-sky-blue focus:ring-2 focus:ring-sky-blue/25";

export function MarkPaperUpload() {
  const [gradeLevel, setGradeLevel] = useState("");
  const [subject, setSubject] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const clearFile = useCallback(() => {
    setFile(null);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const setFileFromList = useCallback((list: FileList | null) => {
    const next = list?.[0];
    if (!next || !next.type.startsWith("image/")) return;
    setFile(next);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(next);
    });
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const canSubmit = Boolean(file && gradeLevel && subject);

  const handleGradePaper = () => {
    if (!canSubmit || !file) return;
    // Wire to your grading API / server action when ready
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setFileFromList(e.dataTransfer.files);
  };

  return (
    <section
      className="rounded-2xl border border-dark-teal/10 bg-white p-5 shadow-sm sm:p-8"
      aria-labelledby="mark-paper-heading"
    >
      <h2
        id="mark-paper-heading"
        className="text-xl font-bold text-navy sm:text-2xl"
      >
        Mark a New Paper
      </h2>
      <p className="mt-1 text-sm text-navy/65">
        Choose the level and subject, then upload a clear photo of the student’s
        work.
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <label
            htmlFor="grade-level"
            className="block text-sm font-semibold text-navy"
          >
            Grade level
          </label>
          <select
            id="grade-level"
            value={gradeLevel}
            onChange={(e) => setGradeLevel(e.target.value)}
            className={selectClassName}
          >
            {GRADE_OPTIONS.map((o) => (
              <option key={o.value || "placeholder"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="subject"
            className="block text-sm font-semibold text-navy"
          >
            Subject
          </label>
          <select
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className={selectClassName}
          >
            {SUBJECT_OPTIONS.map((o) => (
              <option key={o.value || "placeholder"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-8">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => setFileFromList(e.target.files)}
        />

        {!previewUrl ? (
          <div
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
            onDragEnter={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDragging(false);
            }}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-colors touch-manipulation ${
              isDragging
                ? "border-sky-blue bg-sky-blue/5"
                : "border-dark-teal/35 bg-soft-teal/40 hover:border-sky-blue/50 hover:bg-sky-blue/5"
            }`}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-dark-teal/10">
              <Upload className="h-7 w-7 text-sky-blue" aria-hidden />
            </div>
            <div>
              <p className="text-base font-semibold text-navy sm:text-lg">
                Drag &amp; drop a photo of handwritten homework here, or click to
                browse.
              </p>
              <p className="mt-2 text-sm text-navy/55">
                PNG or JPG — keep the page flat and well lit.
              </p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-dark-teal ring-1 ring-dark-teal/20">
              <FileImage className="h-4 w-4" aria-hidden />
              Choose file
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-4 rounded-2xl border border-dark-teal/15 bg-soft-teal/30 p-4 sm:flex-row sm:items-center">
            <div className="relative h-36 w-full overflow-hidden rounded-xl bg-navy/5 sm:h-28 sm:w-40 sm:shrink-0">
              <Image
                src={previewUrl}
                alt="Selected homework preview"
                fill
                className="object-contain"
                sizes="(max-width: 640px) 100vw, 160px"
                unoptimized
              />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <p className="truncate text-sm font-medium text-navy">
                {file?.name}
              </p>
              <button
                type="button"
                onClick={clearFile}
                className="touch-manipulation text-sm font-semibold text-sky-blue underline-offset-2 hover:underline"
              >
                Change file
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8">
        <button
          type="button"
          disabled={!canSubmit}
          onClick={handleGradePaper}
          className={`touch-manipulation w-full min-h-[48px] rounded-xl px-6 py-3.5 text-base font-bold transition sm:w-auto sm:min-w-[200px] ${
            canSubmit
              ? "bg-sky-blue text-white shadow-lg shadow-sky-blue/25 hover:bg-sky-blue/90 active:scale-[0.99]"
              : "cursor-not-allowed bg-navy/10 text-navy/40"
          }`}
        >
          Grade Paper
        </button>
      </div>
    </section>
  );
}
