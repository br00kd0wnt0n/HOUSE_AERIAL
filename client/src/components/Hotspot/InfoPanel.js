import React from 'react';
import './InfoPanel.css';

const InfoPanel = ({ hotspot, onClose }) => {
  return (
    <div className="info-panel">
      <button className="close-button" onClick={onClose}>&times;</button>
      <div className="info-content">
        <h3 className="info-title">{hotspot.name}</h3>
        <p className="info-description">{hotspot.description}</p>
      </div>
    </div>
  );
};

export default InfoPanel;