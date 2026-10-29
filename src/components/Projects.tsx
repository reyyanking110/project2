import { motion } from "framer-motion";
import { ArrowUpRight, ExternalLink, Lock } from "lucide-react";
import { PROJECTS, BRAND } from "../data";
import { GithubIcon } from "./BrandIcons";
import { Reveal, SectionHeading } from "./ui";

function BrowserPreview({ url, domain, gradient }: { url: string; domain: string; gradient: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b0a14] shadow-2xl">
      <div className="flex items-center gap-3 border-b border-white/10 bg-white/[0.03] px-4 py-3">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-400/80" />
        </div>
        <div className="flex flex-1 items-center gap-2 truncate rounded-md bg-white/5 px-3 py-1 font-mono text-[11px] text-white/50">
          <Lock className="h-3 w-3 shrink-0 text-emerald-400" />
          {domain}
        </div>
      </div>
      <div className={`relative aspect-[16/10] overflow-hidden bg-gradient-to-br ${gradient}`}>
        <div className="absolute inset-0 grid place-items-center">
          <span className="font-display text-2xl font-bold text-white/80">{domain.split(".")[0]}</span>
        </div>
        <iframe
          src={url}
          title={domain}
          loading="lazy"
          tabIndex={-1}
          className="pointer-events-none absolute left-0 top-0 h-[250%] w-[250%] origin-top-left scale-[0.4] border-0 bg-transparent transition-transform duration-[1.5s]"
        />
      </div>
    </div>
  );
}

export default function Projects() {
  return (
    <section id="projects" className="relative py-28 sm:py-36">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHeading
          eyebrow="My Projects"
          title="Featured"
          highlight="work"
          sub="Live projects crafted and deployed by me — click through and experience them yourself."
        />

        <div className="space-y-20">
          {PROJECTS.map((p, i) => (
            <div key={p.url} className={`grid items-center gap-10 lg:grid-cols-2 ${i % 2 ? "lg:[&>*:first-child]:order-2" : ""}`}>
              <Reveal y={50}>
                <motion.a
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  whileHover={{ y: -8, rotate: i % 2 ? 1 : -1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 18 }}
                  className="group relative block"
                >
                  <div className={`absolute -inset-4 rounded-3xl bg-gradient-to-r ${p.gradient} opacity-20 blur-2xl transition-opacity duration-500 group-hover:opacity-40`} />
                  <div className="relative">
                    <BrowserPreview url={p.url} domain={p.domain} gradient={p.gradient} />
                    <div className="absolute inset-0 top-10 grid place-items-center rounded-b-2xl bg-black/0 opacity-0 transition-all duration-500 group-hover:bg-black/50 group-hover:opacity-100">
                      <span className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black">
                        Visit Live Site <ExternalLink className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                </motion.a>
              </Reveal>

              <Reveal delay={0.15}>
                <span className="font-display text-sm font-medium text-violet-300">Project 0{i + 1}</span>
                <h3 className="mt-3 font-display text-3xl font-bold text-white sm:text-4xl">{p.title}</h3>
                <p className="mt-5 leading-relaxed text-white/60">{p.desc}</p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {p.tags.map((t) => (
                    <span key={t} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                      {t}
                    </span>
                  ))}
                </div>
                <div className="mt-8 flex flex-wrap gap-3">
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noreferrer"
                    className={`group inline-flex items-center gap-2 rounded-full bg-gradient-to-r ${p.gradient} px-6 py-3 text-sm font-semibold text-white shadow-lg`}
                  >
                    Live Demo
                    <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </a>
                  <a
                    href={BRAND.github}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full glass px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
                  >
                    <GithubIcon className="h-4 w-4" /> GitHub
                  </a>
                </div>
              </Reveal>
            </div>
          ))}
        </div>

        <Reveal delay={0.1}>
          <div className="mt-24 flex flex-col items-center justify-between gap-6 rounded-3xl glass p-8 text-center sm:flex-row sm:text-left">
            <div className="flex items-center gap-4">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-black">
                <GithubIcon className="h-7 w-7" />
              </div>
              <div>
                <p className="font-display text-xl font-semibold text-white">More on GitHub</p>
                <p className="text-sm text-white/50">github.com/{BRAND.githubHandle}</p>
              </div>
            </div>
            <a
              href={BRAND.github}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition-transform hover:scale-105"
            >
              Explore Repositories <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
