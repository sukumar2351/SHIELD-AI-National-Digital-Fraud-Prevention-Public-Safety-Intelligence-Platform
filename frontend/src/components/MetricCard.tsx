import React from 'react';
import { TrendingUp, TrendingDown, LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  trend?: string | number;
  trendDirection?: 'up' | 'down' | 'neutral';
  icon: LucideIcon;
  color?: 'blue' | 'red' | 'green' | 'amber';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  trend,
  trendDirection = 'neutral',
  icon: Icon,
  color = 'blue'
}) => {
  const colorClasses = {
    blue: {
      border: 'border-blue-500/20 hover:border-blue-500/40',
      iconBg: 'bg-blue-500/10 text-blue-400',
      shadow: 'hover:shadow-[0_0_15px_rgba(59,130,246,0.1)]',
    },
    red: {
      border: 'border-red-500/20 hover:border-red-500/40',
      iconBg: 'bg-red-500/10 text-red-400',
      shadow: 'hover:shadow-[0_0_15px_rgba(239,68,68,0.1)]',
    },
    green: {
      border: 'border-green-500/20 hover:border-green-500/40',
      iconBg: 'bg-green-500/10 text-green-400',
      shadow: 'hover:shadow-[0_0_15px_rgba(34,197,94,0.1)]',
    },
    amber: {
      border: 'border-amber-500/20 hover:border-amber-500/40',
      iconBg: 'bg-amber-500/10 text-amber-400',
      shadow: 'hover:shadow-[0_0_15px_rgba(245,158,11,0.1)]',
    }
  };

  const selectedColor = colorClasses[color];

  return (
    <div className={`p-6 rounded-xl bg-gray-950/40 backdrop-blur-md border ${selectedColor.border} transition-all duration-300 ${selectedColor.shadow}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-mono text-gray-400 uppercase tracking-widest">{label}</p>
          <h3 className="text-2xl font-bold text-white mt-2 font-mono tracking-tight">{value}</h3>
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${selectedColor.iconBg}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      
      {trend && (
        <div className="mt-4 flex items-center gap-1.5">
          {trendDirection === 'up' && (
            <TrendingUp className="w-3.5 h-3.5 text-green-400" />
          )}
          {trendDirection === 'down' && (
            <TrendingDown className="w-3.5 h-3.5 text-red-400" />
          )}
          <span className={`text-xs font-mono ${
            trendDirection === 'up' 
              ? 'text-green-400' 
              : trendDirection === 'down' 
                ? 'text-red-400' 
                : 'text-gray-400'
          }`}>
            {trend}
          </span>
        </div>
      )}
    </div>
  );
};
