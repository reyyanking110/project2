import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, ArrowDown, Sparkles, Mail } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BRAND } from "../data";
import { GithubIcon, InstagramIcon, WhatsappIcon } from "./BrandIcons";
import { Magnetic } from "./ui";

const TYPED = ["AI-Powered Websites", "Creative Automation", "Modern Digital Experiences", "Stunning Graphic Designs"];

function useTypewriter(words: string[]) {
  const [text, setText] = useState("");
  const [i, setI] = useState(0);
  const [del, setDel] = useState(false);

  useEffect(() => {
    const word = words[i % words.length];
    const t = setTimeout(
      () => {
        if (!del) {
          setText(word.slice(0, text.length + 1));
          if (text.length + 1 === word.length) setTimeout(() => setDel(true), 1400);
        } else {
          setText(word.slice(0, text.length - 1));
          if (text.length - 1 === 0) {
            setDel(false);
            setI((n) => n + 1);
          }
        }
      },
      del ? 35 : 70
    );
    return () => clearTimeout(t);
  }, [text, del, i, words]);

  return text;
}

const letter = {
  hidden: { y: "110%" },
  show: (i: number) => ({ y: 0, transition: { delay: 0.15 + i * 0.03, duration: 0.8, ease: [0.22, 1, 0.36, 1] as const } }),
};

function SplitWord({ word, offset = 0, className = "" }: { word: string; offset?: number; className?: string }) {
  return (
    <span className={`inline-flex overflow-hidden pb-2 ${className}`}>
      {word.split("").map((c, i) => (
        <motion.span key={i} custom={i + offset} variants={letter} initial="hidden" animate="show" className="inline-block">
          {c === " " ? "\u00A0" : c}
        </motion.span>
      ))}
    </span>
  );
}

