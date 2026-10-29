import { motion, useScroll } from "framer-motion";
import { useRef } from "react";
import { Lightbulb, Wand2, Rocket, MessagesSquare } from "lucide-react";
import { Reveal, SectionHeading } from "./ui";

const STEPS = [
  { icon: MessagesSquare, title: "Discuss", text: "We talk on WhatsApp about your idea, goals and vision." },
  { icon: Lightbulb, title: "Design", text: "I craft the look & feel — visuals, layout and brand style." },
  { icon: Wand2, title: "Vibe Code", text: "AI-powered development brings the design to life, fast." },
  { icon: Rocket, title: "Launch", text: "Deployed live, optimized and ready to impress the world." },
];

export default function Process() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 80%", "end 60%"] });

  return (
    <section className="relative py-28 sm:py-32">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHeading eyebrow="Process" title="How we" highlight="work together" />
        <div ref={ref} className="relative grid gap-8 md:grid-cols-4">
          <div className="absolute left-0 right-0 top-8 hidden h-px bg-white/10 md:block">
            <motion.div style={{ scaleX: scrollYProgress }} className="h-full origin-left bg-gradient-to-r from-violet-500 via-pink-500 to-cyan-400" />
          </div>
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.12}>
              <div className="relative text-center">
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 8 }}
                  className="relative mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-white/10 bg-[#100e1d] shadow-lg shadow-violet-900/30"
                >
                  <s.icon className="h-7 w-7 text-violet-300" />
                  <span className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-pink-500 to-violet-600 text-[11px] font-bold text-white">
                    {i + 1}
                  </span>
                </motion.div>
                <h3 className="mt-6 font-display text-xl font-semibold text-white">{s.title}</h3>
                <p className="mx-auto mt-2 max-w-[220px] text-sm text-white/55">{s.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
