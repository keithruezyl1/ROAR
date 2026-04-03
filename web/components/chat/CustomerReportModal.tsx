import * as React from 'react';
import { Modal } from '@/components/shared/Modal';
import { Button } from '@/components/shared/Button';
import type { CaseReport } from '@/types';

export function CustomerReportModal({
  report,
  open,
  onClose,
}: {
  report: CaseReport | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!report) return null;

  return (
    <Modal open={open} onClose={onClose} title="Conversation Summary Report" wide>
      <div className="flex flex-col gap-6">
        <div className="rounded-card border border-border-default bg-bg-surface p-5">
          <h3 className="text-[15px] font-semibold text-text-primary mb-3">Outcome Summary</h3>
          <p className="text-[15px] text-text-secondary whitespace-pre-wrap leading-relaxed">
            {report.outcome_summary || 'No summary provided.'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-card border border-border-default bg-bg-surface p-4 flex flex-col gap-1">
            <span className="text-[13px] text-text-muted">Issue Description</span>
            <span className="text-[15px] font-medium text-text-primary capitalize">{report.dispute_type || '-'}</span>
          </div>
          <div className="rounded-card border border-border-default bg-bg-surface p-4 flex flex-col gap-1">
            <span className="text-[13px] text-text-muted">Resolution Level</span>
            <span className="text-[15px] font-medium text-text-primary capitalize">
              {report.resolution_path ? report.resolution_path.replace(/_/g, ' ') : '-'}
            </span>
          </div>
          <div className="rounded-card border border-border-default bg-bg-surface p-4 flex flex-col gap-1">
            <span className="text-[13px] text-text-muted">Close Reason</span>
            <span className="text-[15px] font-medium text-text-primary capitalize">
              {report.close_reason || 'Resolved'}
            </span>
          </div>
          <div className="rounded-card border border-border-default bg-bg-surface p-4 flex flex-col gap-1">
            <span className="text-[13px] text-text-muted">Outcome</span>
            <span className="text-[15px] font-medium text-text-primary capitalize">
              {report.approval_outcome ? report.approval_outcome : 'Processed automatically'}
            </span>
          </div>
        </div>

        {report.resolution_actions && Object.keys(report.resolution_actions).length > 0 ? (
          <div className="rounded-card border border-success bg-success-bg p-5">
            <h3 className="text-[15px] font-semibold text-success mb-2">Resolution Details</h3>
            <ul className="text-[13px] text-success list-none flex flex-col gap-2">
              {Object.entries(report.resolution_actions).map(([key, value]) => (
                <li key={key} className="flex gap-2">
                  <span className="font-semibold capitalize text-success">{key.replace(/_/g, ' ')}:</span> 
                  <span>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex justify-end pt-2 border-t border-border-default">
          <Button variant="primary" onClick={onClose}>
            Close Report
          </Button>
        </div>
      </div>
    </Modal>
  );
}
