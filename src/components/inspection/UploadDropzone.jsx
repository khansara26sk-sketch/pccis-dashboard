import React, { useState, useRef } from 'react';
import { Upload, X, CheckCircle2 } from 'lucide-react';

export default function UploadDropzone({
  file,
  previewUrl,
  onFileSelect,
  onClear,
  uploadProgress = null
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (isValidFile(droppedFile)) {
        onFileSelect(droppedFile);
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = e.target.files[0];
      if (isValidFile(selected)) {
        onFileSelect(selected);
      }
    }
  };

  const isValidFile = (f) => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    return validTypes.includes(f.type) || /\.(jpe?g|png)$/i.test(f.name);
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    const kb = bytes / 1024;
    return kb > 1024 ? `${(kb / 1024).toFixed(2)} MB` : `${Math.round(kb)} KB`;
  };

  return (
    <div className="w-full space-y-4">
      {/* Upload Zone */}
      {!previewUrl ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 sm:p-12 text-center transition-all duration-200 flex flex-col items-center justify-center ${
            isDragOver
              ? 'border-[#15803D] bg-[#F0FDF4] dark:bg-[#173D26]/40'
              : 'border-[#E5EDE6] dark:border-[#29382D] bg-white dark:bg-[#19241C] hover:border-[#15803D]/60 dark:hover:border-[#4ADE80]/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png, image/jpeg, image/jpg"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="w-14 h-14 rounded-2xl bg-[#F0FDF4] dark:bg-[#173D26] text-[#15803D] dark:text-[#4ADE80] flex items-center justify-center mb-3 shadow-xs border border-[#E5EDE6] dark:border-[#29382D]">
            <Upload className="w-6 h-6 stroke-[1.75]" />
          </div>

          <h3 className="text-sm font-semibold text-[#17211B] dark:text-[#F0FDF4] font-['Plus_Jakarta_Sans']">
            Upload Package Commodity Label
          </h3>
          <p className="text-xs text-[#647067] dark:text-[#A3B3A6] mt-1 max-w-sm">
            Drag and drop high-resolution front/back packaging image here, or{' '}
            <span className="text-[#15803D] dark:text-[#4ADE80] font-semibold underline underline-offset-2">
              browse files
            </span>
          </p>

          <div className="mt-4 flex items-center gap-3 text-[11px] text-[#647067] dark:text-[#A3B3A6]">
            <span>Supports JPG, JPEG, PNG</span>
            <span>•</span>
            <span>Max file size: 25 MB</span>
          </div>
        </div>
      ) : (
        /* Image Preview Box */
        <div className="relative rounded-2xl border border-[#E5EDE6] dark:border-[#29382D] bg-white dark:bg-[#19241C] p-4 shadow-xs">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative w-full sm:w-48 h-40 rounded-xl overflow-hidden bg-black/90 shrink-0 border border-[#E5EDE6] dark:border-[#29382D] flex items-center justify-center">
              <img
                src={previewUrl}
                alt="Package preview"
                className="max-h-full max-w-full object-contain"
              />
            </div>

            <div className="flex-1 min-w-0 text-left w-full">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-md bg-[#DCFCE7] dark:bg-[#173D26] text-[#15803D] dark:text-[#4ADE80]">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-[#17211B] dark:text-[#F0FDF4]">
                    Image Loaded & Ready
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onClear}
                  className="p-1.5 rounded-lg text-[#647067] hover:text-[#DC2626] hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  title="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-2 text-xs space-y-1">
                <p className="font-medium text-[#17211B] dark:text-[#F0FDF4] truncate">
                  {file?.name || 'Selected Package Image'}
                </p>
                {file?.size && (
                  <p className="text-[11px] text-[#647067] dark:text-[#A3B3A6]">
                    File size: {formatFileSize(file.size)}
                  </p>
                )}
              </div>

              {/* Progress bar if analyzing */}
              {uploadProgress !== null && (
                <div className="mt-3">
                  <div className="flex justify-between text-[11px] text-[#647067] dark:text-[#A3B3A6] mb-1">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#E5EDE6] dark:bg-[#29382D] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#15803D] dark:bg-[#22C55E] transition-all duration-300 rounded-full"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
