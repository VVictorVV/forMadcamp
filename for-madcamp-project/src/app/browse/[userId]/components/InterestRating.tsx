import React from 'react';
import styles from './InterestRating.module.css';

interface HeartIconProps {
  filled: boolean;
  onClick: () => void;
  readOnly: boolean;
}

const HeartIcon: React.FC<HeartIconProps> = ({ filled, onClick, readOnly }) => (
  <svg
    onClick={readOnly ? undefined : onClick}
    className={`${styles.heartIcon} ${filled ? styles.filled : ''} ${readOnly ? styles.readOnly : ''}`}
    viewBox="0 0 24 24"
    width="24"
    height="24"
    fill="currentColor"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
  </svg>
);

interface InterestRatingProps {
  topicId: number;
  currentRating: number;
  isOwner: boolean;
  onRatingChange: (topicId: number, newLevel: number) => Promise<void>;
}

const InterestRating: React.FC<InterestRatingProps> = ({ topicId, currentRating, isOwner, onRatingChange }) => {
  const handleHeartClick = (level: number) => {
    if (isOwner) return;
    
    // 이미 선택된 하트를 다시 클릭하면 0으로 (관심 없음)
    const newLevel = currentRating === level ? 0 : level;
    onRatingChange(topicId, newLevel);
  };

  return (
    <div className={styles.ratingContainer}>
      {[1, 2, 3, 4, 5].map((level) => (
        <HeartIcon
          key={level}
          filled={level <= currentRating}
          onClick={() => handleHeartClick(level)}
          readOnly={isOwner}
        />
      ))}
    </div>
  );
};

export default InterestRating; 