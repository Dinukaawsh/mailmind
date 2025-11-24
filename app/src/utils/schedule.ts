const PARIS_TIMEZONE = "Europe/Paris";

const parisDateFormatter = new Intl.DateTimeFormat(undefined, {
  timeZone: PARIS_TIMEZONE,
  year: "numeric",
  month: "short",
  day: "numeric",
});

const parisTimeFormatter = new Intl.DateTimeFormat(undefined, {
  timeZone: PARIS_TIMEZONE,
  hour: "2-digit",
  minute: "2-digit",
});

type ScheduleSource = {
  startDateTime?: string;
  startDate?: string;
  startTime?: string;
};

const extractIsoParts = (isoString: string) => {
  if (!isoString) return { datePart: undefined, timePart: undefined };
  const [datePart, timeAndOffset] = isoString.split("T");
  if (!datePart || !timeAndOffset) {
    return { datePart: undefined, timePart: undefined };
  }
  const [timePart] = timeAndOffset.split(/[Z+-]/);
  return { datePart, timePart };
};

export const getScheduleDisplay = (schedule: ScheduleSource) => {
  if (schedule.startDateTime) {
    const dateObj = new Date(schedule.startDateTime);
    if (!Number.isNaN(dateObj.getTime())) {
      return {
        dateLabel: parisDateFormatter.format(dateObj),
        timeLabel: parisTimeFormatter.format(dateObj),
        startDateTime: schedule.startDateTime,
      };
    }

    // Fallback to simple extraction if Date parsing failed
    const { datePart, timePart } = extractIsoParts(schedule.startDateTime);
    if (datePart || timePart) {
      return {
        dateLabel: datePart,
        timeLabel: timePart?.slice(0, 5),
        startDateTime: schedule.startDateTime,
      };
    }
  }

  if (schedule.startDate) {
    return {
      dateLabel: schedule.startDate,
      timeLabel: schedule.startTime || undefined,
      startDateTime: undefined,
    };
  }

  return {
    dateLabel: undefined,
    timeLabel: undefined,
    startDateTime: undefined,
  };
};
