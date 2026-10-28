const mergeRanges = (ranges, sourceLength) => {
  const normalized = ranges
    .map(({ start, end }) => ({
      start: Math.max(0, Math.min(sourceLength, start)),
      end: Math.max(0, Math.min(sourceLength, end)),
    }))
    .filter(({ start, end }) => end > start)
    .sort((left, right) => left.start - right.start || left.end - right.end);
  const merged = [];
  for (const range of normalized) {
    const previous = merged.at(-1);
    if (!previous || range.start > previous.end) {
      merged.push({ ...range });
    } else {
      previous.end = Math.max(previous.end, range.end);
    }
  }
  return merged;
};

const summarizeEntries = (entries, includeUrl) => {
  const resources = entries
    .filter(({ url }) => includeUrl(url))
    .map(({ url, text, ranges }) => {
      if (typeof text !== "string") {
        return {
          url,
          available: false,
          reason: "The browser returned coverage ranges without source text.",
          sourceCharacters: null,
          usedCharacters: null,
          unusedCharacters: null,
          utilization: null,
          usedRangeCount: Array.isArray(ranges) ? ranges.length : 0,
        };
      }
      const sourceCharacters = text.length;
      const usedRanges = mergeRanges(ranges ?? [], sourceCharacters);
      const usedCharacters = usedRanges.reduce(
        (total, range) => total + range.end - range.start,
        0,
      );
      return {
        url,
        sourceCharacters,
        usedCharacters,
        unusedCharacters: sourceCharacters - usedCharacters,
        utilization:
          sourceCharacters === 0
            ? 1
            : Number((usedCharacters / sourceCharacters).toFixed(4)),
        usedRangeCount: usedRanges.length,
      };
    })
    .sort((left, right) => left.url.localeCompare(right.url));
  const sourceCharacters = resources.reduce(
    (total, resource) => total + (resource.sourceCharacters ?? 0),
    0,
  );
  const usedCharacters = resources.reduce(
    (total, resource) => total + (resource.usedCharacters ?? 0),
    0,
  );
  return {
    resourceCount: resources.length,
    measurableResourceCount: resources.filter(
      ({ sourceCharacters: characters }) => characters !== null,
    ).length,
    unavailableResourceCount: resources.filter(
      ({ sourceCharacters: characters }) => characters === null,
    ).length,
    sourceCharacters,
    usedCharacters,
    unusedCharacters: sourceCharacters - usedCharacters,
    utilization:
      sourceCharacters === 0
        ? null
        : Number((usedCharacters / sourceCharacters).toFixed(4)),
    resources,
  };
};

const normalizeJavascriptEntries = (entries) =>
  entries.map((entry) => {
    if (!Array.isArray(entry.functions)) return entry;
    return {
      url: entry.url,
      text: entry.source,
      ranges: entry.functions.flatMap(({ ranges = [] }) =>
        ranges
          .filter(({ count }) => count > 0)
          .map(({ startOffset, endOffset }) => ({
            start: startOffset,
            end: endOffset,
          })),
      ),
    };
  });

export const summarizeResourceCoverage = ({
  javascript = [],
  css = [],
  includeUrl = () => true,
} = {}) => ({
  javascript: summarizeEntries(normalizeJavascriptEntries(javascript), includeUrl),
  css: summarizeEntries(css, includeUrl),
});

export const startPageResourceCoverage = async (
  page,
  {
    enabled = false,
    javascript = true,
    css = true,
    includeUrl = () => true,
    resetOnNavigation = false,
    reportAnonymousScripts = false,
  } = {},
) => {
  if (!enabled) {
    return {
      status: "disabled",
      stop: async () => ({ status: "disabled", javascript: null, css: null }),
    };
  }
  if (!page.coverage) {
    return {
      status: "unsupported",
      stop: async () => ({
        status: "unsupported",
        reason: "Playwright coverage is available only in Chromium.",
        javascript: null,
        css: null,
      }),
    };
  }

  let javascriptStarted = false;
  let cssStarted = false;
  let stopped = false;
  try {
    if (javascript) {
      await page.coverage.startJSCoverage({
        resetOnNavigation,
        reportAnonymousScripts,
      });
      javascriptStarted = true;
    }
    if (css) {
      await page.coverage.startCSSCoverage({ resetOnNavigation });
      cssStarted = true;
    }
  } catch (error) {
    if (javascriptStarted) await page.coverage.stopJSCoverage();
    throw error;
  }

  return {
    status: "recording",
    stop: async () => {
      if (stopped) throw new Error("Resource coverage has already been stopped.");
      stopped = true;
      const [javascriptEntries, cssEntries] = await Promise.all([
        javascriptStarted ? page.coverage.stopJSCoverage() : [],
        cssStarted ? page.coverage.stopCSSCoverage() : [],
      ]);
      return {
        status: "available",
        ...summarizeResourceCoverage({
          javascript: javascriptEntries,
          css: cssEntries,
          includeUrl,
        }),
      };
    },
  };
};
