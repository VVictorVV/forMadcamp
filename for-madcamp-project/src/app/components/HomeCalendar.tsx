"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import styles from './HomeCalendar.module.css';

interface Schedule {
  scheduleId: number;
  scheduleName: string;
  when: string;
  until?: string;
  myStatus: string;
}

interface CalendarDay {
  date: Date;
  dayOfWeek: number;
  schedules: Schedule[];
}

export default function HomeCalendar() {
  const { user } = useAuth();
  const router = useRouter();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Data fetching logic remains the same
  useEffect(() => {
    if (!user) return;
    const fetchSchedules = async () => {
        const { data: profile } = await supabase
            .from('PROFILES').select('class_id').eq('id', user.id).single();
        if (profile?.class_id) {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            const response = await fetch(`/api/classes/${profile.class_id}/schedules`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setSchedules(data.schedules || []);
            }
        }
    };
    fetchSchedules();
  }, [user]);

  // Re-introducing helper functions from the original schedule page for time-grid layout
  const getTimeSlotIndex = (timeString: string) => {
    const date = new Date(timeString);
    const koreaOffset = 9 * 60;
    const koreaTime = new Date(date.getTime() + koreaOffset * 60 * 1000);
    return koreaTime.getUTCHours() * 2 + Math.floor(koreaTime.getUTCMinutes() / 30);
  };

  const getSchedulesByDay = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    const days: CalendarDay[] = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        const daySchedules = schedules.filter(s => {
            const scheduleStart = new Date(s.when);
            const scheduleEnd = s.until ? new Date(s.until) : new Date(scheduleStart.getTime() + 60 * 60 * 1000);
            return scheduleStart < new Date(date.getTime() + 24 * 60 * 60 * 1000) && scheduleEnd > date;
        });
        days.push({ date, dayOfWeek: i, schedules: daySchedules });
    }
    return days;
  };

  const timeSlots = Array.from({ length: 8 }, (_, i) => `${i * 3}:00`); // 3-hour slots
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div className={styles.calendarContainer} onClick={() => router.push('/schedule')}>
        <div className={styles.calendarGrid}>
            <div className={styles.timeColumn}>
                <div className={styles.timeColumnHeader}></div>
                {timeSlots.map((time) => <div key={time} className={styles.timeSlot}>{time}</div>)}
            </div>
            <div className={styles.scheduleArea}>
                <div className={styles.daysHeader}>
                    {dayNames.map((name, index) => {
                        const day = getSchedulesByDay()[index];
                        return <div key={name} className={styles.dayHeader}><span>{name}</span><span>{day.date.getDate()}</span></div>
                    })}
                </div>
                <div className={styles.scheduleGrid}>
                    {getSchedulesByDay().map((day, dayIndex) => (
                        <div key={dayIndex} className={styles.dayColumn}>
                            {day.schedules.map(schedule => {
                                const startSlot = getTimeSlotIndex(schedule.when);
                                const endSlot = schedule.until ? getTimeSlotIndex(schedule.until) : startSlot + 2;
                                const top = (startSlot / 6) * 50; // 50px per 3-hour slot
                                const height = ((endSlot - startSlot) / 6) * 50;

                                return (
                                    <div key={schedule.scheduleId} className={styles.scheduleBlock} style={{ top: `${top}px`, height: `${height}px` }}>
                                        {schedule.scheduleName}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
  );
} 