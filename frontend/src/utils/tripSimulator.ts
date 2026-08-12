// Minimal frontend simulator utilities used by the dashboard/dev tools
export const makeTripPayload = (opts: any = {}) => ({
  routeId: opts.routeId || 1,
  departureTime:
    opts.departureTime || new Date(Date.now() + 3600 * 1000).toISOString(),
  expectedReturnTime:
    opts.expectedReturnTime || new Date(Date.now() + 7200 * 1000).toISOString(),
  vehiclePlate: opts.vehiclePlate || 'FE-123',
  driverName: opts.driverName || 'Sim Driver',
  assistantName: opts.assistantName || null,
  notes: opts.notes || null,
  status: opts.status || 'Not Started',
});

export const useSimulator = () => {
  const log: string[] = [];
  const append = (msg: string) => {
    log.push(msg);
  };
  return { log, append, makeTripPayload };
};
