import { PunchList } from "@/components/punch/PunchList";
import { PunchMetrics } from "@/components/punch/PunchMetrics";
import { PunchBoard } from "@/components/punch/PunchBoard";

interface Props { params: Promise<{ projectId: string }> }

export default async function PunchPage({ params }: Props) {
  const { projectId } = await params;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Punch List</h1>
        <p className="text-slate-500 text-sm mt-1">Gestión de no conformidades y observaciones</p>
      </div>
      <section className="space-y-4">
        <PunchMetrics projectId={projectId} />
        <PunchBoard projectId={projectId} />
      </section>
      <PunchList projectId={projectId} />
    </div>
  );
}
