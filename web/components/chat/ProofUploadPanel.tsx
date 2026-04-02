'use client';

import * as React from 'react';

import { Button } from '@/components/shared/Button';
import { BUSINESS_RULES } from '@/lib/constants';
import type { CaseProofUpload } from '@/types';

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function ProofUploadPanel({
  selectedFiles,
  uploads,
  uploading,
  error,
  onSelect,
  onRemoveSelected,
  onDeleteExisting,
  onUpload,
  title = 'Upload proof',
  description = 'Upload up to 2 images to support your case.',
  showUploadAction = true,
}: {
  selectedFiles: File[];
  uploads?: CaseProofUpload[];
  uploading?: boolean;
  error?: string | null;
  onSelect: (files: File[]) => void;
  onRemoveSelected: (index: number) => void;
  onDeleteExisting?: (proofId: string) => void | Promise<void>;
  onUpload: () => void | Promise<void>;
  title?: string;
  description?: string;
  showUploadAction?: boolean;
}) {
  const totalCount = (uploads?.length ?? 0) + selectedFiles.length;
  const canSelectMore = totalCount < BUSINESS_RULES.MAX_PROOF_UPLOADS;

  return (
    <div className="rounded-card border border-border-default bg-bg-elevated p-4">
      <div className="text-[14px] font-semibold text-text-primary">{title}</div>
      <div className="mt-1 text-[13px] text-text-secondary">{description}</div>

      {canSelectMore ? (
        <label className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-btn border border-dashed border-border-strong bg-bg-sunken px-4 py-5 text-center transition-colors hover:bg-bg-base">
          <span className="text-[13px] font-medium text-text-primary">Choose image files</span>
          <span className="mt-1 text-[12px] text-text-muted">JPEG, PNG, or WEBP. Up to {BUSINESS_RULES.MAX_PROOF_UPLOADS} images total.</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              onSelect(files);
              event.currentTarget.value = '';
            }}
          />
        </label>
      ) : null}

      {uploads?.length ? (
        <div className="mt-3 space-y-2">
          {uploads.map((upload) => (
            <div key={upload.id} className="flex items-center justify-between rounded-btn bg-bg-sunken px-3 py-2">
              <div>
                <div className="text-[13px] font-medium text-text-primary">{upload.filename}</div>
                <div className="text-[11px] text-text-muted">
                  {formatBytes(upload.byte_size)}
                  {upload.image_width && upload.image_height ? ` • ${upload.image_width}x${upload.image_height}` : ''}
                </div>
              </div>
              {onDeleteExisting ? (
                <Button size="sm" variant="ghost" onClick={() => void onDeleteExisting(upload.id)}>
                  Remove
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {selectedFiles.length ? (
        <div className="mt-3 space-y-2">
          {selectedFiles.map((file, index) => (
            <div key={`${file.name}-${index}`} className="flex items-center justify-between rounded-btn bg-primary-subtle px-3 py-2">
              <div>
                <div className="text-[13px] font-medium text-text-primary">{file.name}</div>
                <div className="text-[11px] text-text-muted">{formatBytes(file.size)}</div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => onRemoveSelected(index)}>
                Remove
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      {error ? <div className="mt-3 text-[12px] text-danger">{error}</div> : null}

      {showUploadAction ? (
        <div className="mt-3 flex justify-end">
          <Button onClick={() => void onUpload()} disabled={uploading || selectedFiles.length === 0}>
            {uploading ? 'Uploading...' : 'Upload proof'}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
