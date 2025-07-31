"use client";

import Image from 'next/image';
import styles from './music.module.css';

const MusicPlayerPage = () => {
  return (
    <div className={styles.pageWrapper}>
      <div className={styles.ipodContainer}>
        <Image 
            src="/ipod.png" 
            alt="iPod Music Player"
            width={500}
            height={750}
            className={styles.ipodImage}
        />
      </div>
    </div>
  );
};

export default MusicPlayerPage; 