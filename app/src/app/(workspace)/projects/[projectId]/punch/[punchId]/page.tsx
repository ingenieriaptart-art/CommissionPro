import { PunchDetail } from "@/components/punch/PunchDetail";

interface Props { params: Promise<{ projectId: string; punchId: string }> }

export default async function PunchDetailPage({ params }: Props) {
  const { projectId, punchId } = await params;
  return <PunchDetail projectId={projectId} punchId={punchId} />;
}
