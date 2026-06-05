/** Lowercase labels for API enums and status strings shown in the UI. */
export function displayLabel(value: string): string {
  return value.replace(/_/g, " ").toLowerCase();
}

export function taskStatusLabel(status: string): string {
  return displayLabel(status);
}

export function fleetStatusLabel(status: string | undefined): string {
  if (!status) return "unknown";
  return displayLabel(status);
}
