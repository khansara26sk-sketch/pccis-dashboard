import React, { useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Eye, EyeOff } from 'lucide-react';

export default function ImageInspector({
  imageUrl,
  fields = {},
  activeFieldKey = null,
  onHoverField = null
}) {
  const [zoom, setZoom] = useState(1);
  const [showBoxes, setShowBoxes] = useState(true);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 2.5));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.75));
  const handleResetZoom = () => setZoom(1);

  return (
    <div className="w-full bg-white dark:bg-[#19241C] rounded-2xl border border-[#E5EDE6] dark:border-[#29382D] p-4 flex flex-col h-full shadow-[0_2px_8px_rgba(21,128,61,0.03)]">
      {/* Header Toolbar */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E5EDE6] dark:border-[#29382D]">
        <span className="text-xs font-semibold text-[#17211B] dark:text-[#F0FDF4]">
          Package Visual Label Viewer
        </span>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowBoxes(!showBoxes)}
            className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-colors ${
              showBoxes
                ? 'bg-[#DCFCE7] dark:bg-[#173D26] border-[#15803D]/30 text-[#15803D] dark:text-[#4ADE80]'
                : 'border-[#E5EDE6] dark:border-[#29382D] text-[#647067] dark:text-[#A3B3A6] hover:bg-[#F0FDF4] dark:hover:bg-[#173D26]'
            }`}
            title="Toggle OCR Bounding Boxes"
          >
            {showBoxes ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span className="text-[11px] hidden sm:inline">Bounding Boxes</span>
          </button>

          <div className="h-4 w-px bg-[#E5EDE6] dark:bg-[#29382D] mx-1" />

          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1.5 rounded-lg border border-[#E5EDE6] dark:border-[#29382D] text-[#647067] dark:text-[#A3B3A6] hover:text-[#17211B] dark:hover:text-[#F0FDF4] hover:bg-[#F0FDF4] dark:hover:bg-[#173D26] transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono text-[#647067] dark:text-[#A3B3A6] w-10 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1.5 rounded-lg border border-[#E5EDE6] dark:border-[#29382D] text-[#647067] dark:text-[#A3B3A6] hover:text-[#17211B] dark:hover:text-[#F0FDF4] hover:bg-[#F0FDF4] dark:hover:bg-[#173D26] transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleResetZoom}
            className="p-1.5 rounded-lg border border-[#E5EDE6] dark:border-[#29382D] text-[#647067] dark:text-[#A3B3A6] hover:text-[#17211B] dark:hover:text-[#F0FDF4] hover:bg-[#F0FDF4] dark:hover:bg-[#173D26] transition-colors"
            title="Reset Zoom"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Image Stage with Relative Bounding Boxes */}
      <div className="relative flex-1 min-h-[380px] mt-3 rounded-xl overflow-auto bg-black/95 flex items-center justify-center p-4 select-none">
        <div
          className="relative transition-transform duration-200 origin-center max-w-full"
          style={{ transform: `scale(${zoom})` }}
        >
          <img
            src={imageUrl}
            alt="Commodity Package"
            className="max-h-[460px] w-auto object-contain rounded-lg shadow-lg pointer-events-none"
          />

          {/* Bounding Boxes Layer */}
          {showBoxes && (
            <div className="absolute inset-0 pointer-events-auto">
              {Object.entries(fields).map(([key, item]) => {
                if (!item?.box) return null;
                const isSelected = activeFieldKey === key;
                const { x, y, w, h } = item.box;

                return (
                  <div
                    key={key}
                    onMouseEnter={() => onHoverField && onHoverField(key)}
                    onMouseLeave={() => onHoverField && onHoverField(null)}
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      width: `${w}%`,
                      height: `${h}%`,
                    }}
                    className={`absolute rounded-sm border-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#15803D] dark:border-[#4ADE80] bg-[#15803D]/25 ring-2 ring-[#4ADE80] z-20'
                        : item.status === 'Uncertain'
                        ? 'border-amber-400 bg-amber-500/15 hover:bg-amber-500/25'
                        : item.status === 'Unreadable'
                        ? 'border-red-400 bg-red-500/15'
                        : 'border-[#16A34A]/80 dark:border-[#4ADE80]/80 bg-[#16A34A]/10 hover:bg-[#16A34A]/25'
                    }`}
                  >
                    <div className="absolute -top-4 left-0 text-[9px] font-bold px-1 py-0.2 rounded bg-[#101713]/90 text-white whitespace-nowrap shadow-xs pointer-events-none">
                      {key} {item.confidence ? `(${item.confidence}%)` : ''}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="mt-2 text-center text-[11px] text-[#647067] dark:text-[#A3B3A6]">
        Hover over highlights or fields below to inspect corresponding OCR bounding coordinates.
      </div>
    </div>
  );
}
