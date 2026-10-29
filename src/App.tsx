import { AnimatePresence } from "framer-motion";
import { useCallback, useState } from "react";
import Loader from "./components/Loader";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Marquee from "./components/Marquee";
import About from "./components/About";
import Services from "./components/Services";
import Projects from "./components/Projects";
import Process from "./components/Process";
import Channels from "./components/Channels";
import Contact from "./components/Contact";
import Footer from "./components/Footer";
import FloatingWhatsapp from "./components/FloatingWhatsapp";
import { CursorGlow, ScrollProgress } from "./components/CursorGlow";

export default function App() {
  const [loading, setLoading] = useState(true);
  const done = useCallback(() => setLoading(false), []);

  return (
    <div className="noise relative min-h-screen">
      <AnimatePresence>{loading && <Loader key="loader" onDone={done} />}</AnimatePresence>

      {!loading && (
        <>
          <ScrollProgress />
          <CursorGlow />
          <Navbar />
          <main className="relative z-10">
            <Hero />
            <Marquee />
            <About />
            <Services />
            <Projects />
            <Process />
            <Channels />
            <Contact />
          </main>
          <Footer />
          <FloatingWhatsapp />
        </>
      )}
    </div>
  );
}
