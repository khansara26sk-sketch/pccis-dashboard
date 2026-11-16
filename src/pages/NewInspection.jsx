
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RotateCcw,
  Upload,
  CheckCircle2,
  AlertCircle,
  FileImage,
  ShieldCheck,
  Clock,
  Image as ImageIcon,
} from 'lucide-react';

import UploadDropzone from '../components/inspection/UploadDropzone';
import {
  createInspection,
  uploadInspectionEvidence,
} from '../services/inspectionService';
import { useToast } from '../context/ToastContext';

export default function NewInspection() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const [inspectionDraft, setInspectionDraft] = useState(null);
  const [evidenceData, setEvidenceData] = useState(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [apiError, setApiError] = useState(null);

  // Clean up preview URLs when the selected image changes or page unmounts.
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileSelect = (file) => {
    if (!file) return;

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setEvidenceData(null);
    setApiError(null);
    setUploadProgress(null);
  };

  const handleClear = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setEvidenceData(null);
    setApiError(null);
    setUploadProgress(null);

    // Keep an already-created draft so another image can use it.
  };

  const handleStartUpload = async () => {
    if (!selectedFile || isUploading) return;

    setIsUploading(true);
    setApiError(null);
    setUploadProgress(0);

    try {
      let draft = inspectionDraft;

      // Create a database inspection draft only once.
      if (!draft) {
        const draftResponse = await createInspection();
        draft = draftResponse.data;
        setInspectionDraft(draft);
      }

      // Upload the selected image against the real inspection ID.
      const uploadResponse = await uploadInspectionEvidence(
        draft.id,
        selectedFile,
        (progress) => {
          setUploadProgress(progress);
        }
      );

      setEvidenceData(uploadResponse.data);

      addToast({
        title: 'Image Uploaded Successfully',
        message: `Evidence has been saved for inspection ${draft.inspection_number}.`,
        type: 'success',
      });
    } catch (err) {
      console.error('Inspection upload error:', err);

      const errorMessage =
        err.message ||
        'The inspection could not be created or the image could not be uploaded.';

      setApiError(errorMessage);

      addToast({
        title: 'Upload Failed',
        message: errorMessage,
        type: 'error',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setInspectionDraft(null);
    setEvidenceData(null);
    setApiError(null);
    setUploadProgress(null);
  };

  const formatFileSize = (bytes) => {
    if (bytes === null || bytes === undefined) return 'Not available';

    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const preprocessingStatus =
    evidenceData?.preprocessing_status || 'Pending';

  const isPreprocessingComplete =
    String(preprocessingStatus).toLowerCase() === 'completed';

  return (
    <div className="space-y-6">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#19241C] rounded-2xl p-6 border border-[#E5EDE6] dark:border-[#29382D] shadow-[0_2px_8px_rgba(21,128,61,0.03)]">

        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#15803D] dark:text-[#4ADE80]">
              Inspection Management
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#17211B] dark:text-[#F0FDF4] mt-1">
            Packaged Commodity Label Inspection
          </h2>

          <p className="text-xs sm:text-sm text-[#647067] dark:text-[#A3B3A6] mt-1">
            Upload a package label image and save it as inspection evidence.
          </p>
        </div>

        {(inspectionDraft || selectedFile) && (
          <button
            type="button"
            onClick={handleReset}
            disabled={isUploading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-[#647067] dark:text-[#A3B3A6] hover:bg-[#F0FDF4] dark:hover:bg-[#173D26] border border-[#E5EDE6] dark:border-[#29382D] transition-colors disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        )}
      </div>

      {/* API Error */}
      {apiError && (
        <div className="p-4 rounded-2xl border border-red-500/20 bg-red-50/70 dark:bg-red-950/20 text-xs text-red-600 dark:text-red-400 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />

          <div className="flex-1">
            <p className="font-semibold text-sm mb-1">
              Inspection Processing Error
            </p>

            <p>{apiError}</p>

            <p className="mt-2 text-xs">
              Check that the backend is running and that you are logged in.
              You can retry the upload after resolving the issue.
            </p>
          </div>
        </div>
      )}

      {/* Existing Draft Information */}
      {inspectionDraft && (
        <div className="bg-white dark:bg-[#19241C] rounded-2xl border border-[#E5EDE6] dark:border-[#29382D] p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#DCFCE7] dark:bg-[#173D26] text-[#15803D] dark:text-[#4ADE80]">
              <ShieldCheck className="w-5 h-5" />
            </div>

            <div>
              <p className="text-xs text-[#647067] dark:text-[#A3B3A6]">
                Database Inspection Draft
              </p>

              <p className="text-sm font-bold text-[#17211B] dark:text-[#F0FDF4]">
                {inspectionDraft.inspection_number}
              </p>
            </div>

            <span className="ml-auto text-[10px] font-semibold px-2.5 py-1 rounded-full bg-[#FEF3C7] text-[#92400E]">
              {inspectionDraft.status}
            </span>
          </div>
        </div>
      )}

      {/* Image Upload */}
      {!evidenceData && (
        <div className="space-y-4">

          <UploadDropzone
            file={selectedFile}
            previewUrl={previewUrl}
            onFileSelect={handleFileSelect}
            onClear={handleClear}
            uploadProgress={isUploading ? uploadProgress : null}
          />

          {selectedFile && (
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleStartUpload}
                disabled={isUploading}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#15803D] hover:bg-[#166534] dark:bg-[#22C55E] dark:hover:bg-[#16A34A] text-white dark:text-[#101713] font-semibold text-sm shadow-md shadow-[#15803D]/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    <span>
                      {uploadProgress === 100
                        ? 'Processing image...'
                        : 'Uploading image...'}
                    </span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>
                      {inspectionDraft
                        ? 'Upload Evidence'
                        : 'Create Inspection & Upload'}
                    </span>
                  </>
                )}
              </button>
            </div>
          )}

          {isUploading && (
            <div className="bg-white dark:bg-[#19241C] rounded-xl border border-[#E5EDE6] dark:border-[#29382D] p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-[#17211B] dark:text-[#F0FDF4]">
                  Image Upload Progress
                </span>

                <span className="text-xs font-bold text-[#15803D] dark:text-[#4ADE80]">
                  {uploadProgress ?? 0}%
                </span>
              </div>

              <div className="h-2 rounded-full bg-[#E5EDE6] dark:bg-[#29382D] overflow-hidden">
                <div
                  className="h-full bg-[#15803D] dark:bg-[#22C55E] rounded-full transition-all duration-200"
                  style={{ width: `${uploadProgress ?? 0}%` }}
                />
              </div>

              <p className="text-[11px] text-[#647067] dark:text-[#A3B3A6] mt-2">
                The server is receiving your image. Image preprocessing
                information will appear after the upload response.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Actual Upload Result */}
      {evidenceData && (
        <div className="space-y-5">

          <div className="bg-white dark:bg-[#19241C] rounded-2xl border border-[#BBF7D0] dark:border-[#245B35] p-5">

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#DCFCE7] dark:bg-[#173D26] text-[#15803D] dark:text-[#4ADE80]">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-base font-bold text-[#17211B] dark:text-[#F0FDF4]">
                  Evidence Uploaded Successfully
                </h3>

                <p className="text-xs text-[#647067] dark:text-[#A3B3A6] mt-1">
                  The image and its metadata have been saved by the backend.
                </p>
              </div>
            </div>
          </div>

          {/* Evidence Details */}
          <div className="bg-white dark:bg-[#19241C] rounded-2xl border border-[#E5EDE6] dark:border-[#29382D] p-5 space-y-4">

            <div className="flex items-center gap-2">
              <FileImage className="w-5 h-5 text-[#15803D] dark:text-[#4ADE80]" />

              <h3 className="font-bold text-sm text-[#17211B] dark:text-[#F0FDF4]">
                Uploaded Evidence Details
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              <div>
                <p className="text-[11px] text-[#647067] dark:text-[#A3B3A6]">
                  Evidence ID
                </p>
                <p className="text-sm font-semibold text-[#17211B] dark:text-[#F0FDF4]">
                  {evidenceData.id}
                </p>
              </div>

              <div>
                <p className="text-[11px] text-[#647067] dark:text-[#A3B3A6]">
                  Inspection ID
                </p>
                <p className="text-sm font-semibold text-[#17211B] dark:text-[#F0FDF4]">
                  {evidenceData.inspection_id}
                </p>
              </div>

              <div>
                <p className="text-[11px] text-[#647067] dark:text-[#A3B3A6]">
                  Original Filename
                </p>
                <p className="text-sm font-semibold text-[#17211B] dark:text-[#F0FDF4] break-all">
                  {evidenceData.original_filename}
                </p>
              </div>

              <div>
                <p className="text-[11px] text-[#647067] dark:text-[#A3B3A6]">
                  File Type
                </p>
                <p className="text-sm font-semibold text-[#17211B] dark:text-[#F0FDF4]">
                  {evidenceData.content_type}
                </p>
              </div>

              <div>
                <p className="text-[11px] text-[#647067] dark:text-[#A3B3A6]">
                  File Size
                </p>
                <p className="text-sm font-semibold text-[#17211B] dark:text-[#F0FDF4]">
                  {formatFileSize(evidenceData.file_size_bytes)}
                </p>
              </div>

              <div>
                <p className="text-[11px] text-[#647067] dark:text-[#A3B3A6]">
                  Original Image Dimensions
                </p>
                <p className="text-sm font-semibold text-[#17211B] dark:text-[#F0FDF4]">
                  {evidenceData.width && evidenceData.height
                    ? `${evidenceData.width} × ${evidenceData.height}`
                    : 'Not available'}
                </p>
              </div>

              <div>
                <p className="text-[11px] text-[#647067] dark:text-[#A3B3A6]">
                  Preprocessing Status
                </p>
                <p className="text-sm font-semibold text-[#17211B] dark:text-[#F0FDF4]">
                  {preprocessingStatus}
                </p>
              </div>

              <div>
                <p className="text-[11px] text-[#647067] dark:text-[#A3B3A6]">
                  Processed Image Dimensions
                </p>
                <p className="text-sm font-semibold text-[#17211B] dark:text-[#F0FDF4]">
                  {evidenceData.processed_width && evidenceData.processed_height
                    ? `${evidenceData.processed_width} × ${evidenceData.processed_height}`
                    : 'Not available'}
                </p>
              </div>
            </div>

            {evidenceData.preprocessing_error && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/20 text-xs text-red-600 dark:text-red-400">
                {evidenceData.preprocessing_error}
              </div>
            )}
          </div>

          {/* Uploaded Image Preview */}
          <div className="bg-white dark:bg-[#19241C] rounded-2xl border border-[#E5EDE6] dark:border-[#29382D] p-5">

            <div className="flex items-center gap-2 mb-4">
              <ImageIcon className="w-5 h-5 text-[#15803D] dark:text-[#4ADE80]" />

              <h3 className="font-bold text-sm text-[#17211B] dark:text-[#F0FDF4]">
                Uploaded Package Image
              </h3>
            </div>

            {previewUrl && (
              <img
                src={previewUrl}
                alt="Uploaded package label"
                className="max-h-[420px] max-w-full mx-auto rounded-xl object-contain border border-[#E5EDE6] dark:border-[#29382D]"
              />
            )}
          </div>

          {/* Processing Scope */}
          <div className="bg-[#F0FDF4] dark:bg-[#173D26]/40 border border-[#BBF7D0] dark:border-[#245B35] rounded-2xl p-5">
            <h3 className="text-sm font-bold text-[#166534] dark:text-[#4ADE80]">
              Current Backend Processing
            </h3>

            <ul className="mt-3 space-y-2 text-xs text-[#365B40] dark:text-[#C5E8CE]">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Inspection draft saved in database
              </li>

              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Original image uploaded and evidence metadata saved
              </li>

              <li className="flex items-center gap-2">
                {isPreprocessingComplete ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <Clock className="w-4 h-4 shrink-0" />
                )}
                Image preprocessing: {preprocessingStatus}
              </li>
            </ul>

            <p className="text-[11px] text-[#647067] dark:text-[#A3B3A6] mt-4">
              OCR text extraction, automatic compliance verification and
              officer review submission are not yet connected to this page.
            </p>
          </div>

          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E5EDE6] dark:border-[#29382D] text-xs font-semibold text-[#17211B] dark:text-[#F0FDF4] hover:bg-[#F0FDF4] dark:hover:bg-[#173D26]"
            >
              <RotateCcw className="w-4 h-4" />
              New Inspection
            </button>

            <button
              type="button"
              onClick={() => navigate('/history')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#15803D] hover:bg-[#166534] dark:bg-[#22C55E] text-white dark:text-[#101713] text-xs font-semibold"
            >
              View Inspection History
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
