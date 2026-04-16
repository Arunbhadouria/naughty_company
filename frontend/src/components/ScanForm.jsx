import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import './ScanForm.css';

const ScanForm = ({ onScan, isLoading }) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;
    onScan(query);
  };

  return (
    <div className="scan-form-container">
      <form onSubmit={handleSubmit} className="scan-form glass-card glow-primary">
        <div className="input-wrapper">
          <Search className="search-icon" size={20} />
          <input
            type="text"
            placeholder="Scan domain, company, or email..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isLoading}
          />
        </div>
        <button type="submit" className="btn-primary" disabled={isLoading || !query.trim()}>
          {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'INITIALIZE SCAN'}
        </button>
      </form>
      <p className="scan-hint">
        Enter a suspicious URL or entity name to begin a deep-noir risk analysis.
      </p>
    </div>
  );
};

export default ScanForm;
