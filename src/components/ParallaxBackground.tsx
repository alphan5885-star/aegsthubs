import { useEffect, useRef } from "react";
import { useCustomization } from "@/lib/customizationContext";

interface Particle {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  size: number;
  speedX: number;
  speedY: number;
  alpha: number;
  depth: number; // 0.2 to 1.0 (determines speed of parallax movement)
  char: string;
}

export default function ParallaxBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { settings } = useCustomization();
  const mouseRef = useRef({ x: -1000, y: -1000, active: false });
  const scrollYRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    const maxParticles = 60;
    const colors = {
      primary: `hue-rotate(${settings.themeHue}deg)`,
    };

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    const initParticles = () => {
      particles = [];
      const chars = "01";
      for (let i = 0; i < maxParticles; i++) {
        const depth = Math.random() * 0.8 + 0.2; // deep to close
        const size = Math.floor(depth * 10) + 6;
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        particles.push({
          x,
          y,
          baseX: x,
          baseY: y,
          size,
          speedX: (Math.random() - 0.5) * 0.3 * depth,
          speedY: (Math.random() * 0.5 + 0.2) * depth,
          alpha: depth * 0.3,
          depth,
          char: chars[Math.floor(Math.random() * chars.length)],
        });
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      mouseRef.current.active = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    const handleScroll = () => {
      scrollYRef.current = window.scrollY;
    };

    // Attach listeners
    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("scroll", handleScroll, { passive: true });

    // Initial setup
    resizeCanvas();

    // Render loop
    const render = () => {
      // Hex/Dark slate clear
      ctx.fillStyle = "rgba(1, 1, 1, 0.08)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Color scheme based on primary customization hue
      ctx.fillStyle = `hsla(${settings.themeHue}, 100%, 50%, 0.12)`;
      ctx.font = "bold 14px monospace";

      // Draw Grid Layer with parallax movement
      const gridOffsetScale = 0.05;
      const mouseGridX = mouseRef.current.active
        ? (mouseRef.current.x - canvas.width / 2) * gridOffsetScale
        : 0;
      const mouseGridY = mouseRef.current.active
        ? (mouseRef.current.y - canvas.height / 2) * gridOffsetScale
        : 0;
      const scrollGridY = -scrollYRef.current * 0.1;

      ctx.strokeStyle = `hsla(${settings.themeHue}, 100%, 50%, 0.015)`;
      ctx.lineWidth = 1;
      const gridSize = 80;

      ctx.beginPath();
      // Vertical grid lines
      for (
        let x = (mouseGridX % gridSize) - gridSize;
        x < canvas.width + gridSize;
        x += gridSize
      ) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
      }
      // Horizontal grid lines
      for (
        let y = ((mouseGridY + scrollGridY) % gridSize) - gridSize;
        y < canvas.height + gridSize;
        y += gridSize
      ) {
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
      }
      ctx.stroke();

      // Render & Animate Particles
      particles.forEach((p) => {
        // Natural movement
        p.baseY += p.speedY;
        p.baseX += p.speedX;

        // Wrap around boundary limits
        if (p.baseY > canvas.height) {
          p.baseY = -20;
          p.baseX = Math.random() * canvas.width;
        }
        if (p.baseX < -20) p.baseX = canvas.width + 10;
        if (p.baseX > canvas.width + 20) p.baseX = -10;

        // Apply Scroll Parallax displacement
        let currentY = p.baseY - scrollYRef.current * p.depth * 0.4;
        let currentX = p.baseX;

        // Apply Mouse Repulsion force fields
        if (mouseRef.current.active) {
          const dx = currentX - mouseRef.current.x;
          const dy = currentY - mouseRef.current.y;
          const distance = Math.hypot(dx, dy);
          const forceRadius = 150;

          if (distance < forceRadius) {
            // Stronger push the closer it gets
            const force = (forceRadius - distance) / forceRadius;
            const pushX = (dx / distance) * force * 45 * p.depth;
            const pushY = (dy / distance) * force * 45 * p.depth;
            currentX += pushX;
            currentY += pushY;
          }
        }

        // Draw particle (binary number styling)
        ctx.fillStyle = `hsla(${settings.themeHue}, 100%, 50%, ${p.alpha})`;
        ctx.font = `${p.size}px monospace`;
        ctx.fillText(p.char, currentX, currentY);

        // Randomly flip between binary digits
        if (Math.random() > 0.99) {
          p.char = p.char === "0" ? "1" : "0";
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(animationFrameId);
    };
  }, [settings.themeHue]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-10 bg-transparent"
      style={{ backfaceVisibility: "hidden" }}
    />
  );
}
