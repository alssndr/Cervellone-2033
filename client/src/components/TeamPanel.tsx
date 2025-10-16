import { AXES, AXIS_LABELS_IT, type AxisKey } from "@shared/schema";

interface TeamPanelProps {
  teamLabel: string;
  axisMeans: Record<string, number>;
}

export default function TeamPanel({ teamLabel, axisMeans }: TeamPanelProps) {
  return (
    <div className="rounded-xl border border-card-border bg-card p-6" data-testid={`panel-${teamLabel.toLowerCase().replace(/\s/g, '-')}`}>
      <h3 className="text-lg font-semibold mb-4">{teamLabel}</h3>
      <div className="space-y-3">
        {AXES.map((axis) => {
          const value = axisMeans[axis] || 0;
          const percentage = (value / 5) * 100;
          
          return (
            <div key={axis} data-testid={`stat-${axis}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-muted-foreground">{AXIS_LABELS_IT[axis]}</span>
                <span className="text-sm font-medium">{value.toFixed(1)}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
