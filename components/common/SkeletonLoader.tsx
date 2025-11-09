import React from 'react';

interface SkeletonLoaderProps {
  lines: number;
  className?: string;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ lines, className = '' }) => {
  return (
    <div className={`space-y-3 animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 bg-secondary/20 rounded-md" style={{ width: `${Math.random() * 40 + 60}%` }}></div>
      ))}
    </div>
  );
};

export default SkeletonLoader;
