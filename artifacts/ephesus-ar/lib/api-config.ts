export type ApiEnvironment = 'development' | 'test' | 'production';

export type ApiConfig = {
  environment: ApiEnvironment;
  baseUrl: string | null;
};

const PLACEHOLDER_HOSTS = new Set([
  'example.com',
  'example.org',
  'example.net',
  'localhost',
  '127.0.0.1',
  '::1',
]);

function readEnvironment(): ApiEnvironment {
  const configured = process.env.EXPO_PUBLIC_APP_ENV?.trim().toLowerCase();
  if (configured === 'development' || configured === 'test' || configured === 'production') {
    return configured;
  }

  // A release bundle is always expected to opt into production explicitly.
  // NODE_ENV is only a fallback for tooling that does not pass app metadata.
  return process.env.NODE_ENV === 'production' ? 'production' : 'development';
}

function configuredApiValue(environment: ApiEnvironment): string | undefined {
  const explicitApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (explicitApiUrl) return explicitApiUrl;

  // A host-only Replit domain is convenient for Expo Go development, but a
  // production bundle must use an explicit API URL so it cannot accidentally
  // follow a preview/dev deployment.
  if (environment === 'development') {
    return process.env.EXPO_PUBLIC_DOMAIN?.trim() || undefined;
  }

  return undefined;
}

function isPlaceholderHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  return PLACEHOLDER_HOSTS.has(host)
    || host === 'example'
    || host.endsWith('.example')
    || host.endsWith('.example.com')
    || host.endsWith('.example.org')
    || host.endsWith('.example.net')
    || host.endsWith('.invalid')
    || host.endsWith('.test')
    || host.endsWith('.localhost')
    || host.includes('placeholder');
}

function isPreviewOrDevelopmentHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  return host === 'replit.dev'
    || host.endsWith('.replit.dev')
    || host.endsWith('.repl.co')
    || host.endsWith('.replit.com')
    || host === 'localhost'
    || host === '127.0.0.1'
    || host === '::1';
}

function parseBaseUrl(rawValue: string, environment: ApiEnvironment): string {
  const value = rawValue.trim();
  const hasProtocol = /^https?:\/\//i.test(value);

  if (environment === 'production' && !/^https:\/\//i.test(value)) {
    throw new Error(
      'Production API configuration must use a fully-qualified HTTPS EXPO_PUBLIC_API_URL.',
    );
  }

  const candidate = hasProtocol ? value : `https://${value}`;
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error('EXPO_PUBLIC_API_URL must be a valid HTTP(S) URL.');
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('EXPO_PUBLIC_API_URL must use HTTP or HTTPS.');
  }

  if (parsed.username || parsed.password) {
    throw new Error('EXPO_PUBLIC_API_URL must not contain credentials.');
  }

  if (isPlaceholderHost(parsed.hostname)) {
    throw new Error('EXPO_PUBLIC_API_URL must not use a placeholder or localhost host.');
  }

  if (environment === 'production') {
    if (parsed.protocol !== 'https:') {
      throw new Error('Production API configuration must use HTTPS.');
    }
    if (isPreviewOrDevelopmentHost(parsed.hostname)) {
      throw new Error(
        'Production API configuration must not point to a Replit preview/dev or local host.',
      );
    }
  }

  if (environment === 'test' && parsed.protocol !== 'https:') {
    throw new Error(
      'Test device builds must use an HTTPS EXPO_PUBLIC_API_URL; use a trusted tunnel or dev deployment.',
    );
  }

  parsed.pathname = parsed.pathname.replace(/\/+$/, '').replace(/\/api$/i, '') || '/';
  parsed.search = '';
  parsed.hash = '';
  return parsed.toString().replace(/\/$/, '');
}

export function resolveApiConfig(): ApiConfig {
  const environment = readEnvironment();
  const rawValue = configuredApiValue(environment);

  if (!rawValue) {
    if (environment === 'production' || environment === 'test') {
      throw new Error(
        `${environment} API configuration requires an explicit EXPO_PUBLIC_API_URL.`,
      );
    }
    return { environment, baseUrl: null };
  }

  return {
    environment,
    baseUrl: parseBaseUrl(rawValue, environment),
  };
}