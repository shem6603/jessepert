"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardTopBar } from "@/components/dashboard/DashboardTopBar";
import LoginButton from "@/components/LoginButton";
import {
  Users,
  Plus,
  ArrowLeft,
  Loader2,
  X,
  GraduationCap,
  Map,
  Trash2,
  Target,
  Activity,
  Camera,
} from "lucide-react";
import { db } from "@/lib/firebase";
import {
  collection, addDoc, query, where, getDocs, doc, getDoc, updateDoc,
  serverTimestamp, deleteDoc, increment
} from "firebase/firestore";

interface ClassData {
  id: string;
  name: string;
  grade: string;
  studentCount: number;
}

interface StudentData {
  id: string;
  name: string;
  pathway: string;
  diagnosticScore?: number;
  dokProfile?: {
    level1: number;
    level2: number;
    level3: number;
    level4: number;
  };
}

export default function ClassDetailsPage() {
  const { user, loading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const classId = params.id as string;

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Data state
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [fetchingData, setFetchingData] = useState(true);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [middleInitial, setMiddleInitial] = useState("");
  const [surname, setSurname] = useState("");
  const [newStudentPathway, setNewStudentPathway] = useState("Pathway 1");
  const [diagnosticScore, setDiagnosticScore] = useState(""); // New field for baseline

  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Scan roster from photo
  const [scanImageDataUrl, setScanImageDataUrl] = useState<string | null>(null);
  const [scanNames, setScanNames] = useState<{ name: string; confidence: number }[]>([]);
  const [scanNotes, setScanNotes] = useState<string | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanAdding, setScanAdding] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function loadClassData() {
      if (!user || !classId) {
        setFetchingData(false);
        return;
      }

      try {
        const classRef = doc(db, "classes", classId);
        const classSnap = await getDoc(classRef);

        if (classSnap.exists()) {
          const data = classSnap.data();
          if (data.userId === user.uid) {
            setClassData({
              id: classSnap.id,
              name: data.name || "",
              grade: data.grade || "",
              studentCount: data.studentCount || 0,
            });

            const q = query(
              collection(db, "students"),
              where("classId", "==", classId)
            );
            const studentSnap = await getDocs(q);
            const loadedStudents: StudentData[] = [];
            studentSnap.forEach(doc => {
              const sData = doc.data();
              loadedStudents.push({
                id: doc.id,
                name: sData.name || "",
                pathway: sData.pathway || "",
                diagnosticScore: sData.diagnosticScore,
                dokProfile: sData.dokProfile || { level1: 0, level2: 0, level3: 0, level4: 0 },
              });
            });

            loadedStudents.sort((a, b) => a.name.localeCompare(b.name));
            setStudents(loadedStudents);
          } else {
            router.push("/dashboard/classes");
          }
        } else {
          router.push("/dashboard/classes");
        }
      } catch (err) {
        console.error("Error fetching class data:", err);
      } finally {
        setFetchingData(false);
      }
    }

    loadClassData();
  }, [user, classId, router]);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !classData) return;

    if (!firstName.trim() || !surname.trim()) {
      setError("First name and surname are required");
      return;
    }

    const fullName = `${firstName.trim()} ${middleInitial.trim() ? middleInitial.trim() + " " : ""}${surname.trim()}`;
    const parsedScore = diagnosticScore ? parseFloat(diagnosticScore) : null;

    setIsCreating(true);
    setError(null);

    try {
      const newStudentData = {
        userId: user.uid,
        classId: classData.id,
        name: fullName,
        firstName: firstName.trim(),
        middleInitial: middleInitial.trim().toUpperCase(),
        surname: surname.trim(),
        pathway: newStudentPathway,
        diagnosticScore: parsedScore,
        // Initialize an empty DOK profile for future assignment tracking
        dokProfile: {
          level1: 0,
          level2: 0,
          level3: 0,
          level4: 0
        },
        createdAt: serverTimestamp(),
      };

      const studentDocRef = await addDoc(collection(db, "students"), newStudentData);

      const classRef = doc(db, "classes", classData.id);
      await updateDoc(classRef, {
        studentCount: increment(1)
      });

      setStudents(prev => {
        const updated = [...prev, {
          id: studentDocRef.id,
          name: fullName,
          pathway: newStudentPathway,
          diagnosticScore: parsedScore || undefined,
          dokProfile: { level1: 0, level2: 0, level3: 0, level4: 0 }
        }];
        return updated.sort((a, b) => a.name.localeCompare(b.name));
      });

      setClassData(prev => prev ? { ...prev, studentCount: prev.studentCount + 1 } : null);

      setIsModalOpen(false);

      // Reset fields
      setFirstName("");
      setMiddleInitial("");
      setSurname("");
      setNewStudentPathway("Pathway 1");
      setDiagnosticScore("");
    } catch (err) {
      console.error("Error adding student:", err);
      setError("Failed to add student. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (!confirm("Are you sure you want to remove this student?")) return;

    try {
      await deleteDoc(doc(db, "students", studentId));

      const classRef = doc(db, "classes", classId);
      await updateDoc(classRef, {
        studentCount: increment(-1)
      });

      setStudents(prev => prev.filter(s => s.id !== studentId));
      setClassData(prev => prev ? { ...prev, studentCount: Math.max(0, prev.studentCount - 1) } : null);
    } catch (err) {
      console.error("Error deleting student:", err);
      alert("Failed to delete student");
    }
  };

  const handleScanFileChange = async (file: File | null) => {
    setScanError(null);
    setScanNotes(null);
    setScanNames([]);

    if (!file) {
      setScanImageDataUrl(null);
      return;
    }

    const reader = new FileReader();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      reader.onerror = () => reject(new Error("Failed to read image"));
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(file);
    });

    setScanImageDataUrl(dataUrl);
  };

  const handleScanNames = async () => {
    if (!scanImageDataUrl) {
      setScanError("Please take a photo or upload an image first.");
      return;
    }

    setScanLoading(true);
    setScanError(null);
    setScanNotes(null);
    setScanNames([]);

    try {
      const res = await fetch("/api/student-names", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: scanImageDataUrl }),
      });

      const data = (await res.json()) as
        | { names: { name: string; confidence: number }[]; notes?: string }
        | { error: string };

      if (!res.ok) {
        const message = "error" in data ? data.error : "Failed to scan names.";
        throw new Error(message);
      }

      const names = Array.isArray((data as any).names) ? (data as any).names : [];
      setScanNames(names);
      setScanNotes((data as any).notes ?? null);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Failed to scan names.");
    } finally {
      setScanLoading(false);
    }
  };

  const isNameAlreadyInRoster = (fullName: string) => {
    const key = fullName.trim().toLowerCase();
    return students.some((s) => s.name.trim().toLowerCase() === key);
  };

  const splitFullName = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length < 2) return { firstName: parts[0] ?? "", surname: "" };
    return { firstName: parts.slice(0, -1).join(" "), surname: parts.at(-1) ?? "" };
  };

  const handleAddStudentFromScan = async (fullName: string) => {
    if (!user || !classData) return;
    if (isNameAlreadyInRoster(fullName)) return;

    const { firstName: parsedFirst, surname: parsedSurname } = splitFullName(fullName);
    if (!parsedFirst || !parsedSurname) {
      setScanError(`"${fullName}" needs at least a first and last name to add.`);
      return;
    }

    const key = fullName.trim().toLowerCase();
    setScanAdding((prev) => ({ ...prev, [key]: true }));
    setScanError(null);

    try {
      const newStudentData = {
        userId: user.uid,
        classId: classData.id,
        name: fullName.trim(),
        firstName: parsedFirst,
        middleInitial: "",
        surname: parsedSurname,
        pathway: "Pathway 1",
        diagnosticScore: null,
        dokProfile: { level1: 0, level2: 0, level3: 0, level4: 0 },
        createdAt: serverTimestamp(),
      };

      const studentDocRef = await addDoc(collection(db, "students"), newStudentData);

      const classRef = doc(db, "classes", classData.id);
      await updateDoc(classRef, { studentCount: increment(1) });

      setStudents((prev) => {
        const updated = [
          ...prev,
          {
            id: studentDocRef.id,
            name: fullName.trim(),
            pathway: "Pathway 1",
            diagnosticScore: undefined,
            dokProfile: { level1: 0, level2: 0, level3: 0, level4: 0 },
          },
        ];
        return updated.sort((a, b) => a.name.localeCompare(b.name));
      });

      setClassData((prev) => (prev ? { ...prev, studentCount: prev.studentCount + 1 } : null));
    } catch (err) {
      console.error("Error adding scanned student:", err);
      setScanError("Failed to add student from scan. Please try again.");
    } finally {
      setScanAdding((prev) => ({ ...prev, [key]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-soft-teal px-4">
        <Loader2 className="h-12 w-12 animate-spin text-sky-blue" />
      </div>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-soft-teal px-4">
        <section className="w-full max-w-xl rounded-2xl bg-white/85 p-6 shadow-lg sm:p-8">
          <LoginButton />
        </section>
      </main>
    );
  }

  return (
    <div className="relative flex min-h-[100dvh] bg-soft-teal">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div className="absolute top-[-10%] left-[-10%] h-[28rem] w-[28rem] rounded-full bg-sky-blue/10 blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[28rem] w-[28rem] rounded-full bg-dark-teal/10 blur-3xl" />
      </div>

      <DashboardSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:min-h-screen">
        <DashboardTopBar user={user} onMenuOpen={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          <div className="mx-auto w-full max-w-5xl">
            <div className="mb-6">
              <Link href="/dashboard/classes" className="inline-flex items-center text-sm font-semibold text-navy/60 hover:text-navy mb-4 transition">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Classes
              </Link>
            </div>

            {fetchingData ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-sky-blue" />
              </div>
            ) : classData ? (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-navy">{classData.name}</h1>
                    {classData.grade && <p className="mt-1 text-sm text-navy/70">{classData.grade}</p>}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => setIsModalOpen(true)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-blue px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-sky-blue/20 transition hover:bg-sky-blue/90 hover:-translate-y-0.5 active:scale-95"
                    >
                      <Plus className="h-4 w-4" />
                      Add Student
                    </button>
                  </div>
                </div>

                <div className="mb-8 rounded-2xl border border-dark-teal/10 bg-white/80 shadow-sm backdrop-blur-sm overflow-hidden">
                  <div className="px-6 py-5 border-b border-dark-teal/5 flex items-center justify-between bg-white/50">
                    <h3 className="font-bold text-navy flex items-center gap-2">
                      <Camera className="h-5 w-5 text-sky-blue" />
                      Scan student names from a photo
                    </h3>
                    <button
                      onClick={handleScanNames}
                      disabled={scanLoading || !scanImageDataUrl}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white shadow-md shadow-navy/10 transition hover:bg-navy/90 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {scanLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {scanLoading ? "Scanning..." : "Scan names"}
                    </button>
                  </div>

                  <div className="px-6 py-6">
                    {scanError ? (
                      <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600 border border-red-100">
                        {scanError}
                      </div>
                    ) : null}

                    <div className="grid gap-5 lg:grid-cols-[1fr,2fr]">
                      <div>
                        <label className="block text-sm font-bold text-navy mb-2">Take a photo / upload</label>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => handleScanFileChange(e.target.files?.[0] ?? null)}
                          className="block w-full text-sm text-navy/70 file:mr-4 file:rounded-xl file:border-0 file:bg-sky-blue file:px-4 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-sky-blue/90"
                        />
                        <p className="mt-2 text-xs text-navy/50">
                          Tip: a straight-on photo with good lighting works best.
                        </p>

                        {scanImageDataUrl ? (
                          <div className="mt-4 overflow-hidden rounded-2xl border border-dark-teal/10 bg-white">
                            <Image
                              src={scanImageDataUrl}
                              alt="Selected scan"
                              width={900}
                              height={600}
                              className="h-auto w-full"
                              unoptimized
                            />
                          </div>
                        ) : null}
                      </div>

                      <div>
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-bold text-navy">Detected names</p>
                          {scanNotes ? (
                            <p className="text-xs text-navy/50">{scanNotes}</p>
                          ) : (
                            <span className="text-xs text-navy/40 italic">No scan yet</span>
                          )}
                        </div>

                        <div className="mt-3 rounded-2xl border border-dark-teal/10 bg-white">
                          {scanNames.length === 0 ? (
                            <div className="px-5 py-8 text-center text-sm text-navy/60">
                              Upload a photo, then click <span className="font-bold text-navy">Scan names</span>.
                            </div>
                          ) : (
                            <ul className="divide-y divide-dark-teal/5">
                              {scanNames.map((n) => {
                                const key = n.name.trim().toLowerCase();
                                const already = isNameAlreadyInRoster(n.name);
                                const { surname } = splitFullName(n.name);
                                const canAdd = !already && Boolean(surname);
                                const busy = Boolean(scanAdding[key]);

                                return (
                                  <li key={key} className="px-5 py-4 flex items-center justify-between gap-4">
                                    <div className="min-w-0">
                                      <p className="font-bold text-navy truncate">{n.name}</p>
                                      <p className="text-xs text-navy/50">
                                        Confidence: {Math.round((n.confidence ?? 0) * 100)}%
                                        {!surname ? " • Needs last name to add" : null}
                                        {already ? " • Already in roster" : null}
                                      </p>
                                    </div>
                                    <button
                                      onClick={() => handleAddStudentFromScan(n.name)}
                                      disabled={!canAdd || busy}
                                      className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-sky-blue px-4 py-2 text-xs font-bold text-white shadow-sm shadow-sky-blue/20 transition hover:bg-sky-blue/90 disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                      {already ? "Added" : "Add"}
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-dark-teal/10 bg-white/80 shadow-sm backdrop-blur-sm overflow-hidden">
                  <div className="px-6 py-5 border-b border-dark-teal/5 flex justify-between items-center bg-white/50">
                    <h3 className="font-bold text-navy flex items-center gap-2">
                      <Users className="h-5 w-5 text-sky-blue" />
                      Students Overview
                    </h3>
                    <span className="text-sm font-semibold bg-sky-blue/10 text-sky-blue px-3 py-1 rounded-full">
                      {classData.studentCount} Total
                    </span>
                  </div>

                  {students.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-navy/5 mb-4">
                        <GraduationCap className="h-8 w-8 text-navy/40" />
                      </div>
                      <h4 className="font-bold text-navy text-lg">No students enrolled</h4>
                      <p className="text-sm text-navy/60 mt-2 max-w-sm mx-auto">Add your students and enter their diagnostic baseline to start tracking DOK progress.</p>
                      <button onClick={() => setIsModalOpen(true)} className="mt-4 text-sm font-bold text-sky-blue hover:underline">
                        + Add first student
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-navy/5 text-navy/70 font-semibold">
                          <tr>
                            <th scope="col" className="px-6 py-3">Student Name</th>
                            <th scope="col" className="px-6 py-3">Pathway</th>
                            <th scope="col" className="px-6 py-3">Diagnostic Baseline</th>
                            <th scope="col" className="px-6 py-3">DOK Profile</th>
                            <th scope="col" className="px-6 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-dark-teal/5 text-navy">
                          {students.map((student) => (
                            <tr key={student.id} className="hover:bg-soft-teal/40 transition">
                              <td className="px-6 py-4 font-bold">
                                {student.name}
                              </td>
                              <td className="px-6 py-4">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-navy/5 text-navy/80 text-xs font-semibold">
                                  <Map className="h-3 w-3" />
                                  {student.pathway || "Unassigned"}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                {student.diagnosticScore !== undefined && student.diagnosticScore !== null ? (
                                  <span className="inline-flex items-center gap-1.5 font-bold text-dark-teal">
                                    <Target className="h-4 w-4" />
                                    {student.diagnosticScore}%
                                  </span>
                                ) : (
                                  <span className="text-navy/40 italic text-xs">No data</span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-100">
                                  <Activity className="h-3 w-3" />
                                  Awaiting Assignments
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button
                                  onClick={() => handleDeleteStudent(student.id)}
                                  className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                                  title="Remove student"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="py-20 text-center">
                <h2 className="text-xl font-bold text-navy">Class not found</h2>
                <Link href="/dashboard/classes" className="mt-4 inline-block text-sky-blue font-bold hover:underline">Return to Classes</Link>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Add Student Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-navy/40 backdrop-blur-sm">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="px-6 py-5 border-b border-navy/5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-navy">Add New Student</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-navy/40 hover:text-navy transition rounded-full hover:bg-navy/5"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddStudent} className="p-6">
              {error && (
                <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600 border border-red-100">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-12 sm:col-span-5">
                    <label htmlFor="firstName" className="block text-sm font-bold text-navy mb-1.5">First Name <span className="text-red-500">*</span></label>
                    <input
                      id="firstName"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="e.g. John"
                      className="w-full rounded-xl border border-dark-teal/20 bg-white px-4 py-2.5 text-navy outline-none focus:border-sky-blue focus:ring-2 focus:ring-sky-blue/20 transition-all font-medium"
                      required
                    />
                  </div>

                  <div className="col-span-12 sm:col-span-2">
                    <label htmlFor="middleInitial" className="block text-sm font-bold text-navy mb-1.5">M.I.</label>
                    <input
                      id="middleInitial"
                      type="text"
                      maxLength={1}
                      value={middleInitial}
                      onChange={(e) => setMiddleInitial(e.target.value)}
                      placeholder="A"
                      className="w-full rounded-xl border border-dark-teal/20 bg-white px-4 py-2.5 text-navy text-center outline-none focus:border-sky-blue focus:ring-2 focus:ring-sky-blue/20 transition-all font-medium uppercase"
                    />
                  </div>

                  <div className="col-span-12 sm:col-span-5">
                    <label htmlFor="surname" className="block text-sm font-bold text-navy mb-1.5">Surname <span className="text-red-500">*</span></label>
                    <input
                      id="surname"
                      type="text"
                      value={surname}
                      onChange={(e) => setSurname(e.target.value)}
                      placeholder="e.g. Doe"
                      className="w-full rounded-xl border border-dark-teal/20 bg-white px-4 py-2.5 text-navy outline-none focus:border-sky-blue focus:ring-2 focus:ring-sky-blue/20 transition-all font-medium"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="pathway" className="block text-sm font-bold text-navy mb-1.5">Pathway</label>
                    <select
                      id="pathway"
                      value={newStudentPathway}
                      onChange={(e) => setNewStudentPathway(e.target.value)}
                      className="w-full rounded-xl border border-dark-teal/20 bg-white px-4 py-2.5 text-navy outline-none focus:border-sky-blue focus:ring-2 focus:ring-sky-blue/20 transition-all font-medium appearance-none"
                    >
                      <option value="Pathway 1">Pathway 1</option>
                      <option value="Pathway 2">Pathway 2</option>
                      <option value="Pathway 3">Pathway 3</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="diagnosticScore" className="block text-sm font-bold text-navy mb-1.5">Baseline Score (%)</label>
                    <input
                      id="diagnosticScore"
                      type="number"
                      min="0"
                      max="100"
                      value={diagnosticScore}
                      onChange={(e) => setDiagnosticScore(e.target.value)}
                      placeholder="e.g. 75"
                      className="w-full rounded-xl border border-dark-teal/20 bg-white px-4 py-2.5 text-navy outline-none focus:border-sky-blue focus:ring-2 focus:ring-sky-blue/20 transition-all font-medium"
                    />
                  </div>
                </div>
                <p className="text-xs text-navy/50">The Baseline Score sets the student's starting point before any DOK assignments are recorded.</p>
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 rounded-xl px-4 py-2.5 text-sm font-bold text-navy bg-navy/5 hover:bg-navy/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex flex-[2] items-center justify-center gap-2 rounded-xl bg-sky-blue px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-sky-blue/20 transition hover:bg-sky-blue/90 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Student"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}