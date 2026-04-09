import Image from "next/image";
import Link from "next/link";
import { Clock, Zap, CheckCircle, PlayCircle, BookOpen } from "lucide-react";
import LoginButton from "@/components/LoginButton";

export default function Home() {
  return (
    <main className="relative isolate min-h-[100dvh] min-h-screen w-full overflow-x-hidden bg-soft-teal px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:pb-8 sm:pt-6">
      {/* Decorative blobs — behind all content */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute top-[10%] left-[-10%] h-96 w-96 rounded-full bg-sky-blue/15 blur-3xl" />
        <div className="absolute bottom-[10%] right-[-10%] h-96 w-96 rounded-full bg-dark-teal/10 blur-3xl" />
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-col">
        {/* Header: in document flow so it never stacks over the hero */}
        <header className="flex w-full shrink-0 flex-row flex-wrap items-center justify-between gap-3 sm:gap-4">
          <Image
            src="/logo.png"
            alt="Jesspert Logo - AI Assistant for Jamaican Teachers"
            width={180}
            height={60}
            className="max-w-[min(40vw,140px)] object-contain sm:max-w-[180px]"
            style={{ width: "auto", height: "auto" }}
            priority
          />
          <div className="flex min-w-0 flex-1 justify-end sm:flex-initial">
            <LoginButton />
          </div>
        </header>

        <section
          className="mx-auto w-full max-w-4xl space-y-6 pt-8 text-center sm:space-y-8 sm:pt-10 md:pt-12"
          aria-labelledby="hero-heading"
        >
        {/* Top Badge */}
        <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-white/70 text-dark-teal font-medium text-xs sm:text-sm shadow-sm border border-dark-teal/10 leading-snug backdrop-blur-sm">
          <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-blue flex-shrink-0" aria-hidden="true" />
          <span>Built for Jamaica's Basic, Primary & Secondary Teachers</span>
        </div>

        {/* Headline */}
        <h1 id="hero-heading" className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-navy tracking-tight drop-shadow-sm px-1 sm:px-0 leading-[1.12] text-balance">
          Get Back More Than 8 Hours a Week.<br className="hidden sm:block" />
          <span className="text-sky-blue inline-block mt-2">Meet Your AI Teaching Assistant.</span>
        </h1>

        {/* Subheadline */}
        <p className="text-base sm:text-lg md:text-xl text-navy/80 max-w-2xl mx-auto leading-relaxed px-2 sm:px-0">
          Stop sacrificing your evenings to unpaid marking and weekend lesson planning. From PEP to CSEC, Jesspert handles the heavy lifting—<strong className="font-semibold px-2 py-0.5 sm:py-1 bg-white/70 rounded-md text-dark-teal shadow-sm inline-block mt-2 sm:mt-0">giving you your free time back.</strong>
        </p>

        {/* Call to Actions */}
        <nav className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 pt-6 sm:pt-8 w-full px-4 sm:px-0" aria-label="Main call to action">
          <Link
            href="/dashboard"
            className="touch-manipulation min-h-[44px] w-full sm:w-auto px-6 py-3.5 sm:px-8 sm:py-4 rounded-xl bg-sky-blue text-white font-bold text-base sm:text-lg hover:bg-sky-blue/90 shadow-xl shadow-sky-blue/20 transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2 group"
            aria-label="Open the teacher dashboard"
          >
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-rotate-12 transition-transform" aria-hidden="true" />
            Get Your Weekends Back
          </Link>

          <button
            type="button"
            className="touch-manipulation min-h-[44px] w-full sm:w-auto px-6 py-3.5 sm:px-8 sm:py-4 rounded-xl border-2 border-dark-teal/30 text-dark-teal bg-transparent font-bold text-base sm:text-lg hover:bg-dark-teal/5 transition-all active:scale-95 flex items-center justify-center gap-2"
            aria-label="Watch how Jesspert works"
          >
            <PlayCircle className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
            See How It Works
          </button>
        </nav>

        {/* Value Proposition Cards - Updated for broader appeal */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 pt-12 sm:pt-16">
          {[
            { icon: <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-sky-blue" aria-hidden="true" />, title: "Instant Grading", desc: "Snap a photo of handwritten work and let AI grade it against your rubrics." },
            { icon: <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-sky-blue" aria-hidden="true" />, title: "Smart Lesson Plans", desc: "Generate engaging, curriculum-aligned lesson plans for any grade level instantly." },
            { icon: <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-sky-blue" aria-hidden="true" />, title: "Total Time Freedom", desc: "Automate tracking, reporting, and admin work so you can leave school at school." }
          ].map((feature, i) => (
            <article key={i} className="bg-white/90 backdrop-blur-sm p-5 sm:p-6 rounded-2xl shadow-sm border border-navy/5 text-left flex flex-col gap-2 sm:gap-3 hover:shadow-md hover:-translate-y-1 transition-all">
              {feature.icon}
              <h3 className="font-bold text-navy text-lg sm:text-xl">{feature.title}</h3>
              <p className="text-sm sm:text-base text-navy/70 leading-snug">{feature.desc}</p>
            </article>
          ))}
        </div>
        </section>
      </div>
    </main>
  );
}