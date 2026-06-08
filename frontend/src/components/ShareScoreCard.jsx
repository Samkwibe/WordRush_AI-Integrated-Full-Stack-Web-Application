import { useEffect, useRef } from "react";
import { Share2, Download } from "lucide-react";

// Renders a score "card" as a canvas image, allows download/share.
export default function ShareScoreCard({ open, onClose, title, primary, secondary, accentColor = "#FFB8D1", testId = "share-card" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => draw());
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, title, primary, secondary, accentColor]);

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = 800, H = 420;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");
    // bg
    ctx.fillStyle = "#FDFBF7"; ctx.fillRect(0, 0, W, H);
    // soft circles
    ctx.fillStyle = accentColor;
    ctx.beginPath(); ctx.arc(120, 80, 140, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#A8E6CF";
    ctx.beginPath(); ctx.arc(720, 360, 160, 0, Math.PI * 2); ctx.fill();
    // card
    ctx.fillStyle = "#FFFFFF";
    ctx.strokeStyle = "#121212"; ctx.lineWidth = 6;
    roundRect(ctx, 60, 60, W - 120, H - 120, 22, true, true);
    // shadow
    ctx.fillStyle = "#121212";
    roundRect(ctx, 70, 70, W - 120, H - 120, 22, true, false);
    ctx.fillStyle = "#FFFFFF";
    roundRect(ctx, 60, 60, W - 120, H - 120, 22, true, true);
    // text
    ctx.fillStyle = "#121212";
    ctx.font = "900 28px Outfit, sans-serif";
    ctx.fillText("WordRush", 100, 120);
    ctx.font = "700 18px DM Sans, sans-serif";
    ctx.fillStyle = "#444";
    ctx.fillText(title || "Session complete", 100, 150);

    ctx.fillStyle = "#121212";
    ctx.font = "900 64px Outfit, sans-serif";
    ctx.fillText(primary || "—", 100, 240);
    ctx.font = "700 22px DM Sans, sans-serif";
    ctx.fillStyle = "#333";
    ctx.fillText(secondary || "", 100, 280);

    ctx.font = "800 16px Outfit, sans-serif";
    ctx.fillStyle = "#121212";
    ctx.fillText("READ FASTER. REMEMBER MORE.", 100, H - 100);
  };

  function roundRect(ctx, x, y, w, h, r, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  if (!open) return null;

  const download = () => {
    const url = canvasRef.current.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = "wordrush-score.png";
    a.click();
  };

  const share = async () => {
    try {
      const blob = await new Promise((res) => canvasRef.current.toBlob(res, "image/png"));
      if (navigator.share && blob) {
        const file = new File([blob], "wordrush-score.png", { type: "image/png" });
        await navigator.share({ files: [file], title: "WordRush", text: "I just leveled up on WordRush!" });
      } else {
        download();
      }
    } catch { /* user cancel */ }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" data-testid={testId} onClick={onClose}>
      <div className="nb-card p-5 bg-white max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-black text-xl">Share your score</h3>
          <button data-testid="share-close" onClick={onClose} className="nb-badge bg-[#FFB8D1]">Close</button>
        </div>
        <canvas ref={canvasRef} className="w-full nb-border rounded-lg"/>
        <div className="mt-4 flex gap-3">
          <button data-testid="share-download" onClick={download} className="nb-btn nb-btn-secondary"><Download size={16} strokeWidth={3}/> Download PNG</button>
          <button data-testid="share-share" onClick={share} className="nb-btn"><Share2 size={16} strokeWidth={3}/> Share</button>
        </div>
      </div>
    </div>
  );
}
