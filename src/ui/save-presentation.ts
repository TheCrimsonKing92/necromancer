const savedAtFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export const savedAtLabel = (savedAt: string): string | undefined => {
  const date = new Date(savedAt);
  return Number.isNaN(date.valueOf())
    ? undefined
    : savedAtFormatter.format(date);
};
