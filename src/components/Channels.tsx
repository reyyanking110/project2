import { motion } from "framer-motion";
import { ArrowUpRight, Play } from "lucide-react";
import { CHANNELS } from "../data";
import { YoutubeIcon } from "./BrandIcons";
import { Reveal, SectionHeading } from "./ui";

export default function Channels() {
  return (
    <section id="channels" className="relative py-28 sm:py-36">
      <div className="absolute left-0 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-red-600/10 blur-[120px]" />
      <div className="relative mx-auto max-w-6xl px-5">
        <SectionHeading
          eyebrow="Creator Side"
          title="YouTube"
          highlight="channels"
          sub="Beyond code & design — content I create and manage. Subscribe and join the journey!"
        />

        <div className="grid gap-6 md:grid-cols-3">
          {CHANNELS.map((c, i) => (
            <Reveal key={c.handle} delay={i * 0.12}>
              <motion.a
                href={c.url}
                target="_blank"
                rel="noreferrer"
                whileHover={{ y: -10 }}
                transition={{ type: "spring", stiffness: 250, damping: 18 }}
                className="group relative block h-full overflow-hidden rounded-3xl glass"
              >
                <div className={`relative grid aspect-video place-items-center overflow-hidden bg-gradient-to-br ${c.color}`}>
                  <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:18px_18px]" />
                  <motion.div
                    className="relative grid h-16 w-16 place-items-center rounded-full bg-white/95 shadow-2xl"
                    whileHover={{ scale: 1.15 }}
                  >
                    <span className="absolute inset-0 animate-ping rounded-full bg-white/40" />
                    <Play className="relative ml-1 h-7 w-7 fill-red-600 text-red-600" />
                  </motion.div>
                  <span className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-md bg-black/50 px-2 py-1 text-xs font-medium text-white backdrop-blur">
                    <YoutubeIcon className="h-3.5 w-3.5 text-red-500" /> YouTube
                  </span>
                </div>
                <div className="p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-xl font-semibold text-white">{c.name}</h3>
                      <p className="mt-0.5 text-sm text-white/50">{c.handle}</p>
                    </div>
                    <ArrowUpRight className="h-5 w-5 text-white/40 transition-all group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-white" />
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-white/60">{c.desc}</p>
                  <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors group-hover:bg-red-500">
                    <YoutubeIcon className="h-4 w-4" /> Subscribe
                  </span>
                </div>
              </motion.a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
