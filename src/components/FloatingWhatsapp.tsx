import { motion } from "framer-motion";
import { BRAND } from "../data";
import { WhatsappIcon } from "./BrandIcons";

export default function FloatingWhatsapp() {
  return (
    <motion.a
      href={`${BRAND.whatsapp}?text=${encodeURIComponent("Assalam-u-Alaikum Reyyan! I visited your website and want to discuss a project.")}`}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat on WhatsApp"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 2, type: "spring" }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      className="group fixed bottom-6 right-6 z-50 flex items-center gap-2"
    >
      <span className="pointer-events-none hidden rounded-full bg-white px-4 py-2 text-sm font-medium text-black opacity-0 shadow-xl transition-opacity group-hover:opacity-100 sm:block">
        Chat with me
      </span>
      <span className="relative grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-green-600 text-white shadow-2xl shadow-emerald-500/40">
        <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/40" />
        <WhatsappIcon className="relative h-7 w-7" />
      </span>
    </motion.a>
  );
}
