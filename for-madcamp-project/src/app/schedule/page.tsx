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

  // 시간을 30분 단위 슬롯 인덱스로 변환하는 함수 (일정 배치용)
  const getTimeSlotIndex = (timeString: string) => {
    const date = new Date(timeString);
    
    // 한국 시간 추출 (UTC+9)
    const koreaOffset = 9 * 60; // 9시간을 분으로 변환
    const koreaTime = new Date(date.getTime() + koreaOffset * 60 * 1000);
    const localHours = koreaTime.getUTCHours();
    const localMinutes = koreaTime.getUTCMinutes();
    
    // 총 분수를 계산하고 30분 슬롯 인덱스로 변환
    const totalMinutes = localHours * 60 + localMinutes;
    const slotIndex = totalMinutes / 30; // 30분 단위 슬롯 인덱스
    
    console.log('getTimeSlotIndex - Time:', timeString, 'Korea:', `${localHours}:${localMinutes}`, 'Slot:', slotIndex);
    
    return slotIndex;
  };

  // 시간을 소수점 시간으로 변환하는 함수 (높이 계산용)
  const getTimePosition = (timeString: string) => {
    const date = new Date(timeString);
    
    // 한국 시간 추출 (UTC+9)
    const koreaOffset = 9 * 60; // 9시간을 분으로 변환
    const koreaTime = new Date(date.getTime() + koreaOffset * 60 * 1000);
    const localHours = koreaTime.getUTCHours();
    const localMinutes = koreaTime.getUTCMinutes();
    
    // 소수점 시간으로 반환 (높이 계산에 사용)
    return localHours + localMinutes / 60;
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
  const getSchedulesAtTime = (daySchedules: Schedule[], timeSlot: number, dayDate: Date) => {
    return daySchedules.filter(schedule => {
      const scheduleStart = new Date(schedule.when);
      const scheduleEnd = schedule.until ? new Date(schedule.until) : new Date(scheduleStart.getTime() + 60 * 60 * 1000);
      
      // 해당 날짜에서의 시작 시간과 종료 시간 계산
      const dayStart = new Date(dayDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayStart.getDate() + 1);
      
      let displayStartTime;
      let displayEndTime;
      
      if (scheduleStart < dayStart) {
        // 일정이 전날에 시작된 경우, 해당 날짜의 00:00부터 표시
        displayStartTime = 0;
        const effectiveEnd = scheduleEnd < dayEnd ? scheduleEnd : dayEnd;
        displayEndTime = getTimeSlotIndex(effectiveEnd.toISOString());
      } else {
        // 일정이 해당 날짜에 시작된 경우, 실제 시작 시간 사용
        displayStartTime = getTimeSlotIndex(schedule.when);
        
        if (scheduleEnd >= dayEnd) {
          // 일정이 다음날로 넘어가는 경우, 해당 날의 마지막 슬롯(47번, 11:30PM)까지 표시
          displayEndTime = 48; // 48 = 다음날 0시를 의미하는 슬롯 (47번 슬롯 이후)
        } else {
          // 일정이 해당 날에 끝나는 경우
          displayEndTime = getTimeSlotIndex(scheduleEnd.toISOString());
        }
      }
      
      console.log(`Schedule at time - Day: ${dayDate.toDateString()}, TimeSlot: ${timeSlot}, Schedule: ${schedule.scheduleName}, DisplayStart: ${displayStartTime}, DisplayEnd: ${displayEndTime}`);
      
      // 해당 시간 슬롯에서 진행 중인 일정인지 확인
      const timeSlotStart = timeSlot;
      const timeSlotEnd = timeSlot + 1; // 30분 슬롯 (1 인덱스 = 30분)
      
      return (displayStartTime < timeSlotEnd && displayEndTime > timeSlotStart);
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
        const scheduleStart = new Date(schedule.when);
        const scheduleEnd = schedule.until ? new Date(schedule.until) : new Date(scheduleStart.getTime() + 60 * 60 * 1000);
        
        const targetDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const nextDay = new Date(targetDay);
        nextDay.setDate(targetDay.getDate() + 1);
        
        // 일정이 해당 날짜와 겹치는지 확인
        return scheduleStart < nextDay && scheduleEnd > targetDay;
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

  // 시간 포맷 함수 (한국 시간 처리)
  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    
    // 한국 시간 추출 (UTC+9)
    const koreaOffset = 9 * 60; // 9시간을 분으로 변환
    const koreaTime = new Date(date.getTime() + koreaOffset * 60 * 1000);
    const hours = koreaTime.getUTCHours();
    const minutes = koreaTime.getUTCMinutes();
    
    const period = hours < 12 ? 'AM' : 'PM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    
    // 디버깅 정보
    console.log('formatTime - Original:', timeString, 'Korea hours:', hours, 'minutes:', minutes, 'Display:', `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`);
    
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  // 하루에서 최대 겹치는 일정 개수를 계산하는 함수
  const getMaxOverlappingCount = (daySchedules: Schedule[], dayDate: Date) => {
    if (daySchedules.length === 0) return 0;
    
    const dayStart = new Date(dayDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayStart.getDate() + 1);
    
    // 각 시간 포인트에서 겹치는 일정 개수를 계산
    let maxOverlap = 0;
    
    // 30분 단위로 체크 (0~47 슬롯)
    for (let slot = 0; slot < 48; slot++) {
      const slotTime = new Date(dayStart.getTime() + slot * 30 * 60 * 1000);
      
      let overlapCount = 0;
      
      daySchedules.forEach(schedule => {
        const scheduleStart = new Date(schedule.when);
        const scheduleEnd = schedule.until ? new Date(schedule.until) : new Date(scheduleStart.getTime() + 60 * 60 * 1000);
        
        // 해당 슬롯 시간이 일정 범위 안에 있는지 확인 (겹침 계산)
        // 시작 시간 <= 슬롯 시간 < 종료 시간인 경우 겹침으로 계산
        if (scheduleStart <= slotTime && scheduleEnd > slotTime) {
          overlapCount++;
        }
      });
      
      maxOverlap = Math.max(maxOverlap, overlapCount);
      
      // 디버깅용 로그 (첫 번째와 마지막 슬롯만)
      if (slot === 0 || slot === 47 || overlapCount > 0) {
        const slotHour = Math.floor(slot / 2);
        const slotMinute = (slot % 2) * 30;
        console.log(`Slot ${slot} (${slotHour}:${slotMinute.toString().padStart(2, '0')}): ${overlapCount} overlapping schedules`);
      }
    }
    
    console.log(`Max overlapping count for ${dayDate.toDateString()}: ${maxOverlap}`);
    return maxOverlap;
  };

  // 날짜별 일정의 슬롯 배치를 계산하는 함수
  const calculateScheduleSlots = (daySchedules: Schedule[], dayDate: Date) => {
    if (daySchedules.length === 0) return { slotAssignment: new Map(), maxSlots: 0 };
    
    const dayStart = new Date(dayDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayStart.getDate() + 1);
    
    // 일정을 시작 시간 순으로 정렬
    const sortedSchedules = [...daySchedules].sort((a, b) => {
      const aStart = new Date(a.when);
      const bStart = new Date(b.when);
      return aStart.getTime() - bStart.getTime();
    });
    
    const maxSlots = getMaxOverlappingCount(daySchedules, dayDate);
    const slotAssignment = new Map<number, number>(); // scheduleId -> slotIndex
    const slotEndTimes: Date[] = new Array(maxSlots).fill(null); // 각 슬롯의 종료 시간
    
    sortedSchedules.forEach(schedule => {
      const scheduleStart = new Date(schedule.when);
      const scheduleEnd = schedule.until ? new Date(schedule.until) : new Date(scheduleStart.getTime() + 60 * 60 * 1000);
      
      // 일정이 해당 날짜와 겹치는지 확인
      if (!(scheduleStart < dayEnd && scheduleEnd > dayStart)) {
        return; // 해당 날짜와 겹치지 않음
      }
      
      // 배치할 슬롯 찾기
      let assignedSlot = -1;
      for (let slotIndex = 0; slotIndex < maxSlots; slotIndex++) {
        const slotEndTime = slotEndTimes[slotIndex];
        
        // 슬롯이 비어있거나, 슬롯의 종료 시간이 현재 일정의 시작 시간보다 이르면 배치 가능
        if (!slotEndTime || slotEndTime <= scheduleStart) {
          assignedSlot = slotIndex;
          slotEndTimes[slotIndex] = scheduleEnd;
          break;
        }
      }
      
      if (assignedSlot !== -1) {
        slotAssignment.set(schedule.scheduleId, assignedSlot);
        console.log(`Schedule "${schedule.scheduleName}" assigned to slot ${assignedSlot} on ${dayDate.toDateString()}`);
      }
    });
    
    return { slotAssignment, maxSlots };
  };

  // 슬롯 인덱스에 따른 색상 클래스를 반환하는 함수
  const getSlotColorClass = (slotIndex: number, myStatus: string | null) => {
    // 참여하지 않은 일정은 회색으로 표시
    if (!myStatus) {
      return 'scheduleSlotGray';
    }
    
    // 참여 중인 일정은 기존 슬롯별 색상
    if (slotIndex <= 9) {
      return `scheduleSlot${slotIndex}`;
    }
    return 'scheduleSlotDefault';
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
                {getSchedulesByDay().map((day, dayIndex) => {
                  // 해당 날짜의 슬롯 배치 정보 미리 계산
                  const { slotAssignment, maxSlots } = calculateScheduleSlots(day.schedules, day.date);
                  
                  return (
                    <div key={dayIndex} className={styles.dayColumn}>
                      {timeSlots.map((_, timeIndex) => {
                        const timeSlot = timeIndex;
                        const schedulesAtTime = getSchedulesAtTime(day.schedules, timeSlot, day.date);
                        
                        return (
                          <div key={timeIndex} className={styles.timeSlot}>
                            {schedulesAtTime.map((schedule: Schedule, scheduleIndex: number) => {
                              const scheduleStart = new Date(schedule.when);
                              const scheduleEnd = schedule.until ? new Date(schedule.until) : new Date(scheduleStart.getTime() + 60 * 60 * 1000);
                              
                              // 해당 날짜에서의 시작 시간과 높이 계산
                              const dayStart = new Date(day.date);
                              dayStart.setHours(0, 0, 0, 0);
                              const dayEnd = new Date(dayStart);
                              dayEnd.setDate(dayStart.getDate() + 1);
                              
                              let displayStartTime;
                              let displayHeight;
                              
                              if (scheduleStart < dayStart) {
                                // 일정이 전날에 시작된 경우, 해당 날짜의 00:00부터 표시
                                displayStartTime = 0;
                                const effectiveEnd = scheduleEnd < dayEnd ? scheduleEnd : dayEnd;
                                displayHeight = (effectiveEnd.getTime() - dayStart.getTime()) / (1000 * 60 * 60);
                              } else {
                                // 일정이 해당 날짜에 시작된 경우, 실제 시작 시간 사용
                                displayStartTime = getTimeSlotIndex(schedule.when);
                                
                                if (scheduleEnd >= dayEnd) {
                                  // 일정이 다음날로 넘어가는 경우, 해당 날의 마지막까지 높이 계산
                                  displayHeight = (dayEnd.getTime() - scheduleStart.getTime()) / (1000 * 60 * 60);
                                } else {
                                  // 일정이 해당 날에 끝나는 경우
                                  displayHeight = (scheduleEnd.getTime() - scheduleStart.getTime()) / (1000 * 60 * 60);
                                }
                              }
                              
                              // 일정이 해당 시간 슬롯에서 시작하는지 확인
                              const isStartingAtThisSlot = Math.floor(displayStartTime) === timeSlot;
                              
                              // 시작하는 슬롯에서만 렌더링
                              if (!isStartingAtThisSlot) {
                                return null;
                              }
                              
                              const top = Math.max(0, (displayStartTime - timeSlot) * 30); // 30px per 30min
                              const scheduleHeight = Math.max(30, displayHeight * 60); // 최소 30px, 1시간 = 60px
                              
                              // 새로운 너비 및 위치 계산
                              const assignedSlot = slotAssignment.get(schedule.scheduleId) || 0;
                              const scheduleWidth = maxSlots > 1 ? `calc(100% / ${maxSlots} - 4px)` : '100%';
                              const leftPosition = maxSlots > 1 ? `calc(${assignedSlot} * (100% / ${maxSlots}) + 2px)` : '0';
                              
                              // 슬롯별 색상 클래스
                              const colorClass = getSlotColorClass(assignedSlot, schedule.myStatus);
                              
                              // 미정 상태인 경우 반짝이는 효과 추가
                              const blinkClass = schedule.myStatus === '미정' ? styles.blinking : '';
                              
                              console.log(`Rendering schedule "${schedule.scheduleName}" - Slot: ${assignedSlot}/${maxSlots}, Color: ${colorClass}, MyStatus: ${schedule.myStatus}, Width: ${scheduleWidth}, Left: ${leftPosition}`);
                              
                              return (
                                <div
                                  key={schedule.scheduleId}
                                  className={`${styles.scheduleBlock} ${styles[colorClass]} ${blinkClass}`}
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
                  );
                })}
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