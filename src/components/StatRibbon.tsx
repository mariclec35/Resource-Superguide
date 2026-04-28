import React from 'react';
import { motion } from 'motion/react';

type StatRibbonProps = {
  stats: {
    resources: number;
    meetings: number;
    events: number;
  };
};

const ribbonItems = [
  { key: 'resources', label: 'local resources' },
  { key: 'meetings', label: 'meetings throughout Minnesota' },
  { key: 'events', label: 'events throughout Minnesota' },
] as const;

export default function StatRibbon({ stats }: StatRibbonProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="mb-10 flex flex-wrap items-center justify-center gap-x-4 gap-y-3 text-center"
    >
      {ribbonItems.map((item, index) => (
        <React.Fragment key={item.key}>
          <div className="flex items-center justify-center gap-2 text-sm sm:text-base">
            <span className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              {stats[item.key].toLocaleString()}
            </span>
            <span className="text-slate-500">
              {item.label}
            </span>
          </div>
          {index < ribbonItems.length - 1 && (
            <div
              aria-hidden="true"
              className="hidden h-4 border-r border-slate-200 sm:block"
            />
          )}
        </React.Fragment>
      ))}
    </motion.div>
  );
}
