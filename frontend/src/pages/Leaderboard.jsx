import { useEffect, useState } from "react";
import { getLeaderboard } from "../lib/api";
import { Trophy, Loader2 } from "lucide-react";

const MODES = [
  { id: "flash", label: "Flash", color: "#FFB8D1" },
  { id: "speed", label: "Speed Read", color: "#A8E6CF" },
  { id: "match", label: "Match", color: "#FFD3B6" },
  { id: "code", label: "Speed Code", color: "#C9B6FF" },
];

export default function Leaderboard() {
  const [mode, setMode] = useState("flash");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true); setErr("");
      try {
        const r = await getLeaderboard(mode, 20);
        if (active) setRows(r);
      } catch (e) {
        if (active) setErr(e?.message || "Failed to load");
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [mode]);

  return (
    <div data-testid="leaderboard-page" className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-10 py-10">
      <div className="mb-6">
        <span className="nb-badge bg-[#FFD3B6]"><Trophy size={12} strokeWidth={3}/> Leaderboard</span>
        <h1 className="font-display font-black text-3xl sm:text-4xl mt-2">Top players this season</h1>
        <p className="text-[#3a3a3a]">Best score per mode. Log in to submit yours.</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {MODES.map((m) => (
          <button
            key={m.id}
            data-testid={`lb-tab-${m.id}`}
            onClick={() => setMode(m.id)}
            className={`nb-badge ${mode === m.id ? "bg-[#121212] text-white" : "bg-white"}`}
            style={mode === m.id ? {} : { background: m.color }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2"><Loader2 className="animate-spin" size={18}/> Loading…</div>
      ) : err ? (
        <div className="nb-card p-5 bg-[#FFB8D1]">{err}</div>
      ) : rows.length === 0 ? (
        <div className="nb-card p-5 bg-white">No scores yet — be the first!</div>
      ) : (
        <div className="nb-card p-3 bg-white divide-y divide-[#121212]/15">
          {rows.map((r, i) => (
            <div key={`${r.user_id}-${i}`} className="flex items-center gap-3 p-3" data-testid={`lb-row-${i}`}>
              <div className="font-display font-black text-2xl w-9 text-center">{i + 1}</div>
              {r.picture
                ? <img src={r.picture} alt="" className="w-9 h-9 rounded-md nb-border object-cover"/>
                : <div className="w-9 h-9 rounded-md nb-border bg-[#A8E6CF] flex items-center justify-center font-display font-black">{(r.name || "?")[0].toUpperCase()}</div>}
              <div className="flex-1">
                <div className="font-bold">{r.name || "Player"}</div>
                <div className="text-xs text-[#555]">{new Date(r.at).toLocaleString()}</div>
              </div>
              <div className="font-display font-black text-xl">{Math.round(r.score)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
