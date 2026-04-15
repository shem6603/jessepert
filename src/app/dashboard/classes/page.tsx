"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardTopBar } from "@/components/dashboard/DashboardTopBar";
import LoginButton from "@/components/LoginButton";
import { BookOpen, Plus, MoreVertical, X, Loader2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, addDoc, query, where, getDocs, serverTimestamp } from "firebase/firestore";

interface ClassData {
  id: string;
  name: string;
  grade: string;
  studentCount: number;
}

export default function ClassesPage() {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [fetchingClasses, setFetchingClasses] = useState(true);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [newClassGrade, setNewClassGrade] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadClasses() {
      if (!user) {
        setFetchingClasses(false);
        return;
      }
      try {
        const q = query(
          collection(db, "classes"),
          where("userId", "==", user.uid)
        );
        const querySnapshot = await getDocs(q);
        const loaded: ClassData[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          loaded.push({
            id: doc.id,
            name: data.name || "",
            grade: data.grade || "",
            studentCount: data.studentCount || 0,
          });
        });
        
        // Sort client side since we don't have an index yet
        loaded.sort((a, b) => a.name.localeCompare(b.name));
        
        setClasses(loaded);
      } catch (err) {
        console.error("Failed to load classes", err);
      } finally {
        setFetchingClasses(false);
      }
    }

    loadClasses();
  }, [user]);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!newClassName.trim()) {
      setError("Class name is required");
      return;
    }
    
    setIsCreating(true);
    setError(null);
    try {
      const docRef = await addDoc(collection(db, "classes"), {
        userId: user.uid,
        name: newClassName.trim(),
        grade: newClassGrade.trim(),
        studentCount: 0,
        createdAt: serverTimestamp(),
      });
      
      setClasses(prev => {
        const newClasses = [...prev, {
          id: docRef.id,
          name: newClassName.trim(),
          grade: newClassGrade.trim(),
          studentCount: 0,
        }];
        return newClasses.sort((a, b) => a.name.localeCompare(b.name));
      });
      
      setIsModalOpen(false);
      setNewClassName("");
      setNewClassGrade("");
    } catch (err) {
      console.error("Error creating class:", err);
      setError("Failed to create class. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] min-h-screen items-center justify-center bg-soft-teal px-4">
        <div
          className="h-12 w-12 animate-spin rounded-full border-2 border-sky-blue border-t-transparent"
          role="status"
          aria-label="Loading"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <main className="relative isolate flex min-h-[100dvh] min-h-screen w-full items-center justify-center overflow-x-hidden bg-soft-teal px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
          <div className="absolute top-[10%] left-[-10%] h-96 w-96 rounded-full bg-sky-blue/15 blur-3xl" />
          <div className="absolute bottom-[10%] right-[-10%] h-96 w-96 rounded-full bg-dark-teal/10 blur-3xl" />
        </div>
        <section className="w-full max-w-xl rounded-2xl border border-dark-teal/10 bg-white/85 p-6 shadow-lg backdrop-blur-sm sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <Image src="/logo.png" alt="Jesspert Logo" width={160} height={54} className="h-auto w-auto max-w-[140px] object-contain sm:max-w-[160px]" style={{ width: "auto", height: "auto" }} priority />
            <Link href="/" className="text-sm font-semibold text-dark-teal/80 underline-offset-4 hover:underline">Back to home</Link>
          </div>
          <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-navy sm:text-3xl">Sign in to open your dashboard</h1>
          <div className="mt-6"><LoginButton /></div>
        </section>
      </main>
    );
  }

  return (
    <div className="relative flex min-h-[100dvh] min-h-screen bg-soft-teal pt-[env(safe-area-inset-top)]">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div className="absolute top-[-10%] left-[-10%] h-[28rem] w-[28rem] rounded-full bg-sky-blue/10 blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[28rem] w-[28rem] rounded-full bg-dark-teal/10 blur-3xl" />
      </div>
      <DashboardSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:min-h-screen">
        <DashboardTopBar user={user} onMenuOpen={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 lg:px-10 lg:py-10">
          <div className="mx-auto w-full max-w-5xl">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
               <div>
                 <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-navy">Your Classes</h1>
                 <p className="mt-1 text-sm text-navy/70">Manage your classrooms and students.</p>
               </div>
               <button 
                 onClick={() => setIsModalOpen(true)}
                 className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-blue px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-sky-blue/20 transition hover:bg-sky-blue/90 hover:-translate-y-0.5 active:scale-95"
               >
                 <Plus className="h-4 w-4" />
                 Create Class
               </button>
            </div>

            {/* Classes Grid */}
            {fetchingClasses ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-sky-blue" />
              </div>
            ) : classes.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-dark-teal/30 bg-white/40 p-12 text-center backdrop-blur-sm">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sky-blue/10">
                  <BookOpen className="h-8 w-8 text-sky-blue" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-navy">No classes yet</h3>
                <p className="mt-2 text-sm text-navy/60 max-w-sm mx-auto">Get started by creating your first class to organize your students and assignments.</p>
                <button 
                   onClick={() => setIsModalOpen(true)}
                   className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-dark-teal border border-dark-teal/20 shadow-sm transition hover:bg-soft-teal/50 active:scale-95"
                 >
                   <Plus className="h-4 w-4" />
                   Create your first class
                 </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {classes.map((cls) => (
                  <div key={cls.id} className="group relative flex flex-col rounded-2xl border border-dark-teal/10 bg-white/80 p-5 shadow-sm backdrop-blur-sm transition-all hover:shadow-md hover:-translate-y-1">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-blue/10">
                        <BookOpen className="h-5 w-5 text-sky-blue" />
                      </div>
                      <button className="text-navy/40 hover:text-navy transition p-1">
                        <MoreVertical className="h-5 w-5" />
                      </button>
                    </div>
                    <h3 className="text-lg font-bold text-navy truncate">{cls.name}</h3>
                    {cls.grade && <p className="text-sm font-medium text-navy/60 mt-1">{cls.grade}</p>}
                    <div className="mt-6 pt-4 border-t border-dark-teal/5 flex items-center justify-between text-sm">
                      <span className="text-navy/60 font-medium">{cls.studentCount} student{cls.studentCount !== 1 && 's'}</span>
                      <Link href={`/dashboard/classes/${cls.id}`} className="text-sky-blue font-bold hover:underline">View details</Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Create Class Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-navy/40 backdrop-blur-sm">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="px-6 py-5 border-b border-navy/5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-navy">Create New Class</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-navy/40 hover:text-navy transition rounded-full hover:bg-navy/5"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateClass} className="p-6">
              {error && (
                <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600 border border-red-100">
                  {error}
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="className" className="block text-sm font-bold text-navy mb-1.5">Class Name <span className="text-red-500">*</span></label>
                  <input
                    id="className"
                    type="text"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    placeholder="e.g. Grade 10 Math"
                    className="w-full rounded-xl border border-dark-teal/20 bg-white px-4 py-2.5 text-navy outline-none focus:border-sky-blue focus:ring-2 focus:ring-sky-blue/20 transition-all font-medium"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="classGrade" className="block text-sm font-bold text-navy mb-1.5">Grade / Description (Optional)</label>
                  <input
                    id="classGrade"
                    type="text"
                    value={newClassGrade}
                    onChange={(e) => setNewClassGrade(e.target.value)}
                    placeholder="e.g. Form 4, 11th Grade"
                    className="w-full rounded-xl border border-dark-teal/20 bg-white px-4 py-2.5 text-navy outline-none focus:border-sky-blue focus:ring-2 focus:ring-sky-blue/20 transition-all font-medium"
                  />
                </div>
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
                      Creating...
                    </>
                  ) : (
                    "Create Class"
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
