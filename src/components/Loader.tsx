import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function Loader({ onDone }: { onDone: () => void }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setCount((c) => {
        if (c >= 100) {
          clearInterval(id);
          setTimeout(onDone, 350);
          return 100;
        }
        return Math.min(100, c + Math.ceil(Math.random() * 9));
      });
    }, 45);
    return () => clearInterval(id);
  }, [onDone]);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#07060d]"
      exit={{ clipPath: "inset(0 0 100% 0)" }}
      initial={{ clipPath: "inset(0 0 0% 0)" }}
      transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}
    >
      <div className="relative">
        <motion.div
          className="absolute -inset-10 rounded-full bg-gradient-to-r from-violet-600/40 to-cyan-500/40 blur-3xl"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <motion.div
          initial={{ scale: 0.6, opacity: 0, rotate: -20 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ duration: 0.8, ease: "backOut" }}
          className="relative grid h-24 w-24 place-items-center rounded-3xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 font-display text-4xl font-black text-white shadow-2xl shadow-violet-500/40"
        >
          RG
        </motion.div>
      </div>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-10 font-display text-sm uppercase tracking-[0.4em] text-white/60"
      >
        Ryan Graphix Designz
      </motion.p>
      <div className="mt-6 h-[2px] w-56 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full bg-gradient-to-r from-violet-500 via-pink-500 to-cyan-400"
          style={{ width: `${count}%` }}
        />
      </div>
      <p className="mt-3 font-mono text-xs text-white/40">{count}%</p>
    </motion.div>
  );
}
