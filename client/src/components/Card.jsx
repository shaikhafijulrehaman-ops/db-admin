import React from 'react';

const Card = ({ title, value, icon: Icon, color }) => {
  // Map standard colors to modern, soft pastel styles
  const getColorStyles = () => {
    switch (color) {
      case 'primary':
        return { bg: 'rgba(79, 70, 229, 0.08)', text: 'var(--primary)', border: 'rgba(79, 70, 229, 0.15)' };
      case 'success':
        return { bg: 'rgba(16, 185, 129, 0.08)', text: 'var(--success)', border: 'rgba(16, 185, 129, 0.15)' };
      case 'warning':
        return { bg: 'rgba(245, 158, 11, 0.08)', text: 'var(--warning)', border: 'rgba(245, 158, 11, 0.15)' };
      case 'danger':
        return { bg: 'rgba(239, 68, 68, 0.08)', text: 'var(--danger)', border: 'rgba(239, 68, 68, 0.15)' };
      case 'info':
        return { bg: 'rgba(6, 182, 212, 0.08)', text: 'var(--info)', border: 'rgba(6, 182, 212, 0.15)' };
      default:
        return { bg: 'rgba(100, 116, 139, 0.08)', text: 'var(--text-muted)', border: 'rgba(100, 116, 139, 0.15)' };
    }
  };

  const style = getColorStyles();

  return (
    <div 
      className="card"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1.5rem',
        borderLeft: `4px solid ${style.text}`
      }}
    >
      <div>
        <span 
          style={{
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontWeight: 600,
            display: 'block',
            marginBottom: '0.5rem'
          }}
        >
          {title}
        </span>
        <h3 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, lineHeight: 1.1 }}>
          {value}
        </h3>
      </div>

      {Icon && (
        <div 
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '10px',
            backgroundColor: style.bg,
            color: style.text,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `1px solid ${style.border}`
          }}
        >
          <Icon size={22} />
        </div>
      )}
    </div>
  );
};

export default Card;
