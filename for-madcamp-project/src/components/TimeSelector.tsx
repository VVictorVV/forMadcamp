import { useState, useEffect } from 'react';
import styles from './TimeSelector.module.css';

interface TimeSelectorProps {
  value: string; // HH:mm 형식 (24시간)
  onChange: (value: string) => void;
  disabled?: boolean;
}

const TimeSelector = ({ value, onChange, disabled = false }: TimeSelectorProps) => {
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');
  const [hour, setHour] = useState<number>(12);
  const [minute, setMinute] = useState<number>(0);

  // value prop이 변경될 때 내부 상태 업데이트
  useEffect(() => {
    if (value) {
      const [hourStr, minuteStr] = value.split(':');
      const hour24 = parseInt(hourStr, 10);
      const minute24 = parseInt(minuteStr, 10);
      
      // 24시간 형식을 12시간 형식으로 변환
      if (hour24 === 0) {
        setPeriod('AM');
        setHour(12);
      } else if (hour24 < 12) {
        setPeriod('AM');
        setHour(hour24);
      } else if (hour24 === 12) {
        setPeriod('PM');
        setHour(12);
      } else {
        setPeriod('PM');
        setHour(hour24 - 12);
      }
      
      // 분은 30분 단위로 반올림
      setMinute(minute24 >= 30 ? 30 : 0);
    }
  }, [value]);

  // 내부 상태가 변경될 때 onChange 호출
  const updateTime = (newPeriod: 'AM' | 'PM', newHour: number, newMinute: number) => {
    let hour24 = newHour;
    
    if (newPeriod === 'AM') {
      if (newHour === 12) hour24 = 0;
    } else {
      if (newHour !== 12) hour24 = newHour + 12;
    }
    
    const timeString = `${hour24.toString().padStart(2, '0')}:${newMinute.toString().padStart(2, '0')}`;
    onChange(timeString);
  };

  const handlePeriodChange = (newPeriod: 'AM' | 'PM') => {
    setPeriod(newPeriod);
    updateTime(newPeriod, hour, minute);
  };

  const handleHourChange = (newHour: number) => {
    setHour(newHour);
    updateTime(period, newHour, minute);
  };

  const handleMinuteChange = (newMinute: number) => {
    setMinute(newMinute);
    updateTime(period, hour, newMinute);
  };

  return (
    <div className={`${styles.timeSelector} ${disabled ? styles.disabled : ''}`}>
      {/* 오전/오후 선택 */}
      <select
        className={styles.periodSelect}
        value={period}
        onChange={(e) => handlePeriodChange(e.target.value as 'AM' | 'PM')}
        disabled={disabled}
      >
        <option value="AM">오전</option>
        <option value="PM">오후</option>
      </select>

      {/* 시간 선택 */}
      <select
        className={styles.hourSelect}
        value={hour}
        onChange={(e) => handleHourChange(parseInt(e.target.value, 10))}
        disabled={disabled}
      >
        {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
          <option key={h} value={h}>
            {h}시
          </option>
        ))}
      </select>

      {/* 분 선택 */}
      <select
        className={styles.minuteSelect}
        value={minute}
        onChange={(e) => handleMinuteChange(parseInt(e.target.value, 10))}
        disabled={disabled}
      >
        <option value={0}>00분</option>
        <option value={30}>30분</option>
      </select>
    </div>
  );
};

export default TimeSelector; 