import React from 'react';
import styles from './ScoopedCorner.module.css';

interface ScoopedCornerProps {
  /** The radius of the scooped-out corner, in pixels. */
  size?: number;
  /** The main color of the shape. */
  color?: string;
  /** Which corner to scoop out. */
  corner?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Additional CSS classes to apply. */
  className?: string;
}

/**
 * A component that renders a div with a "scooped" or "inverted" corner using a CSS mask.
 */
const ScoopedCorner: React.FC<ScoopedCornerProps> = ({
  size = 50,
  color = 'white',
  corner = 'bottom-right', // Default corner
  className = '',
}) => {
  const positionMap = {
    'top-left': 'top left',
    'top-right': 'top right',
    'bottom-left': 'bottom left',
    'bottom-right': 'bottom right',
  };

  const style = {
    '--scoop-size': `${size}px`,
    '--scoop-color': color,
    '--scoop-position': positionMap[corner],
  } as React.CSSProperties;

  return <div className={`${styles.scoop} ${className}`} style={style} />;
};

export default ScoopedCorner; 