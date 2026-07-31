import { DiagnosticRunner } from '@/components/diagnostic/DiagnosticRunner';

export default function DiagnosticRunPage({ params }: { params: { runId: string } }) {
  return <DiagnosticRunner runId={params.runId} />;
}
