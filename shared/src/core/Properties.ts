export function getRequiredScriptProperty(name: string): string {
  const value = PropertiesService.getScriptProperties().getProperty(name);
  if (!value) {
    throw new Error(`Missing required script property: ${name}`);
  }

  return value;
}

export function getOptionalScriptProperty(name: string, fallback = ''): string {
  return PropertiesService.getScriptProperties().getProperty(name) ?? fallback;
}
