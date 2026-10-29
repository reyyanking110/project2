import { AnimatePresence, motion } from "framer-motion";
import { Mail, Send, Copy, Check } from "lucide-react";
import { useState, type FormEvent } from "react";
import { BRAND } from "../data";
import { GithubIcon, InstagramIcon, WhatsappIcon } from "./BrandIcons";
import { Reveal, SectionHeading } from "./ui";

const SERVICES = ["Website", "Graphic Design", "Automation", "AI Integration", "Other"];

export default function Contact() {
  const [name, setName] = useState("");
  const [service, setService] = useState("Website");
  const [msg, setMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);

  const text = `Assalam-u-Alaikum Reyyan! 👋\n\nName: ${name}\nService: ${service}\n\n${msg}`;

  const sendWhatsapp = (e: FormEvent) => {
    e.preventDefault();
    window.open(`${BRAND.whatsapp}?text=${encodeURIComponent(text)}`, "_blank");
    setSent(true);
    setTimeout(() => setSent(false), 3000);
  };

  const sendEmail = () => {
    window.location.href = `mailto:${BRAND.email}?subject=${encodeURIComponent(`${service} inquiry from ${name || "your website"}`)}&body=${encodeURIComponent(text)}`;
  };

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(BRAND.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const CHANNELS = [
    { icon: <WhatsappIcon className="h-6 w-6" />, label: "WhatsApp", value: BRAND.phone, href: BRAND.whatsapp, color: "from-emerald-500 to-green-600" },
    { icon: <Mail className="h-6 w-6" />, label: "Email", value: BRAND.email, href: `mailto:${BRAND.email}`, color: "from-violet-500 to-indigo-600" },
    { icon: <InstagramIcon className="h-6 w-6" />, label: "Instagram", value: `@${BRAND.instagramHandle}`, href: BRAND.instagram, color: "from-pink-500 via-rose-500 to-amber-500" },
    { icon: <GithubIcon className="h-6 w-6" />, label: "GitHub", value: BRAND.githubHandle, href: BRAND.github, color: "from-zinc-600 to-zinc-800" },
  ];

  return (
    <section id="contact" className="relative py-28 sm:py-36">
      <div className="absolute inset-x-0 bottom-0 mx-auto h-96 max-w-4xl rounded-full bg-violet-600/15 blur-[140px]" />
      <div className="relative mx-auto max-w-6xl px-5">
        <SectionHeading
          eyebrow="Contact"
          title="Let's build something"
          highlight="amazing"
          sub="Have an idea, a project or just want to say Salam? Drop a message — I usually reply quickly on WhatsApp."
        />

        <div className="grid gap-8 lg:grid-cols-[1fr_1.15fr]">
          <div className="space-y-4">
            {CHANNELS.map((c, i) => (
              <Reveal key={c.label} delay={i * 0.08}>
                <motion.a
                  href={c.href}
                  target="_blank"
                  rel="noreferrer"
                  whileHover={{ x: 6 }}
                  className="group flex items-center gap-4 rounded-2xl glass p-5 transition-colors hover:bg-white/[0.06]"
                >
                  <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${c.color} text-white shadow-lg transition-transform group-hover:scale-110`}>
                    {c.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-white/50">{c.label}</p>
                    <p className="truncate font-medium text-white">{c.value}</p>
                  </div>
                </motion.a>
              </Reveal>
            ))}
            <Reveal delay={0.35}>
              <button
                onClick={copyEmail}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 p-4 text-sm text-white/60 transition-colors hover:border-white/30 hover:text-white"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                {copied ? "Email copied!" : "Copy email address"}
              </button>
            </Reveal>
          </div>

          <Reveal delay={0.1}>
            <form onSubmit={sendWhatsapp} className="gradient-border relative rounded-3xl bg-white/[0.03] p-7 sm:p-9">
              <h3 className="font-display text-2xl font-semibold text-white">Start a project</h3>
              <p className="mt-1 text-sm text-white/50">Fill this in & send directly via WhatsApp or Email.</p>

              <label className="mt-7 block text-sm text-white/70">Your Name</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ali Khan"
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-white outline-none transition placeholder:text-white/30 focus:border-violet-400 focus:bg-white/[0.07] focus:ring-4 focus:ring-violet-500/20"
              />

              <label className="mt-5 block text-sm text-white/70">I need help with</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {SERVICES.map((s) => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => setService(s)}
                    className={`relative rounded-full px-4 py-2 text-sm transition-colors ${
                      service === s ? "text-white" : "border border-white/10 text-white/60 hover:text-white"
                    }`}
                  >
                    {service === s && (
                      <motion.span layoutId="svc" className="absolute inset-0 -z-10 rounded-full bg-gradient-to-r from-violet-600 to-pink-500" />
                    )}
                    {s}
                  </button>
                ))}
              </div>

              <label className="mt-5 block text-sm text-white/70">Project Details</label>
              <textarea
                required
                rows={4}
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                placeholder="Tell me about your idea..."
                className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-white outline-none transition placeholder:text-white/30 focus:border-violet-400 focus:bg-white/[0.07] focus:ring-4 focus:ring-violet-500/20"
              />

              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                <button
                  type="submit"
                  className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 px-6 py-4 font-semibold text-white shadow-lg shadow-emerald-600/20 transition-transform active:scale-95"
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {sent ? (
                      <motion.span key="ok" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} className="flex items-center gap-2">
                        <Check className="h-5 w-5" /> Opening WhatsApp
                      </motion.span>
                    ) : (
                      <motion.span key="send" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} className="flex items-center gap-2">
                        <WhatsappIcon className="h-5 w-5" /> Send on WhatsApp
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
                <button
                  type="button"
                  onClick={sendEmail}
                  className="inline-flex items-center justify-center gap-2 rounded-xl glass px-6 py-4 font-semibold text-white transition hover:bg-white/10 active:scale-95"
                >
                  <Send className="h-4 w-4" /> Send Email
                </button>
              </div>
            </form>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
