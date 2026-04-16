import { Shield, ShieldAlert, ShieldCheck, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import './RiskCard.css';

const RiskCard = ({ result }) => {
  if (!result) return null;

  const { entity, risk_score, label, confidence, reason, signals } = result;

  const getLabelColor = () => {
    switch (label) {
      case 'HIGH RISK': return 'var(--accent)';
      case 'MEDIUM RISK': return '#FFB800';
      case 'LOW RISK': return 'var(--secondary)';
      default: return 'var(--on-surface-variant)';
    }
  };

  const getIcon = () => {
    switch (label) {
      case 'HIGH RISK': return <ShieldAlert size={48} />;
      case 'MEDIUM RISK': return <AlertTriangle size={48} />;
      case 'LOW RISK': return <ShieldCheck size={48} />;
      default: return <Shield size={48} />;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="risk-card-container glass-card"
      style={{ '--accent-color': getLabelColor() }}
    >
      <div className="risk-header">
        <div className="entity-info">
          <h2>{entity}</h2>
          <span className="confidence-tag">CONFIDENCE: {confidence}</span>
        </div>
        <div className="risk-badge" style={{ backgroundColor: getLabelColor() }}>
          {label}
        </div>
      </div>

      <div className="risk-content">
        <div className="score-section">
          <div className="score-circle-wrapper">
            <svg viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" className="circle-bg" />
              <motion.circle 
                cx="50" cy="50" r="45" 
                className="circle-fill"
                initial={{ strokeDasharray: "0 283" }}
                animate={{ strokeDasharray: `${(risk_score || 0) * 2.83} 283` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
            </svg>
            <div className="score-text">
              <span className="number">{risk_score !== null ? risk_score : '?'}</span>
              <span className="percent">%</span>
            </div>
          </div>
          <p className="reason-text">{reason}</p>
        </div>

        <div className="signals-section">
          <h3>INTELLIGENCE SIGNALS</h3>
          <div className="signals-list">
            {signals.map((signal, index) => (
              <div key={index} className="signal-item">
                <div className="signal-dot" style={{ backgroundColor: signal.scam > signal.legit ? 'var(--accent)' : 'var(--secondary)' }} />
                <div className="signal-details">
                  <a href={signal.link} target="_blank" rel="noopener noreferrer" className="signal-title">
                    {signal.title}
                  </a>
                  <span className="signal-source">{signal.source}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default RiskCard;
