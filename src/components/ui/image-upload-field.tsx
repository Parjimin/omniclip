"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface ImageUploadFieldProps {
  label: string;
  hint?: string;
  onFileSelect?: (file: File | null) => void;
}

export function ImageUploadField({
  label,
  hint = "JPG, PNG, atau WEBP.",
  onFileSelect,
}: ImageUploadFieldProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<{ name: string; url: string } | null>(null);

  function pick(f: File) {
    if (file?.url) URL.revokeObjectURL(file.url);
    const url = URL.createObjectURL(f);
    setFile({ name: f.name, url });
    onFileSelect?.(f);
  }

  function clear() {
    if (file?.url) URL.revokeObjectURL(file.url);
    setFile(null);
    onFileSelect?.(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <p style={{ fontSize: 12, fontWeight: 500, color: "#111216" }}>{label}</p>
      <p style={{ fontSize: 10, color: "#8c9bab" }}>{hint}</p>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) pick(f);
        }}
      />

      {!file ? (
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); setDragging(false); }}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files?.[0];
            if (f && f.type.startsWith("image/")) pick(f);
          }}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            minHeight: 80,
            padding: "14px 16px",
            borderRadius: 14,
            border: dragging ? "2px solid #df6d2d" : "2px dashed rgba(0,0,0,0.12)",
            background: dragging
              ? "linear-gradient(180deg, rgba(223,109,45,0.08) 0%, rgba(223,109,45,0.03) 100%)"
              : "rgba(255,255,255,0.4)",
            cursor: "pointer",
            textAlign: "center" as const,
            transition: "all 200ms ease",
            transform: dragging ? "scale(1.02)" : "scale(1)",
          }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: dragging ? "#df6d2d" : "rgba(0,0,0,0.05)",
            color: dragging ? "#fff" : "#445a6b",
            transition: "all 200ms ease",
          }}>
            {dragging ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: dragging ? "#df6d2d" : "#111216" }}>
              {dragging ? "Lepaskan file di sini!" : "Klik atau drag foto ke sini"}
            </span>
            <span style={{ fontSize: 10, color: dragging ? "rgba(223,109,45,0.7)" : "#8c9bab" }}>
              {dragging ? "JPG, PNG, WEBP" : "Potret wajah setengah badan paling aman."}
            </span>
          </div>
        </div>
      ) : (
        <div style={{
          position: "relative",
          borderRadius: 16,
          overflow: "hidden",
          border: "1px solid rgba(223,109,45,0.15)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
        }}>
          {/* Blurred background layer */}
          <div style={{
            position: "absolute", inset: 0, zIndex: 0,
            backgroundImage: `url(${file.url})`,
            backgroundSize: "cover", backgroundPosition: "center",
            filter: "blur(24px) saturate(1.4)", opacity: 0.35,
            transform: "scale(1.2)",
          }} />

          {/* Main preview image */}
          <div style={{
            position: "relative", zIndex: 1,
            display: "flex", flexDirection: "column", alignItems: "center",
            padding: "12px 12px 10px",
            gap: 8,
          }}>
            <div style={{
              position: "relative",
              width: "100%", maxWidth: 140, aspectRatio: "3/4",
              borderRadius: 10, overflow: "hidden",
              boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
              border: "2px solid rgba(255,255,255,0.6)",
            }}>
              <Image src={file.url} alt="Preview" fill unoptimized style={{ objectFit: "cover" }} sizes="140px" />
            </div>

            {/* Info bar */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              width: "100%", padding: "8px 10px",
              borderRadius: 10,
              background: "rgba(255,255,255,0.75)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(0,0,0,0.05)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flex: 1 }}>
                {/* Green check icon */}
                <div style={{
                  width: 20, height: 20, borderRadius: "50%",
                  background: "#1f7a49", color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 500, color: "#111216",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const,
                }}>{file.name}</span>
              </div>

              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                <button type="button" onClick={() => fileRef.current?.click()} style={{
                  fontSize: 10, fontWeight: 600, color: "#fff",
                  background: "linear-gradient(135deg, #e8743a 0%, #d45a1e 100%)",
                  border: "none", borderRadius: 6,
                  padding: "4px 10px", cursor: "pointer",
                  transition: "all 200ms ease",
                  boxShadow: "0 2px 8px rgba(223,109,45,0.25)",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(223,109,45,0.35)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(223,109,45,0.25)"; }}
                >Ganti</button>
                <button type="button" onClick={clear} style={{
                  fontSize: 10, fontWeight: 600, color: "#445a6b",
                  background: "rgba(0,0,0,0.05)", border: "none", borderRadius: 6,
                  padding: "4px 10px", cursor: "pointer",
                  transition: "opacity 150ms",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                >Hapus</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
