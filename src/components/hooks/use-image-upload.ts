import { useCallback, useEffect, useRef, useState } from "react";

interface UseImageUploadProps {
  onUpload?: (url: string) => void;
  onFileSelect?: (file: File | null) => void;
}

export function useImageUpload({ onUpload, onFileSelect }: UseImageUploadProps = {}) {
  const previewRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleThumbnailClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const applyFile = useCallback(
    (file: File | null | undefined) => {
      if (!file) {
        return;
      }

      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current);
      }

      setFileName(file.name);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      previewRef.current = url;
      onUpload?.(url);
      onFileSelect?.(file);
    },
    [onFileSelect, onUpload],
  );

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      applyFile(event.target.files?.[0]);
    },
    [applyFile],
  );

  const handleRemove = useCallback(() => {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
    }
    setPreviewUrl(null);
    setFileName(null);
    previewRef.current = null;
    onFileSelect?.(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [onFileSelect]);

  useEffect(() => {
    return () => {
      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current);
      }
    };
  }, []);

  return {
    previewUrl,
    fileName,
    fileInputRef,
    applyFile,
    handleThumbnailClick,
    handleFileChange,
    handleRemove,
  };
}
