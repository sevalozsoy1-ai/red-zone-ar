const PLACEHOLDER_HOSTS = new Set([
  'example.com',
  'example.org',
  'example.net',
  'localhost',
  '127.0.0.1',
  '::1',
]);

function fail(message) {
  console.error(`Release configuration invalid: ${message}`);
  process.exitCode = 1;
}

function environmentFromArgs() {
  const argument = process.argv.find((value) => value.startsWith('--environment='));
  const requested = argument?.slice('--environment='.length).trim().toLowerCase();
  const fromEnv = process.env.EXPO_PUBLIC_APP_ENV?.trim().toLowerCase();
  const environment = requested || fromEnv;

  if (!environment) {
    fail('set EXPO_PUBLIC_APP_ENV to development, test, or production');
    return null;
  }

  if (!['development', 'test', 'production'].includes(environment)) {
    fail(`unsupported EXPO_PUBLIC_APP_ENV "${environment}"`);
    return null;
  }

  if (requested && fromEnv && requested !== fromEnv) {
    fail(`--environment=${requested} does not match EXPO_PUBLIC_APP_ENV=${fromEnv}`);
    return null;
  }

  return environment;
}

function hasPreviewHost(hostname) {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  return host === 'replit.dev'
    || host.endsWith('.replit.dev')
    || host.endsWith('.repl.co')
    || host.endsWith('.replit.com')
    || host === 'localhost'
    || host === '127.0.0.1'
    || host === '::1';
}

function validate() {
  const environment = environmentFromArgs();
  if (!environment) return;

  const explicit = process.env.EXPO_PUBLIC_API_URL?.trim();
  const fallbackDomain = process.env.EXPO_PUBLIC_DOMAIN?.trim();
  const rawValue = explicit || (environment === 'development' ? fallbackDomain : undefined);

  if (!rawValue) {
    if (environment === 'development') {
      console.log('Development API URL is not set; relative API requests remain enabled.');
      return;
    }
    fail(`${environment} builds require an explicit EXPO_PUBLIC_API_URL`);
    return;
  }

  if (environment === 'production' && !explicit) {
    fail('production requires EXPO_PUBLIC_API_URL rather than EXPO_PUBLIC_DOMAIN');
    return;
  }

  if (environment === 'production' && !/^https:\/\//i.test(rawValue)) {
    fail('production EXPO_PUBLIC_API_URL must be a fully-qualified HTTPS URL');
    return;
  }

  let parsed;
  try {
    parsed = new URL(/^https?:\/\//i.test(rawValue) ? rawValue : `https://${rawValue}`);
  } catch {
    fail('EXPO_PUBLIC_API_URL must be a valid HTTP(S) URL');
    return;
  }

  if (parsed.username || parsed.password) {
    fail('EXPO_PUBLIC_API_URL must not contain credentials');
  }

  const host = parsed.hostname.toLowerCase().replace(/\.$/, '');
  if (
    PLACEHOLDER_HOSTS.has(host)
    || host === 'example'
    || host.endsWith('.example')
    || host.endsWith('.example.com')
    || host.endsWith('.example.org')
    || host.endsWith('.example.net')
    || host.endsWith('.invalid')
    || host.endsWith('.test')
    || host.endsWith('.localhost')
    || host.includes('placeholder')
  ) {
    fail('EXPO_PUBLIC_API_URL must not use a placeholder or localhost host');
  }

  if (environment === 'production' && hasPreviewHost(host)) {
    fail('production EXPO_PUBLIC_API_URL must not point to a Replit preview/dev or local host');
  }

  if (environment === 'test' && parsed.protocol !== 'https:') {
    fail('test device builds must use HTTPS; use a trusted tunnel or dev deployment');
  }

  if (process.env.EXPO_PUBLIC_ALLOW_INSECURE_API === 'true' && environment === 'production') {
    fail('EXPO_PUBLIC_ALLOW_INSECURE_API cannot be enabled for production');
  }

  if (process.exitCode) return;
  console.log(`API configuration accepted for ${environment}: ${host}`);
}

validate();