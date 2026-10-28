import { basename, resolve } from "node:path";

const optionValue = (arguments_, name) => {
  const prefix = `${name}=`;
  const matches = arguments_.filter((argument) => argument.startsWith(prefix));
  if (matches.length > 1) {
    throw new Error(`${name} may be supplied only once.`);
  }
  const value = matches[0]?.slice(prefix.length).trim();
  if (matches.length === 1 && !value) {
    throw new Error(`${name} requires a value.`);
  }
  return value ?? null;
};

const cohortToken = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9.]+/gu, "-")
    .replace(/^-|-$/gu, "") || "unknown";

export const selectPerformanceBrowser = ({
  arguments_,
  hardwareGpuRequested,
  playwrightExecutablePath,
  cwd = process.cwd(),
}) => {
  const channel = optionValue(arguments_, "--browser-channel");
  const suppliedExecutablePath = optionValue(
    arguments_,
    "--browser-executable",
  );
  if (channel && suppliedExecutablePath) {
    throw new Error(
      "Choose either --browser-channel or --browser-executable, not both.",
    );
  }

  if (channel) {
    return {
      source: "channel",
      channel,
      executablePath: null,
      launchOptions: { channel },
      cohortKey: `channel-${cohortToken(channel)}`,
    };
  }

  if (suppliedExecutablePath) {
    const executablePath = resolve(cwd, suppliedExecutablePath);
    return {
      source: "executable",
      channel: null,
      executablePath,
      launchOptions: { executablePath },
      cohortKey: `executable-${cohortToken(basename(executablePath))}`,
    };
  }

  if (hardwareGpuRequested) {
    return {
      source: "channel",
      channel: "chromium",
      executablePath: null,
      launchOptions: { channel: "chromium" },
      cohortKey: "channel-chromium",
    };
  }

  return {
    source: "playwright-default",
    channel: null,
    executablePath: playwrightExecutablePath,
    launchOptions: {},
    cohortKey: "playwright-default",
  };
};

export const describePerformanceBrowser = ({
  selection,
  browserVersion,
  protocolVersion = {},
}) => ({
  source: selection.source,
  channel: selection.channel,
  executablePath: selection.executablePath,
  version: browserVersion,
  product: protocolVersion.product ?? null,
  userAgent: protocolVersion.userAgent ?? null,
  protocolVersion: protocolVersion.protocolVersion ?? null,
  revision: protocolVersion.revision ?? null,
  jsVersion: protocolVersion.jsVersion ?? null,
  cohortKey: selection.cohortKey,
});

export const scopeGraphicsCohortToBrowser = (cohort, browserIdentity) => ({
  ...cohort,
  id: `${cohort.id}:${browserIdentity.cohortKey}`,
  browserChannel: browserIdentity.channel,
  browserExecutablePath: browserIdentity.executablePath,
  browserSource: browserIdentity.source,
  browserProduct: browserIdentity.product,
});

export const scopePerformanceCohortToCpu = (cohort, cpuThrottleRate) =>
  cpuThrottleRate === 1
    ? cohort
    : {
        ...cohort,
        id: `${cohort.id}:cpu-${cpuThrottleRate}x`,
        cpuThrottleRate,
      };

export const hardwareCohortRejection = ({
  hardwareGpuRequested,
  graphicsMetadata,
}) => {
  if (!hardwareGpuRequested || graphicsMetadata.renderingClass === "hardware") {
    return null;
  }
  const renderer = graphicsMetadata.backend?.renderer || "unidentified renderer";
  return `Hardware GPU measurement was rejected: observed ${graphicsMetadata.renderingClass} rendering (${renderer}). Use an installed, hardware-accelerated browser and keep this run out of hardware cohorts.`;
};