export default function Hero() {
  const typed = useTypewriter(TYPED);
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section id="home" ref={ref} className="relative flex min-h-screen items-center overflow-hidden pt-28 pb-16">
      {/* Background */}
      <div className="absolute inset-0 grid-bg" />
      <motion.div
        className="absolute -left-40 top-20 h-[500px] w-[500px] rounded-full bg-violet-600/30 blur-[120px]"
        animate={{ x: [0, 80, 0], y: [0, 40, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-40 bottom-0 h-[500px] w-[500px] rounded-full bg-cyan-500/20 blur-[120px]"
        animate={{ x: [0, -60, 0], y: [0, -50, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute left-1/2 top-1/3 h-[300px] w-[300px] rounded-full bg-pink-500/15 blur-[100px]"
        animate={{ scale: [1, 1.3, 1] }}
        transition={{ duration: 10, repeat: Infinity }}
      />

      <motion.div style={{ y, opacity }} className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-14 px-5 lg:grid-cols-[1.25fr_1fr]">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full glass px-4 py-2 text-sm text-white/80"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            Available for new projects
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-3 font-display text-lg text-violet-300"
          >
            Assalam-u-Alaikum! I'm {BRAND.ownerShort} 👋
          </motion.p>

          <h1 className="font-display text-5xl font-bold leading-[1.02] tracking-tight text-white sm:text-6xl md:text-7xl lg:text-[5.2rem]">
            <SplitWord word="Ryan" />{" "}
            <SplitWord word="Graphix" offset={4} className="text-gradient" />
            <br />
            <SplitWord word="Designz" offset={11} />
            <motion.span
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.9, type: "spring" }}
              className="ml-3 inline-block align-middle"
            >
              <Sparkles className="h-10 w-10 text-pink-400 sm:h-14 sm:w-14" />
            </motion.span>
          </h1>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-6 flex flex-wrap items-center gap-3"
          >
            {BRAND.roles.map((r, i) => (
              <span key={r} className="flex items-center gap-3 font-display text-lg font-medium text-white/80 sm:text-xl">
                {r}
                {i < BRAND.roles.length - 1 && <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-violet-400 to-cyan-400" />}
              </span>
            ))}
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.95 }}
            className="mt-5 max-w-xl text-lg text-white/60"
          >
            I build{" "}
            <span className="font-semibold text-white">
              {typed}
              <span className="caret ml-0.5 text-cyan-400">|</span>
            </span>
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1 }}
            className="mt-9 flex flex-wrap items-center gap-4"
          >
            <Magnetic>
              <a
                href="#projects"
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-500 px-7 py-4 font-semibold text-white shadow-xl shadow-violet-600/30"
              >
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                View My Work
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
            </Magnetic>
            <Magnetic>
              <a
                href={BRAND.whatsapp}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full glass px-7 py-4 font-semibold text-white transition-colors hover:bg-white/10"
              >
                <WhatsappIcon className="h-5 w-5 text-emerald-400" />
                Let's Talk
              </a>
            </Magnetic>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.3 }}
            className="mt-10 flex items-center gap-3"
          >
            {[
              { href: BRAND.github, icon: <GithubIcon />, label: "GitHub" },
              { href: BRAND.instagram, icon: <InstagramIcon />, label: "Instagram" },
              { href: `mailto:${BRAND.email}`, icon: <Mail className="h-5 w-5" />, label: "Email" },
            ].map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noreferrer"
                aria-label={s.label}
                className="grid h-11 w-11 place-items-center rounded-full glass text-white/70 transition-all hover:-translate-y-1 hover:text-white hover:shadow-lg hover:shadow-violet-500/30"
              >
                {s.icon}
              </a>
            ))}
            <span className="ml-2 h-px w-16 bg-gradient-to-r from-white/30 to-transparent" />
          </motion.div>
        </div>

        {/* Visual card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85, rotate: 6 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ delay: 0.6, duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto w-full max-w-md"
        >
          <div className="absolute -inset-6 rounded-[2.5rem] border border-dashed border-white/10 animate-spin-slow" />
          <div className="gradient-border animate-float relative rounded-3xl bg-[#0e0c1a]/90 p-6 shadow-2xl shadow-violet-900/40 backdrop-blur-xl">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex gap-1.5">
                <span className="h-3 w-3 rounded-full bg-red-400/80" />
                <span className="h-3 w-3 rounded-full bg-yellow-400/80" />
                <span className="h-3 w-3 rounded-full bg-green-400/80" />
              </div>
              <span className="font-mono text-xs text-white/40">reyyan.tsx</span>
            </div>
            <pre className="overflow-hidden font-mono text-[13px] leading-7 text-white/80">
              <code>
                <span className="text-pink-400">const</span> <span className="text-cyan-300">reyyan</span> = {"{"}
                {"\n"}  name: <span className="text-emerald-300">"Syed Reyyan Abbas Rizvi"</span>,
                {"\n"}  brand: <span className="text-emerald-300">"Ryan Graphix Designz"</span>,
                {"\n"}  role: [<span className="text-amber-300">"Vibe Coder"</span>, <span className="text-amber-300">"Designer"</span>,
                {"\n"}         <span className="text-amber-300">"Creator"</span>],
                {"\n"}  powers: <span className="text-violet-300">AI</span> + <span className="text-violet-300">Creativity</span>,
                {"\n"}  status: <span className="text-emerald-300">"Ready to build 🚀"</span>
                {"\n"}{"}"};
              </code>
            </pre>
          </div>

          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute -left-6 -bottom-6 rounded-2xl glass bg-[#0e0c1a]/80 px-4 py-3 shadow-xl"
          >
            <p className="text-xs text-white/50">Specialty</p>
            <p className="font-display font-bold text-white">AI-Powered Web ⚡</p>
          </motion.div>
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 5, repeat: Infinity }}
            className="absolute -right-4 -top-6 rounded-2xl glass bg-[#0e0c1a]/80 px-4 py-3 shadow-xl"
          >
            <p className="text-xs text-white/50">Based in</p>
            <p className="font-display font-bold text-white">Pakistan 🇵🇰</p>
          </motion.div>
        </motion.div>
      </motion.div>

      <motion.a
        href="#about"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6 }}
        className="absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/40 md:flex"
      >
        Scroll
        <motion.span animate={{ y: [0, 8, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
          <ArrowDown className="h-4 w-4" />
        </motion.span>
      </motion.a>
    </section>
  );
}
