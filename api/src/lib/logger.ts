function log(level: string, args: unknown[]): void {
  const line = `${new Date().toISOString()} ${level}`
  if (level === 'ERROR') console.error(line, ...args)
  else console.log(line, ...args)
}

export const logger = {
  info: (...args: unknown[]) => log('INFO', args),
  warn: (...args: unknown[]) => log('WARN', args),
  error: (...args: unknown[]) => log('ERROR', args),
  debug: (...args: unknown[]) => log('DEBUG', args),
}
