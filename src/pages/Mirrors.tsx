import { useEffect, useState } from "react";
import PageShell from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/authContext";
import { Globe, ShieldCheck, AlertTriangle, Plus, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";

type Mirror = {
  id: string;
  url: string;
  label: string | null;
  is_canary: boolean;
  signature: string | null;
  last_checked_at: string | null;
};

export default function Mirrors() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const [mirrors, setMirrors] = useState<Mirror[]>([]);
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [signature, setSignature] = useState("");
  const [isCanary, setIsCanary] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("mirrors")
      .select("*")
      .order("is_canary", { ascending: false })
      .order("created_at", { ascending: false });
    setMirrors((data ?? []) as Mirror[]);
  };

  useEffect(() => {
    load();
  }, []);

  const add = async () => {
    if (!url.trim()) return;
    const { error } = await supabase.from("mirrors").insert({
      url: url.trim(),
      label: label.trim() || null,
      signature: signature.trim() || null,
      is_canary: isCanary,
    });
    if (error) return toast.error(error.message);
    toast.success("Eklendi");
    setUrl("");
    setLabel("");
    setSignature("");
    setIsCanary(false);
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("mirrors").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <PageShell>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-mono font-bold text-primary neon-text flex items-center gap-2">
            <Globe className="w-5 h-5" /> MIRRORS & CANARY
          </h1>
          <p className="text-xs font-mono text-muted-foreground mt-1">
            Resmi .onion adresleri ve canary mesajları. Phishing'e karşı her zaman bu listeyi
            doğrula.
          </p>
        </div>

        <div className="glass-card rounded-lg p-4 border-l-2 border-l-yellow-500 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
          <p className="text-xs font-mono text-yellow-500/90 leading-relaxed">
            <strong>UYARI:</strong> Canary mesajı 7 günden eski ise (veya hiç güncellenmiyorsa)
            siteyi kullanma — operatörler ele geçirilmiş olabilir.
          </p>
        </div>

        <div className="space-y-2">
          {mirrors.length === 0 && (
            <div className="glass-card rounded-lg p-6 text-center text-xs font-mono text-muted-foreground">
              Henüz mirror eklenmemiş.
            </div>
          )}
          {mirrors.map((m) => (
            <div
              key={m.id}
              className={`glass-card rounded-lg p-4 ${
                m.is_canary ? "border-l-2 border-l-green-500" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {m.is_canary && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 bg-green-500/20 text-green-500 rounded">
                        CANARY
                      </span>
                    )}
                    {m.label && (
                      <span className="text-xs font-mono text-foreground">{m.label}</span>
                    )}
                  </div>
                  <code className="text-[11px] font-mono text-primary break-all block">
                    {m.url}
                  </code>
                  {m.signature && (
                    <details className="mt-2">
                      <summary className="text-[10px] font-mono text-muted-foreground cursor-pointer">
                        PGP imza
                      </summary>
                      <pre className="text-[9px] font-mono text-muted-foreground bg-secondary/30 rounded p-2 mt-1 overflow-x-auto whitespace-pre-wrap break-all">
                        {m.signature}
                      </pre>
                    </details>
                  )}
                  {m.last_checked_at && (
                    <p className="text-[9px] font-mono text-muted-foreground mt-1">
                      Son güncelleme: {new Date(m.last_checked_at).toLocaleString("tr-TR")}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(m.url);
                      toast.success("Kopyalandı");
                    }}
                    className="text-muted-foreground hover:text-foreground p-1"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => remove(m.id)}
                      className="text-muted-foreground hover:text-destructive p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {isAdmin && (
          <div className="glass-card rounded-lg p-4 space-y-3">
            <h2 className="text-sm font-bold font-mono text-foreground flex items-center gap-2">
              <Plus className="w-4 h-4" /> Yeni mirror / canary ekle
            </h2>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="http://xxxxx.onion"
              className="w-full bg-secondary border border-border rounded px-3 py-2 text-xs font-mono"
            />
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Etiket (ör: Ana ayna)"
              className="w-full bg-secondary border border-border rounded px-3 py-2 text-xs font-mono"
            />
            <textarea
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder="PGP imzalı canary mesajı (opsiyonel)"
              rows={4}
              className="w-full bg-secondary border border-border rounded px-3 py-2 text-xs font-mono"
            />
            <label className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
              <input
                type="checkbox"
                checked={isCanary}
                onChange={(e) => setIsCanary(e.target.checked)}
              />
              Bu bir canary mesajıdır
            </label>
            <button
              onClick={add}
              className="w-full bg-primary text-primary-foreground py-2 rounded font-mono text-xs font-bold hover:opacity-90"
            >
              EKLE
            </button>
          </div>
        )}
      </div>
    </PageShell>
  );
}
