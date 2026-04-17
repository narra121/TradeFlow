import type { ReactNode } from 'react';

interface AuroraBackgroundProps {
  children: ReactNode;
}

export function AuroraBackground({ children }: AuroraBackgroundProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Aurora blobs */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        {/* Teal blob - top left */}
        <div
          className="absolute -top-24 -left-24 h-[400px] w-[400px] rounded-full opacity-[0.25]"
          style={{
            background: 'radial-gradient(circle, hsl(160 84% 39%) 0%, transparent 70%)',
            filter: 'blur(120px)',
            animation: 'aurora-drift-1 45s ease-in-out infinite',
            willChange: 'transform',
          }}
        />

        {/* Purple blob - top right */}
        <div
          className="absolute -top-16 -right-32 h-[350px] w-[350px] rounded-full opacity-[0.20]"
          style={{
            background: 'radial-gradient(circle, hsl(265 89% 62%) 0%, transparent 70%)',
            filter: 'blur(120px)',
            animation: 'aurora-drift-2 55s ease-in-out infinite',
            willChange: 'transform',
          }}
        />

        {/* Blue blob - center bottom */}
        <div
          className="absolute -bottom-20 left-1/3 h-[350px] w-[350px] rounded-full opacity-[0.18]"
          style={{
            background: 'radial-gradient(circle, hsl(200 95% 50%) 0%, transparent 70%)',
            filter: 'blur(130px)',
            animation: 'aurora-drift-3 60s ease-in-out infinite',
            willChange: 'transform',
          }}
        />

        {/* Teal-purple blend - center */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[300px] w-[500px] rounded-full opacity-[0.10]"
          style={{
            background: 'radial-gradient(ellipse, hsl(170 80% 45%) 0%, hsl(265 89% 62% / 0.5) 50%, transparent 70%)',
            filter: 'blur(100px)',
            animation: 'aurora-drift-1 70s ease-in-out infinite reverse',
            willChange: 'transform',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
