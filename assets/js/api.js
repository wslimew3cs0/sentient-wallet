export function fullModeRequested() {
  const params = new URLSearchParams(location.search);
  return params.get("mode") === "full";
}

export async function assessWithLocalService(features) {
  const response = await fetch("http://localhost:8000/risk/assess", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(features),
  });
  if (!response.ok) throw new Error(`Local risk service returned ${response.status}`);
  return response.json();
}

export async function checkLocalService() {
  try {
    const response = await fetch("http://localhost:8000/health", { signal: AbortSignal.timeout(1200) });
    return response.ok ? response.json() : null;
  } catch {
    return null;
  }
}
