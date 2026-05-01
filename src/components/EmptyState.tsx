import { ReactNode } from "react";
import { Inbox } from "lucide-react";

interface Props {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export default function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mb-4 text-muted-foreground">
        {icon || <Inbox className="w-8 h-8" />}
      </div>
      <h3 className="text-sm font-mono font-bold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-xs font-mono text-muted-foreground max-w-sm mb-4">{description}</p>
      )}
      {action}
    </div>
  );
}
