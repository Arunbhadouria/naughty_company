import React from 'react';

const CatLogo = ({ size = 28, className = "" }) => {
  return (
    <div className={`cat-logo-wrapper ${className}`} style={{ 
      width: size, 
      height: size, 
      display: 'inline-flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      position: 'relative'
    }}>
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: 'drop-shadow(0 0 5px var(--primary))' }}
      >
        {/* Cat Ears */}
        <path d="M25 35L15 15L40 30" stroke="var(--primary)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M75 35L85 15L60 30" stroke="var(--primary)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
        
        {/* Cat Face/Body Silhouette */}
        <path d="M20 50C20 35 35 25 50 25C65 25 80 35 80 50C80 70 70 85 50 85C30 85 20 70 20 50Z" 
          stroke="var(--primary)" 
          strokeWidth="6" 
          fill="rgba(0, 209, 255, 0.1)"
        />
        
        {/* Eyes */}
        <circle cx="38" cy="48" r="5" fill="var(--primary)">
          <animate attributeName="ry" values="5;0.5;5" dur="3s" repeatCount="indefinite" />
        </circle>
        <circle cx="62" cy="48" r="5" fill="var(--primary)">
          <animate attributeName="ry" values="5;0.5;5" dur="3s" repeatCount="indefinite" />
        </circle>
        
        {/* Whiskers */}
        <path d="M15 55H5" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round"/>
        <path d="M15 62H5" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round"/>
        <path d="M85 55H95" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round"/>
        <path d="M85 62H95" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round"/>
      </svg>
      
      <style jsx>{`
        .cat-logo-wrapper {
          transition: var(--transition-smooth);
        }
        @media (max-width: 768px) {
          .cat-logo-wrapper {
            transform: scale(0.8);
          }
        }
      `}</style>
    </div>
  );
};

export default CatLogo;
