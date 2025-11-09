import React from 'react';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, title, className = '' }) => {
  return (
    <div
      className={`bg-surface p-4 sm:p-6 rounded-xl border border-border shadow-card ${className}`}
    >
      {title && <h3 className="font-bold text-md text-primary mb-4">{title}</h3>}
      {children}
    </div>
  );
};

export default Card;