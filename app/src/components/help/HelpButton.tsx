"use client";
import { useState } from "react";
import { HelpDrawer } from "./HelpDrawer";

export function HelpButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Ayuda"
        className="fixed bottom-6 right-6 z-30 w-12 h-12 bg-blue-600 hover:bg-blue-500 rounded-full shadow-lg flex items-center justify-center transition-colors text-2xl"
      >
        🤖
      </button>
      <HelpDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}
