import { useEffect, useState } from "react";
import { isBirthdayToday } from "@/data/birthday-members";

export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function useIsBirthdayToday(birthday: string): boolean {
  const now = useNow(1000);
  return isBirthdayToday(birthday, now);
}