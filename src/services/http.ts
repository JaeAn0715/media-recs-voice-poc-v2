const DEFAULT_TIMEOUT_MS = 15000;

export class RequestTimeoutError extends Error {
  constructor(label: string) {
    super(`${label} 응답이 ${DEFAULT_TIMEOUT_MS / 1000}초 안에 오지 않았습니다.`);
    this.name = 'RequestTimeoutError';
  }
}

export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  label = '요청',
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      cache: 'no-store',
      signal: controller.signal,
    });
  } catch (error) {
    const isAbort =
      (error instanceof DOMException && error.name === 'AbortError') ||
      (error instanceof Error && error.name === 'AbortError');
    if (isAbort) {
      throw new RequestTimeoutError(label);
    }
    throw new Error(
      `${label} 네트워크 오류: ${error instanceof Error ? error.message : '연결에 실패했습니다.'}`,
    );
  } finally {
    window.clearTimeout(timer);
  }
}

export async function readApiError(response: Response): Promise<string> {
  const text = await response.text();
  if (!text) {
    return `HTTP ${response.status}`;
  }
  try {
    const parsed = JSON.parse(text) as {
      error?: { message?: string } | string;
      error_description?: string;
      message?: string;
    };
    if (typeof parsed.error === 'string') {
      return parsed.error_description || parsed.error;
    }
    return parsed.error?.message || parsed.error_description || parsed.message || text;
  } catch {
    return text;
  }
}
