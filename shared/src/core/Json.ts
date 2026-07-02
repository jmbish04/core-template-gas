export function safeJsonParse<T>(value: string): T {
  try {
    let cleaned = value.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```[a-zA-Z0-9_-]*\s*/, '').replace(/\s*```$/, '');
    }

    return JSON.parse(cleaned) as T;
  } catch (error) {
    throw new Error(`Expected valid JSON but received: ${value.slice(0, 200)}; cause=${String(error)}`);
  }
}

export function stringify(value: unknown): string {
  return JSON.stringify(value, null, 2);
}
