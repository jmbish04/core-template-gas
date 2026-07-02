export function safeJsonParse<T>(value: string): T {
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    throw new Error(`Expected valid JSON but received: ${value.slice(0, 200)}; cause=${String(error)}`);
  }
}

export function stringify(value: unknown): string {
  return JSON.stringify(value, null, 2);
}
