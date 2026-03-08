"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedGridPatternProps {
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  strokeDasharray?: string | number;
  numSquares?: number;
  className?: string;
  maxOpacity?: number;
  duration?: number;
  repeatDelay?: number;
}

type Square = {
  id: number;
  pos: [number, number];
};

export function AnimatedGridPattern({
  width = 44,
  height = 44,
  x = -1,
  y = -1,
  strokeDasharray = 0,
  numSquares = 44,
  className,
  maxOpacity = 0.35,
  duration = 4,
  repeatDelay = 0.6,
}: AnimatedGridPatternProps) {
  const id = useId();
  const containerRef = useRef<SVGSVGElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const getPos = useMemo(
    () => () =>
      [
        Math.floor((Math.random() * dimensions.width) / width),
        Math.floor((Math.random() * dimensions.height) / height),
      ] as [number, number],
    [dimensions.height, dimensions.width, height, width],
  );

  const generateSquares = useMemo(
    () => (count: number): Square[] =>
      Array.from({ length: count }, (_, index) => ({
        id: index,
        pos: getPos(),
      })),
    [getPos],
  );

  const [squares, setSquares] = useState<Square[]>([]);

  useEffect(() => {
    if (!dimensions.width || !dimensions.height) {
      return;
    }
    setSquares(generateSquares(numSquares));
  }, [dimensions, generateSquares, numSquares]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const updateSquarePosition = (idToUpdate: number) => {
    setSquares((current) =>
      current.map((square) =>
        square.id === idToUpdate
          ? {
              ...square,
              pos: getPos(),
            }
          : square,
      ),
    );
  };

  return (
    <svg
      ref={containerRef}
      aria-hidden="true"
      className={cn("animated-grid-pattern", className)}
    >
      <defs>
        <pattern
          id={id}
          width={width}
          height={height}
          patternUnits="userSpaceOnUse"
          x={x}
          y={y}
        >
          <path
            d={`M.5 ${height}V.5H${width}`}
            fill="none"
            strokeDasharray={strokeDasharray}
          />
        </pattern>
      </defs>

      <rect width="100%" height="100%" fill={`url(#${id})`} />

      <svg x={x} y={y} className="animated-grid-pattern-squares">
        {squares.map(({ pos: [squareX, squareY], id: squareId }, index) => (
          <motion.rect
            key={`${squareId}-${squareX}-${squareY}-${index}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: maxOpacity }}
            transition={{
              duration,
              repeat: 1,
              delay: index * 0.08,
              repeatDelay,
              repeatType: "reverse",
            }}
            onAnimationComplete={() => updateSquarePosition(squareId)}
            width={width - 1}
            height={height - 1}
            x={squareX * width + 1}
            y={squareY * height + 1}
            fill="currentColor"
            strokeWidth="0"
          />
        ))}
      </svg>
    </svg>
  );
}
