"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import styles from './schedule.module.css';

interface Schedule {
  scheduleId: number;
  scheduleName: string;
  when: string;
  until?: string;
  description: string;
  participantCount: number;
  myStatus: string;
  participants?: Array<{
    userId: number;
    name: string;
    role: string;
    status: string;
  }>;
}

interface CalendarDay {
  date: Date;
  dayOfWeek: number;
  schedules: Schedule[];
}

const SchedulePage = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userClassId, setUserClassId] = useState<number | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    if (!user) {
      router.push('/auth');
      return;
    }

    const fetchSchedules = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. 유저의 class_id 조회
        const { data: profile, error: profileError } = await supabase
          .from('PROFILES')
          .select('class_id')
          .eq('id', user.id)
          .single();

        if (profileError || !profile?.class_id) {
          setError('분반 정보를 찾을 수 없습니다.');
          return;
        }

        setUserClassId(profile.class_id);

        // 2. 일정 목록 조회
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setError('인증 토큰이 없습니다.');
          return;
        }

        const response = await fetch(`/api/classes/${profile.class_id}/schedules`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });

        if (!response.ok) {
          throw new Error('일정 목록을 불러오는데 실패했습니다.');
        }

        const data = await response.json();
        setSchedules(data.schedules || []);
      } catch (err) {
        console.error('Error fetching schedules:', err);
        setError('일정 목록을 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchSchedules();
  }, [user, router]);

  // 현재 주의 일정을 가져오는 함수
  const getCurrentWeekSchedules = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return schedules.filter(schedule => {
      const scheduleDate = new Date(schedule.when);
      return scheduleDate >= startOfWeek && scheduleDate <= endOfWeek;
    });
  };

  // 시간을 그리드 위치로 변환하는 함수 (30분 단위)
  const getTimePosition = (timeString: string) => {
    const date = new Date(timeString);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    // 30분 단위로 반올림
    const roundedMinutes = Math.round(minutes / 30) * 30;
    return hours + roundedMinutes / 60;
  };

  // 일정의 높이를 계산하는 함수 (시간 단위)
  const getScheduleHeight = (schedule: Schedule) => {
    if (schedule.until) {
      const startTime = new Date(schedule.when);
      const endTime = new Date(schedule.until);
      const durationInHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
      return Math.max(0.5, durationInHours); // 최소 30분
    }
    // 종료 시간이 없으면 기본 1시간
    return 1;
  };

  // 특정 시간대의 일정을 가져오는 함수
  const getSchedulesAtTime = (daySchedules: Schedule[], timeSlot: number) => {
    return daySchedules.filter(schedule => {
      const startTime = getTimePosition(schedule.when);
      const endTime = startTime + getScheduleHeight(schedule);
      // 일정이 해당 시간 슬롯에서 시작하는 경우만 반환
      return Math.floor(startTime) === timeSlot;
    });
  };

  // 요일별 일정을 그룹화하는 함수
  const getSchedulesByDay = () => {
    const weekSchedules = getCurrentWeekSchedules();
    const days: CalendarDay[] = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(currentDate);
      date.setDate(currentDate.getDate() - currentDate.getDay() + i);
      
      const daySchedules = weekSchedules.filter(schedule => {
        const scheduleDate = new Date(schedule.when);
        const scheduleDay = new Date(scheduleDate.getFullYear(), scheduleDate.getMonth(), scheduleDate.getDate());
        const targetDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        return scheduleDay.getTime() === targetDay.getTime();
      });

      days.push({
        date,
        dayOfWeek: date.getDay(),
        schedules: daySchedules
      });
    }

    return days;
  };

  // 시간 슬롯 생성 (30분 단위)
  const timeSlots = Array.from({ length: 48 }, (_, i) => {
    const hour = Math.floor(i / 2);
    const minute = (i % 2) * 30;
    const period = hour < 12 ? 'AM' : 'PM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const displayMinute = minute === 0 ? '00' : '30';
    return `${displayHour}:${displayMinute} ${period}`;
  });

  // 요일 이름
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

  const handleScheduleClick = (scheduleId: number) => {
    router.push(`/schedule/${scheduleId}`);
  };

  const handleAddSchedule = () => {
    router.push('/schedule/create');
  };

  const handlePrevWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const formatDate = (date: Date) => {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    return `${startOfWeek.getMonth() + 1}월 ${startOfWeek.getDate()}일 - ${endOfWeek.getMonth() + 1}월 ${endOfWeek.getDate()}일`;
  };

  const getParticipantNames = (schedule: Schedule) => {
    if (schedule.participants && schedule.participants.length > 0) {
      return schedule.participants.map(p => p.name).join(', ');
    }
    return `${schedule.participantCount}명 참여`;
  };

  // 오늘의 일정을 가져오는 함수
  const getTodaySchedules = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    return schedules.filter(schedule => {
      const scheduleDate = new Date(schedule.when);
      return scheduleDate >= today && scheduleDate < tomorrow;
    }).sort((a, b) => new Date(a.when).getTime() - new Date(b.when).getTime());
  };

  // 시간 포맷 함수
  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const period = hours < 12 ? 'AM' : 'PM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>일정을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.titleSection}>
            <h1 className={styles.title}>스케줄</h1>
            <p className={styles.subtitle}>
              {schedules.length > 0 
                ? `${schedules.length}개의 일정에 참여 중입니다.`
                : '아직 참여 중인 일정이 없습니다.'
              }
            </p>
          </div>
          <div className={styles.dateNavigation}>
            <button onClick={handlePrevWeek} className={styles.navButton}>
              ←
            </button>
            <span className={styles.currentDate}>
              {formatDate(currentDate)}
            </span>
            <button onClick={handleNextWeek} className={styles.navButton}>
              →
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className={styles.errorContainer}>
          <p className={styles.errorMessage}>{error}</p>
        </div>
      )}

      <div className={styles.mainContent}>
        {/* 캘린더 섹션 (왼쪽 80%) */}
        <div className={styles.calendarSection}>
          {schedules.length === 0 ? (
            <div className={styles.emptyCalendar}>
              <div className={styles.emptyCalendarIcon}>📅</div>
              <h3 className={styles.emptyCalendarTitle}>일정이 없습니다</h3>
              <p className={styles.emptyCalendarDescription}>
                아직 등록된 일정이 없습니다. 첫 번째 일정을 만들어보세요!
              </p>
              <button className={styles.emptyCalendarButton} onClick={handleAddSchedule}>
                일정 만들기
              </button>
            </div>
          ) : (
            <div className={styles.calendarGrid}>
            {/* 시간 열 */}
            <div className={styles.timeColumn}>
              <div className={styles.calendarTitle}>일정표</div>
              {timeSlots.map((time, index) => (
                <div key={index} className={styles.timeSlot}>
                  {time}
                </div>
              ))}
            </div>

            {/* 캘린더 본문 */}
            <div className={styles.calendarBody}>
              {/* 요일 헤더 */}
              <div className={styles.daysHeader}>
                {getSchedulesByDay().map((day, index) => (
                  <div key={index} className={styles.dayHeader}>
                    <div>{dayNames[day.dayOfWeek]}</div>
                    <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                      {day.date.getDate()}
                    </div>
                  </div>
                ))}
              </div>

              {/* 일정 그리드 */}
              <div className={styles.scheduleGrid}>
                {getSchedulesByDay().map((day, dayIndex) => (
                  <div key={dayIndex} className={styles.dayColumn}>
                    {timeSlots.map((_, timeIndex) => {
                      const timeSlot = timeIndex;
                      const schedulesAtTime = getSchedulesAtTime(day.schedules, timeSlot);
                      
                      return (
                        <div key={timeIndex} className={styles.timeSlot}>
                          {schedulesAtTime.map((schedule: Schedule, scheduleIndex: number) => {
                            const startTime = getTimePosition(schedule.when);
                            const height = getScheduleHeight(schedule);
                            const top = Math.max(0, (startTime - timeSlot) * 30); // 30px per 30min
                            const scheduleHeight = height * 60; // 1시간 = 60px (30px * 2)
                            
                            // 겹치는 일정들의 가로 배치 계산
                            const totalSchedules = schedulesAtTime.length;
                            const scheduleWidth = totalSchedules > 1 ? `calc(100% / ${totalSchedules} - 4px)` : '100%';
                            const leftPosition = totalSchedules > 1 ? `calc(${scheduleIndex} * (100% / ${totalSchedules}) + 2px)` : '0';
                            
                            return (
                              <div
                                key={schedule.scheduleId}
                                className={`${styles.scheduleBlock} ${
                                  schedulesAtTime.length > 1 ? styles.overlapping : ''
                                }`}
                                style={{
                                  top: `${top}px`,
                                  height: `${scheduleHeight}px`,
                                  width: scheduleWidth,
                                  left: leftPosition,
                                  zIndex: scheduleIndex + 1
                                }}
                                onClick={() => handleScheduleClick(schedule.scheduleId)}
                              >
                                <div className={styles.scheduleTitle}>
                                  {schedule.scheduleName}
                                </div>
                                <div className={styles.scheduleParticipants}>
                                  {getParticipantNames(schedule)}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
          )}
        </div>

        {/* 사이드바 섹션 (오른쪽 20%) */}
        <div className={styles.sidebarSection}>
          <button className={styles.addScheduleButton} onClick={handleAddSchedule}>
            + 일정 추가하기
          </button>
          
          <div className={styles.todaySchedules}>
            <h3 className={styles.todayTitle}>오늘의 일정</h3>
            <div className={styles.todayList}>
              {getTodaySchedules().map((schedule) => (
                <div key={schedule.scheduleId} className={styles.todayItem}>
                  <div className={styles.todayTime}>
                    {formatTime(schedule.when)}
                  </div>
                  <div className={styles.todayName}>
                    {schedule.scheduleName}
                  </div>
                </div>
              ))}
              {getTodaySchedules().length === 0 && (
                <div className={styles.noSchedule}>
                  오늘 예정된 일정이 없습니다.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchedulePage; 