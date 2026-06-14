import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ReactNode, useRef, useState } from "react";

interface MouseParallaxProps {
  children: ReactNode;
  className?: string;
  maxTilt?: number; // Maximum tilt angle in degrees
  maxOffset?: number; // Maximum movement offset in pixels
  perspective?: number; // 3D Perspective depth
  glareOpacity?: number; // Maximum opacity of the reflective glare
  enableGlare?: boolean; // Toggle glare overlay
}

export default function MouseParallax({
  children,
  className = "",
  maxTilt = 8,
  maxOffset = 10,
  perspective = 1000,
  glareOpacity = 0.15,
  enableGlare = true,
}: MouseParallaxProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Raw coordinate tracking (ranges from -0.5 to 0.5 representing percentage from center)
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Soft physics springs
  const springConfig = { damping: 25, stiffness: 120, mass: 0.6 };

  const rotateX = useSpring(
    useTransform(y, [-0.5, 0.5], [maxTilt, -maxTilt]),
    springConfig,
  );
  const rotateY = useSpring(
    useTransform(x, [-0.5, 0.5], [-maxTilt, maxTilt]),
    springConfig,
  );

  const translateX = useSpring(
    useTransform(x, [-0.5, 0.5], [-maxOffset, maxOffset]),
    springConfig,
  );
  const translateY = useSpring(
    useTransform(y, [-0.5, 0.5], [-maxOffset, maxOffset]),
    springConfig,
  );

  // Glare / sheen effect positioning
  const glareX = useSpring(
    useTransform(x, [-0.5, 0.5], ["0%", "100%"]),
    springConfig,
  );
  const glareY = useSpring(
    useTransform(y, [-0.5, 0.5], ["0%", "100%"]),
    springConfig,
  );

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();

    // Relative coordinates (-0.5 to 0.5)
    const relativeX = (event.clientX - rect.left) / rect.width - 0.5;
    const relativeY = (event.clientY - rect.top) / rect.height - 0.5;

    x.set(relativeX);
    y.set(relativeY);
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
    setIsHovered(false);
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
        perspective: perspective,
      }}
      className={`relative ${className}`}
    >
      {/* Visual Glare Layer */}
      {enableGlare && isHovered && (
        <motion.div
          style={{
            background: `radial-gradient(circle at ${glareX.get()} ${glareY.get()}, rgba(255,255,255,${glareOpacity}) 0%, transparent 60%)`,
            transformStyle: "preserve-3d",
            transform: "translateZ(2px)",
          }}
          className="absolute inset-0 pointer-events-none rounded-[inherit] z-30 transition-opacity duration-300 opacity-100"
        />
      )}

      {/* Internal floating content container */}
      <motion.div
        style={{
          x: translateX,
          y: translateY,
          transformStyle: "preserve-3d",
        }}
        className="h-full w-full"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
