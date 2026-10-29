import { animate, motion, useInView } from "framer-motion";
import { Code2, Palette, Clapperboard, Quote } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BRAND } from "../data";
import { Reveal, SectionHeading } from "./ui";

function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const c = animate(0, to, { duration: 1.8, ease: "easeOut", onUpdate: (v) => setVal(Math.round(v)) });
    return () => c.stop();
  }, [inView, to]);
  return (
    <span ref={ref}>
      {val}
      {suffix}
    </span>
  );
}

const PILLARS = [
  {
    icon: Code2,
    title: "Vibe Coder",
    text: "Turning ideas into live, AI-powered websites at lightning speed with a modern vibe-coding workflow.",
    color: "from-violet-500 to-indigo-500",
  },
  {
    icon: Palette,
    title: "Designer",
    text: "Crafting bold visuals, clean interfaces and brand graphics that make people stop scrolling.",
    color: "from-pink-500 to-rose-500",
  },
  {
    icon: Clapperboard,
    title: "Creator",
    text: "Producing digital content and managing YouTube channels that connect with real audiences.",
    color: "from-cyan-500 to-sky-500",
  },
];

const SKILLS = [
  { name: "AI-Powered Web Development", level: 95 },
  { name: "UI / UX & Graphic Design", level: 90 },
  { name: "Creative Automation", level: 88 },
  { name: "Content Creation", level: 85 },
];

export default function About() {
  return (
    <section id="about" className="relative py-28 sm:py-36">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHeading
          eyebrow="About Me"
          title="The mind behind"
          highlight="the pixels"
          sub="Vibe Coder • Designer • Creator — blending AI, code and creativity into digital experiences that feel alive."
        />

        <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
          {/* Bio card */}
          <Reveal>
            <div className="gradient-border relative h-full overflow-hidden rounded-3xl bg-white/[0.03] p-8 sm:p-10">
              <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-violet-600/20 blur-3xl" />
              <Quote className="h-10 w-10 text-violet-400/60" />
              <p className="mt-5 font-display text-2xl font-medium leading-relaxed text-white sm:text-[1.65rem]">
                {BRAND.bio.split("Professional Vibe Coder").map((part, i, arr) => (
                  <span key={i}>
                    {part}
                    {i < arr.length - 1 && <span className="text-gradient font-bold">Professional Vibe Coder</span>}
                  </span>
                ))}
              </p>
              <div className="mt-8 flex items-center gap-4">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 font-display text-xl font-black text-white">
                  SR
                </div>
                <div>
                  <p className="font-display font-semibold text-white">{BRAND.owner}</p>
                  <p className="text-sm text-white/50">Founder, {BRAND.name}</p>
                </div>
              </div>

              <div className="mt-10 grid grid-cols-3 gap-4 border-t border-white/10 pt-8">
                {[
                  { n: 2, s: "+", l: "Live Projects" },
                  { n: 3, s: "", l: "YouTube Channels" },
                  { n: 100, s: "%", l: "Passion" },
                ].map((st) => (
                  <div key={st.l}>
                    <p className="font-display text-3xl font-bold text-white sm:text-4xl">
                      <Counter to={st.n} suffix={st.s} />
                    </p>
                    <p className="mt-1 text-xs text-white/50 sm:text-sm">{st.l}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          <div className="flex flex-col gap-5">
            {PILLARS.map((p, i) => (
              <Reveal key={p.title} delay={i * 0.12}>
                <motion.div
                  whileHover={{ x: 8 }}
                  className="group flex gap-5 rounded-2xl glass p-6 transition-colors hover:bg-white/[0.06]"
                >
                  <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${p.color} shadow-lg transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110`}>
                    <p.icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-semibold text-white">{p.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-white/60">{p.text}</p>
                  </div>
                </motion.div>
              </Reveal>
            ))}

            <Reveal delay={0.3}>
              <div className="rounded-2xl glass p-6">
                <h3 className="mb-5 font-display text-lg font-semibold text-white">Core Expertise</h3>
                <div className="space-y-4">
                  {SKILLS.map((s, i) => (
                    <div key={s.name}>
                      <div className="mb-2 flex justify-between text-sm">
                        <span className="text-white/80">{s.name}</span>
                        <span className="text-white/50">{s.level}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${s.level}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 1.4, delay: 0.2 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                          className="h-full rounded-full bg-gradient-to-r from-violet-500 via-pink-500 to-cyan-400"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
