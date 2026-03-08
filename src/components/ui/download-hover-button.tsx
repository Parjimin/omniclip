"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedDownloadButtonProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  label: string;
}

export default function AnimatedDownloadButton({
  label,
  className,
  ...props
}: AnimatedDownloadButtonProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [touchMode, setTouchMode] = React.useState(false);

  React.useEffect(() => {
    const media = window.matchMedia("(hover: none), (pointer: coarse)");
    const updateMode = () => setTouchMode(media.matches);

    updateMode();
    media.addEventListener("change", updateMode);
    return () => media.removeEventListener("change", updateMode);
  }, []);

  const expanded = touchMode || isExpanded;

  return (
    <a
      {...props}
      className={cn("download-hover-link", className)}
      onFocus={() => setIsExpanded(true)}
      onBlur={() => setIsExpanded(false)}
    >
      <motion.div
        initial={false}
        animate={{
          width: expanded ? 216 : 68,
          borderRadius: expanded ? 22 : 34,
        }}
        whileHover={!touchMode ? { width: 216, borderRadius: 22 } : undefined}
        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        onHoverStart={() => setIsExpanded(true)}
        onHoverEnd={() => setIsExpanded(false)}
        className="download-hover-button"
      >
        <motion.div
          className="download-hover-icon"
          animate={{
            opacity: expanded ? 0 : 1,
            scale: expanded ? 0.84 : 1,
          }}
          transition={{ duration: 0.18 }}
        >
          <Download size={20} strokeWidth={2.3} />
        </motion.div>

        <motion.div
          className="download-hover-label"
          initial={false}
          animate={{
            opacity: expanded ? 1 : 0,
            x: expanded ? 0 : -8,
          }}
          transition={{ duration: 0.18, delay: expanded ? 0.04 : 0 }}
        >
          <span>{label}</span>
        </motion.div>
      </motion.div>
    </a>
  );
}
