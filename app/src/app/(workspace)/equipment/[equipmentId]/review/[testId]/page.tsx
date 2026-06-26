"use client";
import { useParams, useSearchParams } from "next/navigation";
import { ReviewInspection } from "@/components/inspection/review/ReviewInspection";

export default function ReviewInspectionPage() {
  const params = useParams() as { equipmentId: string; testId: string };
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") ?? undefined;

  return (
    <ReviewInspection
      equipmentId={params.equipmentId}
      testId={params.testId}
      returnTo={returnTo}
    />
  );
}
