import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import OrderChatRoom from "./OrderChatRoom";

export default function OrderChatButton({ orderId, label = "Mesaj" }: { orderId: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const openChat = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_or_create_order_chat", { _order_id: orderId });
      if (error) {
        toast.error("Sohbet açılamadı");
        return;
      }
      setRoomId(data as unknown as string);
      setOpen(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); openChat(); }}
        disabled={loading}
        className="flex items-center gap-1 px-2 py-1 bg-primary/80 text-primary-foreground text-[10px] font-mono rounded hover:bg-primary"
      >
        <MessageCircle className="w-3 h-3" /> {label}
      </button>
      {open && roomId && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-lg bg-card rounded-lg border border-border" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3 border-b border-border">
              <span className="text-xs font-mono text-foreground">Sipariş Sohbeti</span>
              <button onClick={() => setOpen(false)}><X className="w-4 h-4" /></button>
            </div>
            <div className="p-3"><OrderChatRoom roomId={roomId} /></div>
          </div>
        </div>
      )}
    </>
  );
}
