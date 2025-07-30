import React from 'react';
import styles from './InterestDetailModal.module.css';
import InterestRating from './InterestRating';
import Image from 'next/image';
import Link from 'next/link';
import { type Interest } from '../page'; // Assuming type is exported from page.tsx

interface InterestDetailModalProps {
  interests: Interest[];
  topicTitle: string;
  onClose: () => void;
}

const InterestDetailModal: React.FC<InterestDetailModalProps> = ({ interests, topicTitle, onClose }) => {
  // Stop propagation to prevent closing the modal when clicking inside the content
  const handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modalContent} onClick={handleContentClick}>
        <div className={styles.header}>
            <h2 className={styles.title}>{`"${topicTitle}"에 대한 관심`}</h2>
            <button onClick={onClose} className={styles.closeButton}>&times;</button>
        </div>
        <ul className={styles.interestList}>
          {interests.map(({ PROFILES, level }) => (
            PROFILES ? (
              <li key={PROFILES.id} className={styles.interestItem}>
                <Link href={`/browse/${PROFILES.id}`} className={styles.profileLink}>
                    <div className={styles.avatarWrapper}>
                        <Image
                            src={PROFILES.profile_image_uri || '/default_person.svg'}
                            alt={PROFILES.name || 'User'}
                            width={40}
                            height={40}
                            className={styles.avatar}
                        />
                    </div>
                    <span className={styles.name}>{PROFILES.name}</span>
                </Link>
                <div className={styles.ratingWrapper}>
                    <InterestRating
                        topicId={0} // Dummy topicId, not used for interaction
                        currentRating={level}
                        isOwner={true} // Makes it read-only
                        onRatingChange={async () => {}} // Dummy handler
                    />
                </div>
              </li>
            ) : null
          ))}
        </ul>
      </div>
    </div>
  );
};

export default InterestDetailModal; 