import React from 'react';

const CrabIcon = ({ className = "w-10 h-10", ...props }) => {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className} 
      {...props}
    >
      {/* Body */}
      <path 
        d="M3 13C3 10.2386 7.02944 8 12 8C16.9706 8 21 10.2386 21 13C21 15.7614 16.9706 18 12 18C7.02944 18 3 15.7614 3 13Z" 
        fill="currentColor" 
      />
      
      {/* Pincers L */}
      <path 
        d="M6 8.5C6 8.5 3 7 3 4C3 2 5 2 7 4C8 5 8.5 7.5 8 8.5" 
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" 
      />
      
      {/* Pincers R */}
      <path 
        d="M18 8.5C18 8.5 21 7 21 4C21 2 19 2 17 4C16 5 15.5 7.5 16 8.5" 
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" 
      />
      
      {/* Eyes */}
      <circle cx="10.5" cy="6" r="1.5" fill="currentColor" />
      <circle cx="13.5" cy="6" r="1.5" fill="currentColor" />
      
      {/* Legs L */}
      <path d="M4 14L1 16M4 15.5L1.5 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      
      {/* Legs R */}
      <path d="M20 14L23 16M20 15.5L22.5 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
};

export default CrabIcon;
