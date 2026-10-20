"use client";
import { useEffect, useState, type ReactNode } from "react";

function probeWebGL2(): { ok: boolean; reason: string } {
  let reason = "";
  try {
    const canvas = document.createElement("canvas");
    canvas.addEventListener("webglcontextcreationerror", event => {
      reason = (event as WebGLContextEvent).statusMessage;
    });
    const gl = canvas.getContext("webgl2");
    if (gl) gl.getExtension("WEBGL_lose_context")?.loseContext();
    return { ok: !!gl, reason: reason || "Браузер не создал графический контекст WebGL 2." };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
}

export function WebGLGate({ children }: { children: ReactNode }) {
  const [result, setResult] = useState<ReturnType<typeof probeWebGL2> | null>(null);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- WebGL detection can only run in the browser
  useEffect(() => setResult(probeWebGL2()), []);
  if (result === null) return null;
  if (!result.ok) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-2">
          <h2 className="text-lg font-semibold">Не удалось запустить 3D</h2>
          <p className="text-sm text-neutral-600">
            Браузер не смог создать контекст WebGL 2. Это может быть ограничение
            браузера или сбой графической подсистемы. Подписи доступны без 3D.
          </p>
          <button className="rounded border px-3 py-2 text-sm" onClick={() => setResult(probeWebGL2())}>Повторить проверку 3D</button>
          <details className="text-left text-xs"><summary>Техническая причина</summary><p className="mt-2 break-words">{result.reason}</p></details>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
