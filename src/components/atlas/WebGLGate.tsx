"use client";
import { useEffect, useState, type ReactNode } from "react";

function hasWebGL2(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!canvas.getContext("webgl2");
  } catch {
    return false;
  }
}

export function WebGLGate({ children }: { children: ReactNode }) {
  const [ok, setOk] = useState<boolean | null>(null);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- WebGL detection can only run in the browser
  useEffect(() => setOk(hasWebGL2()), []);
  if (ok === null) return null;
  if (!ok) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-2">
          <h2 className="text-lg font-semibold">Браузер не поддерживает WebGL 2</h2>
          <p className="text-sm text-neutral-600">
            3D-атлас требует WebGL 2. Откройте сайт в свежем Chrome, Firefox, Safari или Edge.
            Карточки и прогресс работают без 3D.
          </p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
