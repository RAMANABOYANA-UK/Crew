"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center font-bold text-lg animate-bounce">
        C
      </div>
    </div>
  );
}
