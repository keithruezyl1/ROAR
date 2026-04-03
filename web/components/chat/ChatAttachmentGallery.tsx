'use client';

import * as React from 'react';

import { customerApi } from '@/lib/api';
import type { ProofAttachment } from '@/types';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('roar_token');
}

export function ChatAttachmentGallery({
  caseId,
  attachments,
  alignRight = false,
}: {
  caseId: string;
  attachments: ProofAttachment[];
  alignRight?: boolean;
}) {
  const [previews, setPreviews] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    let active = true;
    const token = getToken();
    const urls: string[] = [];

    const load = async () => {
      const entries = await Promise.all(
        attachments.map(async (attachment) => {
          try {
            const response = await fetch(customerApi.getProofUrl(caseId, attachment.proof_upload_id), {
              headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
            if (!response.ok) return null;
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            urls.push(url);
            return [attachment.proof_upload_id, url] as const;
          } catch {
            return null;
          }
        })
      );

      if (!active) return;
      setPreviews(
        entries
          .filter((entry): entry is readonly [string, string] => Boolean(entry))
          .reduce<Record<string, string>>((acc, [id, url]) => {
            acc[id] = url;
            return acc;
          }, {})
      );
    };

    void load();
    return () => {
      active = false;
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [attachments, caseId]);

  if (attachments.length === 0) return null;

  return (
    <div className={`mt-3 flex flex-wrap gap-2 ${alignRight ? 'justify-end' : 'justify-start'}`}>
      {attachments.map((attachment) => {
        const preview = previews[attachment.proof_upload_id];
        return (
          <div key={attachment.proof_upload_id} className="w-[148px] overflow-hidden rounded-[18px] border border-border-default bg-bg-base shadow-[0_6px_24px_rgba(0,0,0,0.08)]">
            <div className="relative h-[112px] bg-bg-sunken">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt={attachment.filename} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-[11px] text-text-muted">Loading preview...</div>
              )}
            </div>
            <div className="px-3 py-2">
              <div className="truncate text-[12px] font-medium text-text-primary">{attachment.filename}</div>
              <div className="mt-1 text-[11px] text-text-muted">
                {attachment.image_width && attachment.image_height ? `${attachment.image_width}x${attachment.image_height}` : 'Image'}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
