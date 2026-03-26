'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

export default function EscalationChatPage({ params }: { params: { caseId: string } }) {
  const router = useRouter();

  React.useEffect(() => {
    router.replace(`/escalation/${params.caseId}`);
  }, [params.caseId, router]);

  return null;
}
