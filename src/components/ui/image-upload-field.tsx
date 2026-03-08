"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import { ImagePlus, RefreshCcw, Trash2, X } from "lucide-react";
import { useImageUpload } from "@/components/hooks/use-image-upload";
import { GlowButton } from "@/components/ui/glow-button";
import { cn } from "@/lib/utils";

interface ImageUploadFieldProps {
  label: string;
  hint?: string;
  onFileSelect?: (file: File | null) => void;
}

export function ImageUploadField({
  label,
  hint = "JPG, PNG, atau WEBP. Foto akan dipakai sebagai referensi wajah karakter.",
  onFileSelect,
}: ImageUploadFieldProps) {
  const [isDragging, setIsDragging] = useState(false);
  const {
    previewUrl,
    fileName,
    fileInputRef,
    applyFile,
    handleThumbnailClick,
    handleFileChange,
    handleRemove,
  } = useImageUpload({
    onFileSelect,
  });

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);

      const file = event.dataTransfer.files?.[0];
      if (!file || !file.type.startsWith("image/")) {
        return;
      }

      applyFile(file);
    },
    [applyFile],
  );

  return (
    <div className="upload-field">
      <div className="upload-field-copy">
        <p className="upload-field-label">{label}</p>
        <p className="upload-field-hint">{hint}</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="upload-field-input"
        onChange={handleFileChange}
      />

      {!previewUrl ? (
        <div
          onClick={handleThumbnailClick}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn("upload-dropzone", isDragging && "is-dragging")}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              handleThumbnailClick();
            }
          }}
        >
          <div className="upload-dropzone-badge">
            <ImagePlus size={22} strokeWidth={2} />
          </div>
          <div className="upload-dropzone-copy">
            <strong>Pilih foto atau drop file di sini</strong>
            <span>Potret wajah setengah badan paling aman untuk consistency.</span>
          </div>
        </div>
      ) : (
        <div className="upload-preview-shell">
          <div className="upload-preview-frame">
            <Image
              src={previewUrl}
              alt="Preview foto referensi"
              fill
              unoptimized
              className="upload-preview-image"
              sizes="(max-width: 768px) 100vw, 420px"
            />
          </div>

          <div className="upload-preview-meta">
            <div className="upload-preview-name">
              <span>{fileName}</span>
              <button
                type="button"
                className="upload-remove-inline"
                onClick={handleRemove}
                aria-label="Hapus foto referensi"
              >
                <X size={14} />
              </button>
            </div>

            <div className="inline-actions">
              <GlowButton tone="pill" onClick={handleThumbnailClick}>
                <span className="button-inline-icon">
                  <RefreshCcw size={14} />
                </span>
                Ganti
              </GlowButton>
              <GlowButton tone="pill" onClick={handleRemove}>
                <span className="button-inline-icon">
                  <Trash2 size={14} />
                </span>
                Hapus
              </GlowButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
