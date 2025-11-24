// components/LoadingSpinner.tsx
import React from "react";
import "./LoadingSpinner.css";

interface LoadingSpinnerProps {
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ className = "" }) => {
  return (
    <div
      className={`spinner-inline flex items-center justify-center ${className}`}
    >
      <div className="dot-spinner">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className={`dot dot${i + 1}`}></div>
        ))}
      </div>
      <div className="loading-text">
        <span>Loading</span>
        <span>.</span>
        <span>.</span>
        <span>.</span>
      </div>
    </div>
  );
};

export default LoadingSpinner;
