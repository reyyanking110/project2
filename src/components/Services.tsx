import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Bot, Globe, PenTool, Workflow, Smartphone, ArrowUpRight } from "lucide-react";
import { YoutubeIcon } from "./BrandIcons";
import type { MouseEvent } from "react";
import { BRAND } from "../data";
import { Reveal, SectionHeading } from "./ui";

const SERVICES = [
  {
    icon: Globe,
    title: "AI-Powered Web Development",
    text: "Fast, modern and responsive websites built with AI-driven vibe coding — from landing pages to full web apps.",
    color: "#a855f7",
  },
  {
    icon: PenTool,
    title: "Graphic Design",
    text: "Logos, social media posts, thumbnails, banners and brand identities that look premium and professional.",
    color: "#ec4899",
  },
  {
    icon: Workflow,
    title: "Creative Automation",
    text: "Smart AI workflows that automate repetitive tasks, content pipelines and save you hours every week.",
    color: "#22d3ee",
  },
  {
    icon: Bot,
    title: "AI Integrations",
    text: "Chatbots, AI tools and smart features plugged right into your website or business workflow.",
    color: "#f59e0b",
  },
  {
    icon: Smartphone,
    title: "UI / UX Design",
    text: "Pixel-perfect, user-friendly interfaces with smooth animations that work beautifully on every device.",
    color: "#10b981",
  },
  {
    icon: YoutubeIcon as unknown as typeof Globe,
    title: "Content & YouTube",
    text: "Channel branding, eye-catching thumbnails and creative content strategy for creators.",
    color: "#ef4444",
  },
];

function TiltCard({ s, i }: { s: (typeof SERVICES)[number]; i: number }) {
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rx = useSpring(useTransform(my, [0, 1], [8, -8]), { stiffness: 200, damping: 20 });
  const ry = useSpring(useTransform(mx, [0, 1], [-8, 8]), { stiffness: 200, damping: 20 });
  const bg = useTransform(
    [mx, my] as never,
    ([x, y]: number[]) => `radial-gradient(400px circle at ${x * 100}% ${y * 100}%, ${s.color}22, transparent 60%)`
  );

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width);
    my.set((e.clientY - r.top) / r.height);
  };

  return (
    <Reveal delay={(i % 3) * 0.1}>
      <motion.div
        onMouseMove={onMove}
        onMouseLeave={() => {
          mx.set(0.5);
          my.set(0.5);
        }}
        style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
        className="group relative h-full overflow-hidden rounded-3xl glass p-8"
      >
        <motion.div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: bg }} />
        <div
          className="relative grid h-14 w-14 place-items-center rounded-2xl transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6"
          style={{ background: `${s.color}1f`, boxShadow: `0 0 40px ${s.color}33` }}
        >
          <s.icon className="h-6 w-6" style={{ color: s.color }} />
        </div>
        <h3 className="relative mt-6 font-display text-xl font-semibold text-white">{s.title}</h3>
        <p className="relative mt-3 text-sm leading-relaxed text-white/60">{s.text}</p>
        <a
          href={BRAND.whatsapp}
          target="_blank"
          rel="noreferrer"
          className="relative mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-white/70 transition-colors hover:text-white"
        >
          Get a quote
          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </a>
        <span className="absolute right-6 top-6 font-display text-5xl font-bold text-white/[0.04]">0{i + 1}</span>
      </motion.div>
    </Reveal>
  );
}

export default function Services() {
  return (
    <section id="services" className="relative py-28 sm:py-36">
      <div className="absolute inset-x-0 top-1/3 mx-auto h-96 max-w-3xl rounded-full bg-fuchsia-600/10 blur-[120px]" />
      <div className="relative mx-auto max-w-6xl px-5">
        <SectionHeading
          eyebrow="Services"
          title="What I can"
          highlight="do for you"
          sub="From pixel-perfect designs to AI-powered websites and smart automation — everything your brand needs to shine online."
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s, i) => (
            <TiltCard key={s.title} s={s} i={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
