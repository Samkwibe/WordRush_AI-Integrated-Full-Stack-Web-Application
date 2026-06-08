import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { completeGoogle } = useAuth();
  const hasProcessed = useRef(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;
    (async () => {
      const hash = window.location.hash || "";
      const m = hash.match(/session_id=([^&]+)/);
      if (!m) {
        setErr("Missing session id");
        return;
      }
      try {
        await completeGoogle(decodeURIComponent(m[1]));
        // clear fragment
        window.history.replaceState({}, "", window.location.pathname);
        navigate("/", { replace: true });
      } catch (e) {
        setErr(e?.response?.data?.detail || "Could not complete sign-in.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div data-testid="auth-callback" className="max-w-md mx-auto px-4 py-20 text-center">
      <div className="nb-card p-8 bg-[#A8E6CF]">
        {!err ? (
          <>
            <Loader2 className="mx-auto animate-spin" size={32} strokeWidth={2.5}/>
            <div className="font-display font-black text-xl mt-3">Signing you in…</div>
          </>
        ) : (
          <>
            <div className="font-display font-black text-xl">Sign-in failed</div>
            <div className="text-sm mt-2">{err}</div>
            <button onClick={() => navigate("/login")} className="nb-btn mt-5">Try again</button>
          </>
        )}
      </div>
    </div>
  );
}
