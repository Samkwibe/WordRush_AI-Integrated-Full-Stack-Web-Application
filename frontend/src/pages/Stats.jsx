import { useEffect, useState } from "react";
import { getStats, clearStats } from "../lib/storage";
import { cloudGetStats, cloudPutStats } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { ACHIEVEMENTS } from "../lib/achievements";
import { BarChart3, Trophy, Zap, BookOpen, Layers, Code2, Trash2, Flame, RefreshCcw, CloudUpload, Cloud } from "lucide-react";

const MODE_META = {
  flash: { label: "Flash", color: "#FFB8D1", icon: Zap },
  speed: { label: "Speed", color: "#A8E6CF", icon: BookOpen },
  match: { label: "Match", color: "#FFD3B6", icon: Layers },
  code:  { label: "Code",  color: "#C9B6FF", icon: Code2 },
};

export default function Stats() {
  const { user } = useAuth();
  const [stats, setStats] = useState(() => getStats());
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");

  useEffect(() => {
    if (!user) return;
    cloudGetStats()
      .then((s) => { if (s && (s.totalSessions ?? 0) > (stats.totalSessions ?? 0)) setStats(s); })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const flashAcc = stats.flash.total ? Math.round((stats.flash.correct / stats.flash.total) * 100) : 0;
  const speedAcc = stats.speed.total ? Math.round((stats.speed.correct / stats.speed.total) * 100) : 0;

  const syncUp = async () => {
    if (!user) return;
    setSyncing(true); setSyncMsg("");
    try { await cloudPutStats(stats); setSyncMsg("Synced to cloud!"); }
    catch { setSyncMsg("Sync failed."); }
    finally { setSyncing(false); }
  };
  const syncDown = async () => {
    if (!user) return;
    setSyncing(true); setSyncMsg("");
    try { const s = await cloudGetStats(); setStats(s); setSyncMsg("Pulled from cloud."); }
    catch { setSyncMsg("Pull failed."); }
    finally { setSyncing(false); }
  };

  const earned = new Set(stats.achievements || []);

  return (
    <div data-testid="stats-page" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-10 py-10 space-y-8">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <span className="nb-badge bg-[#C9B6FF]"><BarChart3 size={12} strokeWidth={3}/> Stats</span>
          <h1 className="font-display font-black text-3xl sm:text-4xl mt-2">Your progress</h1>
          <p className="text-[var(--muted)]">{user ? "Cloud sync available." : "Saved locally on this device."}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {user && (
            <>
              <button data-testid="stats-sync-up" onClick={syncUp} disabled={syncing} className="nb-btn nb-btn-secondary"><CloudUpload size={16} strokeWidth={3}/> Sync up</button>
              <button data-testid="stats-sync-down" onClick={syncDown} disabled={syncing} className="nb-btn nb-btn-ghost"><Cloud size={16} strokeWidth={3}/> Pull</button>
            </>
          )}
          <button data-testid="stats-clear-btn" onClick={() => { clearStats(); setStats(getStats()); }} className="nb-btn nb-btn-ghost">
            <Trash2 size={16} strokeWidth={3}/> Reset
          </button>
        </div>
      </div>
      {syncMsg && <div className="nb-badge bg-[#A8E6CF]" data-testid="sync-msg">{syncMsg}</div>}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="nb-card p-5 bg-[#FFF7DC]">
          <div className="label-cap">Sessions</div>
          <div className="font-display font-black text-4xl mt-1">{stats.totalSessions}</div>
        </div>
        <div className="nb-card p-5 bg-[#FFB8D1] text-[#121212]">
          <div className="label-cap" style={{ color: "#3a3a3a" }}>Flash best</div>
          <div className="font-display font-black text-4xl mt-1">{stats.flash.best}%</div>
        </div>
        <div className="nb-card p-5 bg-[#A8E6CF] text-[#121212]">
          <div className="label-cap" style={{ color: "#3a3a3a" }}>Top WPM</div>
          <div className="font-display font-black text-4xl mt-1">{stats.speed.bestWpm || 0}</div>
        </div>
        <div className="nb-card p-5 bg-[#C9B6FF] text-[#121212]">
          <div className="label-cap" style={{ color: "#3a3a3a" }}>Code top WPM</div>
          <div className="font-display font-black text-4xl mt-1">{stats.code?.bestWpm || 0}</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="nb-card p-5">
          <div className="flex items-center gap-2 mb-1"><Flame size={20} strokeWidth={3} className="text-[#FF6FA3]"/><span className="font-display font-black">Streak</span></div>
          <div className="text-sm">Current <b>{stats.streak?.current ?? 0}d</b> · Longest <b>{stats.streak?.longest ?? 0}d</b></div>
          <div className="mt-3 flex gap-1">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className={`h-3 flex-1 rounded-sm border-2 border-[var(--ink)] ${i < (stats.streak?.current || 0) ? "bg-[#FFB8D1]" : "bg-[var(--surface)]"}`}/>
            ))}
          </div>
        </div>
        <div className="nb-card p-5">
          <div className="flex items-center gap-2 mb-1"><RefreshCcw strokeWidth={3} size={18}/><span className="font-display font-black">Accuracy</span></div>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div>
              <div className="text-sm">Flash recall · {flashAcc}%</div>
              <div className="h-2 nb-border rounded-full bg-[var(--surface)] overflow-hidden mt-1"><div className="h-full bg-[#FFB8D1]" style={{ width: `${flashAcc}%` }}/></div>
            </div>
            <div>
              <div className="text-sm">Speed quiz · {speedAcc}%</div>
              <div className="h-2 nb-border rounded-full bg-[var(--surface)] overflow-hidden mt-1"><div className="h-full bg-[#A8E6CF]" style={{ width: `${speedAcc}%` }}/></div>
            </div>
          </div>
        </div>
      </div>

      <div className="nb-card p-5">
        <div className="flex items-center gap-2 mb-3"><Trophy strokeWidth={3} size={20}/><span className="font-display font-black text-xl">Achievements</span></div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ACHIEVEMENTS.map((a) => {
            const got = earned.has(a.id);
            return (
              <div key={a.id} data-testid={`ach-${a.id}`} className={`nb-border rounded-xl p-3 flex items-start gap-3 ${got ? "bg-[#A8E6CF]" : "bg-[var(--soft)] opacity-70"}`}>
                <div className="text-3xl">{a.icon}</div>
                <div>
                  <div className="font-display font-black">{a.name}</div>
                  <div className="text-xs">{a.desc}</div>
                  <div className="text-[10px] font-bold mt-1 uppercase tracking-wider">{got ? "Earned" : "Locked"}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="nb-card p-5">
        <div className="flex items-center gap-2 mb-3"><Trophy strokeWidth={3} size={20}/><span className="font-display font-black text-xl">Recent sessions</span></div>
        {stats.history.length === 0 ? (
          <div className="text-sm text-[var(--muted)]">Play a round and your history will show here.</div>
        ) : (
          <div className="divide-y divide-[var(--ink)]/15">
            {stats.history.map((h, i) => {
              const m = MODE_META[h.mode] || MODE_META.flash;
              const Icon = m.icon;
              return (
                <div key={i} className="flex items-center gap-3 py-2" data-testid={`history-${i}`}>
                  <div className="w-9 h-9 rounded-md nb-border flex items-center justify-center" style={{ background: m.color }}>
                    <Icon size={16} strokeWidth={3}/>
                  </div>
                  <div className="flex-1">
                    <div className="font-bold">{m.label}</div>
                    <div className="text-xs text-[var(--muted)]">{new Date(h.at).toLocaleString()}{h.language ? ` · ${h.language}` : ""}</div>
                  </div>
                  <div className="text-sm font-bold">
                    {h.mode === "match"
                      ? `${h.seconds}s · ${h.moves} moves`
                      : h.mode === "code"
                        ? `${h.wpm} wpm · ${h.accuracy}%`
                        : `${h.correct}/${h.total}${h.wpm ? ` · ${h.wpm} wpm` : ""}`}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
