import type { ReactNode } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

type Props = {
  children: ReactNode;
};

export default function AppLayout({ children }: Props) {
  return (
    <div className="relative flex min-h-screen bg-[#0b101b] text-white overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-[#b78deb]/30 blur-[140px]" />
        <div className="absolute right-0 top-10 h-72 w-72 rounded-full bg-[#17223e]/60 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-[#0b101b] blur-[140px]" />
      </div>
      <Sidebar />
      <div className="fixed inset-y-0 left-64 right-0 z-20 pointer-events-none">
        <TopBar />
      </div>
      <main className="relative ml-64 flex-1 pt-14">
        <div className="mx-auto max-w-6xl space-y-10 px-8 py-10 lg:px-12">
          {children}
        </div>
      </main>
    </div>
  );
}
