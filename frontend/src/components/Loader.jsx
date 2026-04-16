import React from 'react';
import CatLogo from './CatLogo';
import './Loader.css';

const Loader = ({ fadeOut }) => {
  return (
    <div className={`loader-overlay ${fadeOut ? 'fade-out' : ''}`}>
      <div className="cat-container">
        <div className="laser-dot"></div>
        <div className="cyber-cat-wrapper">
          <CatLogo size={80} />
          <div className="cat-paw"></div>
        </div>
      </div>
      
      <div className="loading-text">
        Initializing Naughty Protocol...
      </div>
      
      <div className="loading-bar-container">
        <div className="loading-bar-progress"></div>
      </div>
    </div>
  );
};

export default Loader;
