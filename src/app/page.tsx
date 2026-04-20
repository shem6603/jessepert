import Image from "next/image";
import Link from "next/link";
import LoginButton from "@/components/LoginButton";

export default function Home() {
  return (
    <div className="bg-background text-on-background font-body min-h-screen flex flex-col relative overflow-x-hidden selection:bg-primary-container selection:text-on-primary-container">
      {/* Decorative Background */}
      <div aria-hidden="true" className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[800px] h-[800px] rounded-full bg-secondary-container/20 blur-[120px] mix-blend-multiply"></div>
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-primary-container/10 blur-[100px] mix-blend-multiply"></div>
        <div className="absolute top-[40%] left-[20%] w-[400px] h-[400px] rounded-full bg-surface-container-high/40 blur-[80px]"></div>
      </div>

      {/* TopNavBar */}
      <nav className="fixed top-0 w-full z-50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] transition-all duration-300">
        <div className="flex justify-between items-center px-8 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-2 relative">
            <div className="absolute inset-[-2px] bg-white/60 dark:bg-white/80 rounded-[2rem] blur-sm z-0 pointer-events-none"></div>
            <Image
              src="/logo.png"
              alt="Clarified Educator"
              width={90}
              height={30}
              className="max-w-[100px] object-contain relative z-10"
              style={{ width: "auto", height: "auto" }}
              priority={true}
            />
          </div>
          <div className="hidden md:flex items-center gap-8">
            <Link className="text-slate-600 dark:text-slate-400 hover:text-sky-600 font-medium font-body transition-colors" href="#">Features</Link>
            <Link className="text-slate-600 dark:text-slate-400 hover:text-sky-600 font-medium font-body transition-colors" href="#">Case Studies</Link>
            <Link className="text-slate-600 dark:text-slate-400 hover:text-sky-600 font-medium font-body transition-colors" href="#">Pricing</Link>
            <Link className="text-slate-600 dark:text-slate-400 hover:text-sky-600 font-medium font-body transition-colors" href="#">Resources</Link>
          </div>
          <div className="bg-gradient-to-r from-primary to-primary-container text-on-primary rounded-full hover:shadow-lg hover:opacity-90 transition-all duration-300">
            <LoginButton />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow relative z-10 pt-32 pb-24 px-8 max-w-7xl mx-auto w-full flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          {/* Left Column: Hero Copy */}
          <div className="lg:col-span-6 flex flex-col gap-8 text-left">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-container-high/50 text-on-surface-variant text-sm font-medium border border-outline-variant/20 w-fit backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
              </span>
              Now in open beta for Jamaican educators
            </div>
            <h1 className="text-5xl lg:text-7xl font-extrabold font-headline text-on-background leading-[1.1] tracking-tight">
              Get Back More Than <span className="bg-gradient-to-r from-secondary to-secondary-container text-gradient inline-block">8 Hours a Week.</span>
            </h1>
            <div className="text-2xl lg:text-3xl font-headline font-bold text-on-surface-variant flex items-center gap-2">
              <span>Meet Your AI</span>
              <span className="text-secondary relative">
                Lesson Planner
                <span className="absolute bottom-0 left-0 w-full h-1 bg-secondary/30 -z-10 rounded"></span>
              </span>
            </div>
            <p className="text-lg lg:text-xl font-body text-on-surface-variant leading-relaxed max-w-xl">
              Stop sacrificing your evenings to unpaid marking and weekend lesson planning. Reclaim your time with intelligent automation designed specifically for the Caribbean curriculum.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <Link href="/dashboard" className="bg-gradient-to-r from-primary to-primary-container text-on-primary px-8 py-4 rounded-full font-bold text-base tracking-wide hover:shadow-[0_8px_20px_rgba(0,101,141,0.3)] transition-all duration-300 flex items-center justify-center gap-2">
                Start for Free
                <span className="material-symbols-outlined">arrow_forward</span>
              </Link>
              <button className="bg-secondary text-on-secondary px-8 py-4 rounded-full font-bold text-base hover:bg-secondary-container transition-colors flex items-center justify-center gap-2">
                <span className="material-symbols-outlined">play_circle</span>
                Watch Demo
              </button>
            </div>
          </div>
          {/* Right Column: Interactive Demo Card */}
          <div className="lg:col-span-6 relative">
            {/* Decorative element behind card */}
            <div className="absolute -inset-4 bg-gradient-to-br from-primary-container/20 to-secondary-container/20 rounded-[2rem] blur-2xl -z-10"></div>
            <div className="glass-panel rounded-[2rem] p-8 border border-white/40 dark:border-white/10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-primary-container/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
                </div>
                <h2 className="text-xl font-bold font-headline text-on-surface">Try Jesspert: Quick Lesson Demo</h2>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-2 font-body">Lesson Topic</label>
                  <div className="relative">
                    <input className="w-full bg-surface-variant border-transparent focus:bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-3 text-on-surface font-body placeholder-outline transition-all" placeholder="e.g., Photosynthesis in tropical plants" type="text" />
                    <span className="material-symbols-outlined absolute right-4 top-3 text-outline">search</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-on-surface-variant mb-2 font-body">Grade Level</label>
                    <select className="w-full bg-surface-variant border-transparent focus:bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-3 text-on-surface font-body appearance-none transition-all">
                      <option>Grade 9</option>
                      <option>Grade 10</option>
                      <option>CSEC</option>
                      <option>CAPE</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-on-surface-variant mb-2 font-body">Duration</label>
                    <select className="w-full bg-surface-variant border-transparent focus:bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-3 text-on-surface font-body appearance-none transition-all">
                      <option>45 mins</option>
                      <option>60 mins</option>
                      <option>90 mins</option>
                    </select>
                  </div>
                </div>
                <button className="w-full bg-primary text-on-primary rounded-xl py-3 font-bold font-body hover:bg-on-primary-fixed-variant transition-colors flex justify-center items-center gap-2">
                  <span className="material-symbols-outlined text-sm">bolt</span>
                  Generate Outline
                </button>
                <div className="mt-6 border-t border-outline-variant/30 pt-6">
                  <h3 className="text-sm font-bold text-on-surface-variant mb-3 uppercase tracking-wider font-headline">AI Output Preview</h3>
                  <div className="bg-surface-container-low rounded-xl p-4 font-body text-sm text-on-surface-variant space-y-3">
                    <div className="flex gap-2">
                      <span className="material-symbols-outlined text-primary text-lg">check_circle</span>
                      <p><strong className="text-on-surface">Objective:</strong> Students will identify the main stages of photosynthesis specific to C3 plants...</p>
                    </div>
                    <div className="w-full h-2 bg-surface-variant rounded-full overflow-hidden">
                      <div className="w-1/3 h-full bg-secondary/50"></div>
                    </div>
                    <div className="w-full h-2 bg-surface-variant rounded-full overflow-hidden">
                      <div className="w-2/3 h-full bg-secondary/30"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Cards Grid (Bottom) */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="glass-panel rounded-xl p-6 border border-white/40 dark:border-white/10 hover:bg-surface-container-lowest/90 transition-all duration-300 transform hover:-translate-y-1">
            <div className="w-12 h-12 rounded-full bg-primary-container/10 flex items-center justify-center mb-4 text-primary">
              <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>grading</span>
            </div>
            <h3 className="text-xl font-bold font-headline text-on-surface mb-2">Instant Grading</h3>
            <p className="text-on-surface-variant font-body text-sm leading-relaxed">
              Automate multiple-choice and short-answer grading aligned with regional syllabi standards.
            </p>
          </div>
          {/* Card 2 */}
          <div className="glass-panel rounded-xl p-6 border border-white/40 dark:border-white/10 hover:bg-surface-container-lowest/90 transition-all duration-300 transform hover:-translate-y-1 md:-translate-y-4">
            <div className="w-12 h-12 rounded-full bg-primary-container/10 flex items-center justify-center mb-4 text-primary">
              <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>menu_book</span>
            </div>
            <h3 className="text-xl font-bold font-headline text-on-surface mb-2">Smart Lesson Plans</h3>
            <p className="text-on-surface-variant font-body text-sm leading-relaxed">
              Generate comprehensive, culturally relevant lesson outlines in seconds, not hours.
            </p>
          </div>
          {/* Card 3 */}
          <div className="glass-panel rounded-xl p-6 border border-white/40 dark:border-white/10 hover:bg-surface-container-lowest/90 transition-all duration-300 transform hover:-translate-y-1">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
              <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>schedule</span>
            </div>
            <h3 className="text-xl font-bold font-headline text-on-surface mb-2">Total Time Freedom</h3>
            <p className="text-on-surface-variant font-body text-sm leading-relaxed">
              Reclaim your evenings and weekends. Let AI handle the administrative heavy lifting.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-50 dark:bg-slate-950 w-full py-12 px-8 bg-surface-container-low relative z-10 border-t border-outline-variant/10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 max-w-7xl mx-auto font-body text-sm tracking-wide">
          <div className="flex items-center gap-2 mb-4 md:mb-0 relative">
            <div className="absolute inset-[-2px] bg-white/60 dark:bg-white/80 rounded-[2rem] blur-sm z-0 pointer-events-none"></div>
            <Image
              src="/logo.png"
              alt="Clarified Educator"
              width={90}
              height={30}
              className="max-w-[90px] object-contain relative z-10"
              style={{ width: "auto", height: "auto" }}
              priority={false}
            />
          </div>
          <p className="text-slate-500 dark:text-slate-500 text-center md:text-left">
            © 2024 The Clarified Educator. Elevating Jamaican Pedagogy through Intelligence.
          </p>
          <div className="flex gap-6 flex-wrap justify-center">
            <Link className="text-slate-500 dark:text-slate-500 hover:text-sky-500 transition-colors bg-white/0" href="#">Privacy Policy</Link>
            <Link className="text-slate-500 dark:text-slate-500 hover:text-sky-500 transition-colors" href="#">Terms of Service</Link>
            <Link className="text-slate-500 dark:text-slate-500 hover:text-sky-500 transition-colors" href="#">Contact Support</Link>
            <Link className="text-slate-500 dark:text-slate-500 hover:text-sky-500 transition-colors" href="#">Careers</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}