"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '../../../../../lib/supabaseClient';
import styles from './music.module.css';

const MusicPlayerPage = () => {
  const params = useParams();
  const profileId = params.profileId as string;
  const [musicUrl, setMusicUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!profileId) return;

    const fetchMusicData = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('extra')
          .select('music')
          .eq('profile_id', profileId)
          .single();

        if (error) {
          console.warn('Error fetching music data:', error.message);
        }
        
        setMusicUrl(data?.music || null);

      } catch (e) {
        console.error("An error occurred:", e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMusicData();
  }, [profileId]);

  const getSpotifyEmbedUrl = (url: string) => {
    if (!url || !url.includes('spotify.com/track/')) {
        return null;
    }
    try {
        const urlObj = new URL(url);
        const trackId = urlObj.pathname.split('/').pop();
        if (trackId) {
            return `https://open.spotify.com/embed/track/${trackId}`;
        }
    } catch (e) {
        console.error("Invalid Spotify URL", e);
    }
    return null;
  };
  
  const spotifyEmbedUrl = musicUrl ? getSpotifyEmbedUrl(musicUrl) : null;

  if (isLoading) {
    return (
        <div className={styles.pageWrapper}>
            <p className={styles.loadingText}>Loading Music...</p>
        </div>
    )
  }

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.ipodContainer}>
        {/* SVG is always rendered */}
        <Image 
            src="/ipod.svg" 
            alt="iPod SVG"
            width={900}
            height={1350}
            className={styles.ipodImage}
        />

        {/* Spotify player is conditionally rendered on top */}
        {spotifyEmbedUrl && (
            <iframe
                className={styles.spotifyPlayer}
                src={spotifyEmbedUrl}
                width="100%"
                height="700" /* Explicitly set a larger height */
                frameBorder="0"
                allowFullScreen
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
            ></iframe>
        )}
      </div>
    </div>
  );
};

export default MusicPlayerPage; 