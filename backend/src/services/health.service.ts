export type HealthStatus = {
  status: "ok";
  service: string;
  timestamp: string;
};

export function getHealthStatus(): HealthStatus {
  return {
    status: "ok",
    service: "fantasy-cricket-api",
    timestamp: new Date().toISOString(),
  };
}
