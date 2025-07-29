import React from 'react';
import styles from './ScoopedCorner.module.css';

interface ScoopedCornerProps {
  /** The radius of the scooped-out corner, in pixels. */
  size?: number;
  /** The main color of the shape. */
  color?: string;
  /** Additional CSS classes to apply. */
  className?: string;
}

/**
 * A component that renders a div with a "scooped" or "inverted" top-left corner using a CSS mask.
 * This creates a shape with a truly transparent cutout.
 */
const ScoopedCorner: React.FC<ScoopedCornerProps> = ({
  size = 50,
  color = 'white',
  className = '',
}) => {
  // Pass CSS variables to the stylesheet
  const style = {
    '--scoop-size': `${size}px`,
    '--scoop-color': color,
  } as React.CSSProperties;

  return <div className={`${styles.scoop} ${className}`} style={style} />;
};

export default ScoopedCorner; 