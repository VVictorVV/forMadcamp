"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import styles from './LoggedInHome.module.css';
import HomeCalendar from './HomeCalendar';

interface Memory {
  memory_id: number;
  name: string;
}

interface Project {
    project_id: number;
    project_name: string;
    representative_image_uri: string | null;
}

interface Poll {
    poll_id: number;
    poll_name: string;
    deadline: string;
}

export default function LoggedInHome() {
  const { user } = useAuth();
  const [recentProject, setRecentProject] = useState<Project | null>(null);
  const [upcomingPolls, setUpcomingPolls] = useState<Poll[]>([]);
  const [otherProjects, setOtherProjects] = useState<Project[]>([]);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      console.log("--- Starting data fetch for user:", user.id);

      // --- Fetch User's Class ID and Name ---
      const { data: profile, error: profileError } = await supabase
        .from('PROFILES')
        .select('class_id, name')
        .eq('id', user.id)
        .single();
      
      if (profileError) console.error("Error fetching profile:", profileError);
      console.log("Fetched profile data:", profile);
      const classId = profile?.class_id;
      if (profile) {
        setUserName(profile.name);
      }

      // --- Fetch Recent Project ---
      const { data: participatorData, error: participatorError } = await supabase
        .from('PARTICIPATOR')
        .select('project_id')
        .eq('profile_id', user.id);
      
      if(participatorError) console.error("Error fetching participator data:", participatorError);
      console.log("Fetched participator data:", participatorData);
      
      const userProjectIds = participatorData?.map(p => p.project_id) || [];

      if (userProjectIds.length > 0) {
        const { data: projectData, error: projectError } = await supabase
          .from('PROJECTS')
          .select('project_id, project_name, representative_image_uri')
          .in('project_id', userProjectIds)
          .order('week_num', { ascending: false })
          .limit(1)
          .single();
        if(projectError) console.error("Error fetching recent project:", projectError);
        console.log("Fetched recent project:", projectData);
        if (projectData) setRecentProject(projectData);
      }

      if (classId) {
        console.log("--- Fetching data for classId:", classId);
        // --- Fetch Upcoming Polls ---
        const { data: pollsData, error: pollsError } = await supabase
          .from('POLLS')
          .select('poll_id, poll_name, deadline')
          .eq('class_id', classId)
          .gte('deadline', new Date().toISOString())
          .order('deadline', { ascending: true });
        if(pollsError) console.error("Error fetching polls:", pollsError);
        console.log("Fetched upcoming polls:", pollsData);
        if (pollsData) setUpcomingPolls(pollsData);

        // --- Fetch "You might like" Projects ---
        let query = supabase
          .from('PROJECTS')
          .select('project_id, project_name, representative_image_uri')
          .eq('class_id', classId);

        if (userProjectIds.length > 0) {
          query = query.not('project_id', 'in', `(${userProjectIds.join(',')})`);
        }
        
        const { data: otherProjectsData, error: otherProjectsError } = await query;
        if(otherProjectsError) console.error("Error fetching other projects:", otherProjectsError);
        console.log("Fetched other projects:", otherProjectsData);

        if (otherProjectsData) {
          const randomProjects = otherProjectsData.sort(() => 0.5 - Math.random()).slice(0, 4);
          setOtherProjects(randomProjects);
        }
      } else {
        console.log("No classId found, skipping polls and other projects fetch.");
      }
    };

    fetchData();
  }, [user]);

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.mainGrid}>
        {/* Grid Cell 1: Calendar */}
        <div className={styles.calendarWrapper}>
          <HomeCalendar />
        </div>

        {/* Grid Cell 2: Recent Project */}
        <div className={styles.recentProject}>
          {userName === '허지민' ? (
            <Link href="/class/2" className={styles.forClass2Container}>
              <h3>For 2분반</h3>
              <p>2분반 여러분, 응원합니다!</p>
            </Link>
          ) : recentProject ? (
            <Link href={`/project/${recentProject.project_id}`}>
              <div className={styles.imageOverlay}>
                <h3>Recent Projects</h3>
              </div>
              {recentProject.representative_image_uri ? (
                <img src={recentProject.representative_image_uri} alt={recentProject.project_name} />
              ) : (
                <div className={styles.noImagePlaceholder}>{recentProject.project_name}</div>
              )}
              <div className={styles.projectNameOverlay}>
                <h4>{recentProject.project_name}</h4>
              </div>
            </Link>
          ) : (
            <div className={styles.noProjectPlaceholder}>
              <p>진행 중인 프로젝트가 없습니다.</p>
            </div>
          )}
        </div>

        {/* Grid Cell 3: Upcoming Votes */}
        <div className={styles.upcomingVotes}>
          <h3 className={styles.sectionTitle}>Upcoming Votes</h3>
          <div className={styles.voteList}>
            {upcomingPolls.length > 0 ? (
              upcomingPolls.map(poll => (
                <div key={poll.poll_id} className={styles.voteItem}>
                  <span>{poll.poll_name}</span>
                  <span className={styles.voteDeadline}>
                    ~{new Date(poll.deadline).toLocaleDateString('ko-KR')}
                  </span>
                </div>
              ))
            ) : (
              <p className={styles.emptyMessage}>다가오는 투표가 없습니다.</p>
            )}
          </div>
        </div>

        {/* Grid Cell 4: You Might Like */}
        <div className={styles.youMightLike}>
          <h3 className={styles.sectionTitle}>You might like</h3>
          <div className={styles.likeGrid}>
            {otherProjects.length > 0 ? (
              otherProjects.map(project => (
                <Link 
                  href={`/project/${project.project_id}`} 
                  key={project.project_id} 
                  className={styles.likeItem}
                  style={{ backgroundImage: project.representative_image_uri ? `url(${project.representative_image_uri})` : 'none' }}
                >
                  {!project.representative_image_uri && (
                    <div className={styles.noImagePlaceholder}>{project.project_name}</div>
                  )}
                  <div className={styles.projectInfo}>
                    <span>{project.project_name}</span>
                  </div>
                </Link>
              ))
            ) : (
              <p className={styles.emptyMessage}>다른 프로젝트가 없습니다.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 