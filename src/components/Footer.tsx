import { motion } from "framer-motion";
import { ArrowUp, Heart, Mail } from "lucide-react";
import { BRAND, CHANNELS, PROJECTS } from "../data";
import { GithubIcon, InstagramIcon, WhatsappIcon, YoutubeIcon } from "./BrandIcons";

export default function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-white/10 pt-20">
      <div className="mx-auto max-w-6xl px-5">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 font-display text-sm font-black text-white">RG</span>
              <span className="font-display text-lg font-bold text-white">{BRAND.name}</span>
            </div>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/50">
              AI-powered web development, creative automation & modern digital experiences by {BRAND.owner}.
            </p>
            <div className="mt-6 flex gap-2">
              {[
                { h: BRAND.github, i: <GithubIcon className="h-4 w-4" />, l: "GitHub" },
                { h: BRAND.instagram, i: <InstagramIcon className="h-4 w-4" />, l: "Instagram" },
                { h: BRAND.whatsapp, i: <WhatsappIcon className="h-4 w-4" />, l: "WhatsApp" },
                { h: `mailto:${BRAND.email}`, i: <Mail className="h-4 w-4" />, l: "Email" },
              ].map((s) => (
                <a key={s.l} href={s.h} target="_blank" rel="noreferrer" aria-label={s.l} className="grid h-10 w-10 place-items-center rounded-full glass text-white/60 transition hover:-translate-y-1 hover:text-white">
                  {s.i}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-display font-semibold text-white">Navigate</h4>
            <ul className="mt-4 space-y-2.5 text-sm text-white/50">
              {["About", "Services", "Projects", "Channels", "Contact"].map((l) => (
                <li key={l}>
                  <a href={`#${l.toLowerCase()}`} className="transition hover:text-white">{l}</a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold text-white">Projects</h4>
            <ul className="mt-4 space-y-2.5 text-sm text-white/50">
              {PROJECTS.map((p) => (
                <li key={p.url}>
                  <a href={p.url} target="_blank" rel="noreferrer" className="break-all transition hover:text-white">{p.domain}</a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold text-white">YouTube</h4>
            <ul className="mt-4 space-y-2.5 text-sm text-white/50">
              {CHANNELS.map((c) => (
                <li key={c.handle}>
                  <a href={c.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 transition hover:text-white">
                    <YoutubeIcon className="h-3.5 w-3.5 text-red-500" /> {c.handle}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <motion.h2
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="mt-20 select-none text-center font-display text-[13vw] font-bold leading-none tracking-tighter text-transparent md:text-[9rem]"
          style={{ WebkitTextStroke: "1px rgba(255,255,255,0.12)" }}
        >
          RYAN GRAPHIX
        </motion.h2>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-white/10 py-8 text-sm text-white/40 sm:flex-row">
          <p>© {new Date().getFullYear()} {BRAND.name}. All rights reserved.</p>
          <p className="flex items-center gap-1.5">
            Crafted with <Heart className="h-4 w-4 fill-pink-500 text-pink-500" /> by {BRAND.ownerShort}
          </p>
          <a href="#home" className="flex items-center gap-2 rounded-full glass px-4 py-2 text-white/70 transition hover:text-white">
            Back to top <ArrowUp className="h-4 w-4" />
          </a>
        </div>
      </div>
    </footer>
  );
}
