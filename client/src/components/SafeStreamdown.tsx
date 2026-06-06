import { useMemo } from "react";
import {
  Streamdown as BaseStreamdown,
  defaultRehypePlugins,
  type StreamdownProps,
} from "streamdown";

type StreamdownOriginConfig = {
  defaultOrigin?: string | null;
};

type SafeStreamdownProps = StreamdownProps & {
  config?: StreamdownOriginConfig;
};

const FALLBACK_ORIGIN = "http://127.0.0.1:3847";

export function getStreamdownDefaultOrigin(config?: StreamdownOriginConfig) {
  const defaultOrigin =
    config?.defaultOrigin ||
    (typeof window !== "undefined" ? window.location.origin : "") ||
    FALLBACK_ORIGIN;

  try {
    const origin = new URL(defaultOrigin).origin;
    return origin && origin !== "null" ? origin : FALLBACK_ORIGIN;
  } catch {
    return FALLBACK_ORIGIN;
  }
}

function getSafeRehypePlugins(config?: StreamdownOriginConfig) {
  const hardenPlugin = defaultRehypePlugins.harden;
  const [plugin, options = {}] = Array.isArray(hardenPlugin)
    ? hardenPlugin
    : [hardenPlugin, {}];

  return Object.values({
    ...defaultRehypePlugins,
    harden: [
      plugin,
      {
        ...options,
        defaultOrigin: getStreamdownDefaultOrigin(config),
        allowedLinkPrefixes: options.allowedLinkPrefixes ?? ["*"],
        allowedImagePrefixes: options.allowedImagePrefixes ?? ["*"],
      },
    ],
  }) as StreamdownProps["rehypePlugins"];
}

export function SafeStreamdown({
  config,
  rehypePlugins,
  ...props
}: SafeStreamdownProps) {
  const safeRehypePlugins = useMemo(
    () => rehypePlugins ?? getSafeRehypePlugins(config),
    [config?.defaultOrigin, rehypePlugins]
  );

  return <BaseStreamdown rehypePlugins={safeRehypePlugins} {...props} />;
}

