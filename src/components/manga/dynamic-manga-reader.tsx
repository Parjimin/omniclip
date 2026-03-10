"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X, BookOpen } from "lucide-react";

type MangaPanel = {
  index: number;
  fileName: string;
  downloadUrl: string;
};

export function DynamicMangaReader({ panels }: { panels: MangaPanel[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [direction, setDirection] = useState(0);

  const navigatePage = useCallback(
    (newDirection: number) => {
      if (!panels) return;
      const nextIndex = currentPage + newDirection;
      if (nextIndex >= 0 && nextIndex < panels.length) {
        setDirection(newDirection);
        setCurrentPage(nextIndex);
      }
    },
    [currentPage, panels],
  );

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") navigatePage(1);
      if (e.key === "ArrowLeft") navigatePage(-1);
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, navigatePage]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 300 : -300,
      opacity: 0,
      scale: 0.92,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (dir: number) => ({
      zIndex: 0,
      x: dir < 0 ? 300 : -300,
      opacity: 0,
      scale: 0.92,
    }),
  };

  if (!panels || panels.length === 0) return null;

  return (
    <>
      {/* ── Blur Preview Card ── */}
      <div className="flex flex-col gap-3">
        <div
          className="relative w-full rounded-xl overflow-hidden cursor-pointer group"
          style={{ aspectRatio: "3/2", background: "#0a0a0c" }}
          onClick={() => {
            setCurrentPage(0);
            setDirection(0);
            setIsOpen(true);
          }}
        >
          {/* Blurred mosaic of first panels */}
          <div className="absolute inset-0 grid grid-cols-2 gap-0">
            {panels.slice(0, 4).map((panel, idx) => (
              <div key={idx} className="relative w-full h-full overflow-hidden">
                <Image
                  src={panel.downloadUrl}
                  alt={`Preview ${idx + 1}`}
                  fill
                  unoptimized
                  className="object-cover"
                  style={{ filter: "blur(12px) brightness(0.55)", transform: "scale(1.15)" }}
                />
              </div>
            ))}
          </div>

          {/* Dark gradient overlay */}
          <div
            className="absolute inset-0 z-10"
            style={{
              background: "radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.7) 100%)",
            }}
          />

          {/* CTA */}
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
              style={{
                background: "linear-gradient(135deg, #df6d2d, #c44d16)",
                boxShadow: "0 4px 24px rgba(223,109,45,0.5)",
              }}
            >
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <span className="text-white font-bold text-sm tracking-wide drop-shadow-lg">
              Mulai Baca
            </span>
            <span className="text-white/50 text-[10px] font-medium tracking-wider uppercase">
              {panels.length} panel • tap untuk buka
            </span>
          </div>

          {/* Hover glow */}
          <div className="absolute inset-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at center, rgba(223,109,45,0.12) 0%, transparent 70%)" }}
          />
        </div>

        {/* Mini thumbnail strip */}
        <div className="flex items-center gap-1.5 px-1">
          {panels.map((panel, idx) => (
            <button
              key={idx}
              onClick={() => {
                setCurrentPage(idx);
                setDirection(0);
                setIsOpen(true);
              }}
              className="relative rounded-md overflow-hidden border-2 border-transparent hover:border-[#df6d2d]/60 transition-all duration-200 flex-1"
              style={{ aspectRatio: "3/4", maxWidth: 56 }}
            >
              <Image
                src={panel.downloadUrl}
                alt={`Thumb ${idx + 1}`}
                fill
                unoptimized
                className="object-cover"
              />
              <div className="absolute inset-0 bg-black/20 hover:bg-black/0 transition-colors" />
              <span className="absolute bottom-0.5 right-1 text-[8px] text-white/70 font-bold drop-shadow">{idx + 1}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Fullscreen Modal Reader ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(8px)" }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsOpen(false);
            }}
          >
            {/* Close button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
              style={{ background: "rgba(255,255,255,0.1)", backdropFilter: "blur(4px)" }}
            >
              <X className="w-5 h-5 text-white/80" />
            </button>

            {/* Page counter */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50">
              <span
                className="px-4 py-1.5 rounded-full text-xs font-bold text-white/80 tracking-wider"
                style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
              >
                {currentPage + 1} / {panels.length}
              </span>
            </div>

            {/* Panel display */}
            <div className="relative w-full h-full max-w-3xl max-h-[90vh] mx-4 flex items-center justify-center">
              <AnimatePresence initial={false} custom={direction} mode="popLayout">
                <motion.div
                  key={currentPage}
                  custom={direction}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    x: { type: "spring", stiffness: 300, damping: 30 },
                    opacity: { duration: 0.2 },
                    scale: { duration: 0.3 },
                  }}
                  className="absolute inset-0 flex items-center justify-center p-4"
                >
                  <Image
                    src={panels[currentPage].downloadUrl}
                    alt={`Panel ${currentPage + 1}`}
                    fill
                    unoptimized
                    className="object-contain drop-shadow-2xl"
                  />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Nav: Left */}
            {currentPage > 0 && (
              <button
                className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 z-50 w-12 h-12 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(8px)" }}
                onClick={() => navigatePage(-1)}
              >
                <ChevronLeft className="w-6 h-6 text-white/80" />
              </button>
            )}

            {/* Nav: Right */}
            {currentPage < panels.length - 1 && (
              <button
                className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 z-50 w-12 h-12 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(8px)" }}
                onClick={() => navigatePage(1)}
              >
                <ChevronRight className="w-6 h-6 text-white/80" />
              </button>
            )}

            {/* Bottom progress dots */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5">
              {panels.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setDirection(idx > currentPage ? 1 : -1);
                    setCurrentPage(idx);
                  }}
                  className={`rounded-full transition-all duration-300 ${
                    idx === currentPage
                      ? "w-6 h-2 bg-gradient-to-r from-[#df6d2d] to-[#ffca89] shadow-[0_0_10px_rgba(223,109,45,0.6)]"
                      : "w-2 h-2 bg-white/20 hover:bg-white/40"
                  }`}
                  aria-label={`Buka panel ${idx + 1}`}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
