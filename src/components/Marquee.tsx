import { Sparkle } from "lucide-react";

const ITEMS = [
  "Vibe Coding",
  "AI-Powered Web Development",
  "Graphic Design",
  "Creative Automation",
  "UI / UX",
  "Brand Identity",
  "Content Creation",
  "Modern Digital Experiences",
];

export default function Marquee() {
  return (
    <div className="relative z-10 -rotate-1 border-y border-white/10 bg-gradient-to-r from-violet-600/20 via-fuchsia-600/20 to-cyan-500/20 py-5 backdrop-blur">
      <div className="flex overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]">
        <div className="animate-marquee flex shrink-0 items-center gap-10 whitespace-nowrap pr-10">
          {[...ITEMS, ...ITEMS].map((t, i) => (
            <span key={i} className="flex items-center gap-10 font-display text-2xl font-semibold text-white/90 sm:text-3xl">
              {t}
              <Sparkle className="h-6 w-6 text-pink-400" />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
