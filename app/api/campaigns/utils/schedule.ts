const PARIS_TIMEZONE = "Europe/Paris";

type ScheduleInput = {
  startDateTime?: string;
  startDate?: string;
  startTime?: string;
};

const pad = (value: string | number, length: number = 2) =>
  String(value).padStart(length, "0");

const normalizeTimeParts = (time?: string) => {
  if (!time) {
    return { hours: "00", minutes: "00", seconds: "00", milliseconds: "000" };
  }

  const [timePart, fractionalPart] = time.split(".");
  const [rawHours = "00", rawMinutes = "00", rawSeconds = "00"] = (
    timePart || ""
  ).split(":");

  return {
    hours: pad(rawHours),
    minutes: pad(rawMinutes),
    seconds: pad(rawSeconds),
    milliseconds: pad(fractionalPart ? fractionalPart.slice(0, 3) : "0", 3),
  };
};

const getParisOffset = (date: string, time: string) => {
  try {
    const probeDate = new Date(`${date}T${time}Z`);
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: PARIS_TIMEZONE,
      timeZoneName: "shortOffset",
    });
    const offsetPart = formatter
      .formatToParts(probeDate)
      .find((part) => part.type === "timeZoneName")?.value;

    if (offsetPart) {
      const match = offsetPart.match(/GMT([+-]?)(\d{1,2})(?::?(\d{2}))?/i);
      if (match) {
        const sign = match[1] === "-" ? "-" : "+";
        const hours = pad(match[2]);
        const minutes = pad(match[3] || "00");
        return `${sign}${hours}:${minutes}`;
      }
    }
  } catch (error) {
    console.warn("Failed to determine Paris timezone offset", error);
  }

  return "+00:00";
};

export const buildStartDateTimeValue = (
  startDate?: string,
  startTime?: string
): string | undefined => {
  if (!startDate) return undefined;
  const { hours, minutes, seconds, milliseconds } =
    normalizeTimeParts(startTime);
  const offset = getParisOffset(startDate, `${hours}:${minutes}:${seconds}`);
  return `${startDate}T${hours}:${minutes}:${seconds}.${milliseconds}${offset}`;
};

export const ensureStartDateTime = ({
  startDateTime,
  startDate,
  startTime,
}: ScheduleInput): string | undefined => {
  if (startDateTime && typeof startDateTime === "string") {
    return startDateTime;
  }
  return buildStartDateTimeValue(startDate, startTime);
};

export const extractStartFields = (startDateTime?: string) => {
  if (!startDateTime) return { startDate: undefined, startTime: undefined };
  const [datePart, timeAndOffset] = startDateTime.split("T");
  if (!datePart || !timeAndOffset) {
    return { startDate: undefined, startTime: undefined };
  }

  const [timePart] = timeAndOffset.split(/[Z+-]/);
  if (!timePart) {
    return { startDate: datePart, startTime: undefined };
  }

  const [timeWithoutMs] = timePart.split(".");
  return { startDate: datePart, startTime: timeWithoutMs };
};

export const getScheduleFieldsForResponse = (doc: {
  startDateTime?: string;
  startDate?: string;
  startTime?: string;
}) => {
  const startDateTime =
    doc.startDateTime ||
    buildStartDateTimeValue(doc.startDate, doc.startTime) ||
    undefined;
  const { startDate, startTime } = extractStartFields(startDateTime);

  return {
    startDateTime,
    startDate: startDate || doc.startDate || "",
    startTime: startTime || doc.startTime || "",
  };
};
