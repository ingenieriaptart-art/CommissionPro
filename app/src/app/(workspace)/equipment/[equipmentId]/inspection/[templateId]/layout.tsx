export default function InspectionLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen overflow-hidden bg-slate-950 flex flex-col">
      {children}
    </div>
  );
}
