import { ReactNode, useEffect, useState, useRef } from "react";
import AppSidebar from "./AppSidebar";
import KizilyurekAssistant from "./KizilyurekAssistant";
import CommandPalette from "./CommandPalette";
import { useCustomization } from "@/lib/customizationContext";
import { motion } from "framer-motion";
import ParallaxBackground from "./ParallaxBackground";

const DigitalRain = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const chars = "01";
    const fontSize = 14;
    const columns = canvas.width / fontSize;
    const drops: number[] = Array(Math.floor(columns)).fill(1);
    const draw = () => {
      ctx.fillStyle = "rgba(1, 1, 1, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#ff0000";
      ctx.font = `${fontSize}px monospace`;
      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975)
          drops[i] = 0;
        drops[i]++;
      }
    };
    const interval = setInterval(draw, 50);
    return () => clearInterval(interval);
  }, []);
  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 opacity-[0.03] pointer-events-none z-0"
    />
  );
};

export default function PageShell({ children }: { children: ReactNode }) {
  const { settings } = useCustomization();
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [latency, setLatency] = useState(0);

  useEffect(() => {
    const handler = () => setAssistantOpen((v) => !v);
    window.addEventListener("kizilyurek:toggle", handler);
    const timer = setInterval(
      () => setLatency(Math.floor(Math.random() * 40) + 15),
      3000,
    );

    // Session Immolation - Logic for Item #26
    const handleUnload = () => {
      if (localStorage.getItem("dead-man-mode") === "armed") {
        sessionStorage.clear();
        localStorage.removeItem("supabase.auth.token");
      }
    };
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      window.removeEventListener("kizilyurek:toggle", handler);
      clearInterval(timer);
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, []);

  const collapsed = settings.sidebarCollapsed;
  const isRight = settings.sidebarPosition === "right";
  const margin = collapsed
    ? isRight
      ? "mr-[80px]"
      : "ml-[80px]"
    : isRight
      ? "mr-[280px]"
      : "ml-[280px]";

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--primary-hue",
      settings.themeHue.toString(),
    );
  }, [settings.themeHue]);

  return (
    <div className="min-h-screen bg-[#010101] relative selection:bg-red-600 selection:text-white scanline overflow-x-hidden">
      <DigitalRain />
      <div className="fixed inset-0 cyber-grid opacity-[0.05] pointer-events-none z-0" />
      <ParallaxBackground />
      <AppSidebar />

      <main
        className={`${margin} relative z-10 transition-all duration-500 ease-in-out`}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.99 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-6 md:p-8 lg:p-12 min-h-screen"
        >
          {children}
        </motion.div>
      </main>

      {/* Session Timer is integrated into Left Top Telemetry capsule */}
      <KizilyurekAssistant
        open={assistantOpen}
        onOpenChange={setAssistantOpen}
        hideFab
      />
      <CommandPalette />
    </div>
  );
}
