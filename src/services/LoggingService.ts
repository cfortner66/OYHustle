export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: Record<string, any>;
  userId?: string;
  sessionId?: string;
}

class LoggingService {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private minLogLevel = __DEV__ ? LogLevel.DEBUG : LogLevel.WARN;
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 15)}`;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.minLogLevel;
  }

  private createLogEntry(
    level: LogLevel,
    category: string,
    message: string,
    data?: Record<string, any>,
    userId?: string
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      ...(data && { data }),
      ...(userId && { userId }),
      sessionId: this.sessionId,
    };
  }

  private addLog(entry: LogEntry): void {
    this.logs.push(entry);

    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output in development
    if (__DEV__) {
      const logMethod = this.getConsoleMethod(entry.level);
      const prefix = `[${entry.category}]`;
      const dataStr = entry.data ? JSON.stringify(entry.data, null, 2) : '';

      logMethod(`${prefix} ${entry.message}`, dataStr);
    }
  }

  private getConsoleMethod(level: LogLevel): (...args: any[]) => void {
    switch (level) {
      case LogLevel.DEBUG:
        return console.debug;
      case LogLevel.INFO:
        return console.info;
      case LogLevel.WARN:
        return console.warn;
      case LogLevel.ERROR:
        return console.error;
      default:
        return console.log;
    }
  }

  // Public logging methods
  debug(
    category: string,
    message: string,
    data?: Record<string, any>,
    userId?: string
  ): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    const entry = this.createLogEntry(
      LogLevel.DEBUG,
      category,
      message,
      data,
      userId
    );
    this.addLog(entry);
  }

  info(
    category: string,
    message: string,
    data?: Record<string, any>,
    userId?: string
  ): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    const entry = this.createLogEntry(
      LogLevel.INFO,
      category,
      message,
      data,
      userId
    );
    this.addLog(entry);
  }

  warn(
    category: string,
    message: string,
    data?: Record<string, any>,
    userId?: string
  ): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    const entry = this.createLogEntry(
      LogLevel.WARN,
      category,
      message,
      data,
      userId
    );
    this.addLog(entry);
  }

  error(
    category: string,
    message: string,
    data?: Record<string, any>,
    userId?: string
  ): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    const entry = this.createLogEntry(
      LogLevel.ERROR,
      category,
      message,
      data,
      userId
    );
    this.addLog(entry);
  }

  // Specialized logging methods
  logError(
    category: string,
    error: Error,
    additionalData?: Record<string, any>,
    userId?: string
  ): void {
    const errorData = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...additionalData,
    };
    this.error(category, `Error: ${error.message}`, errorData, userId);
  }

  logUserAction(
    action: string,
    data?: Record<string, any>,
    userId?: string
  ): void {
    this.info('USER_ACTION', action, data, userId);
  }

  logPerformance(
    operation: string,
    duration: number,
    additionalData?: Record<string, any>
  ): void {
    this.info('PERFORMANCE', `${operation} completed in ${duration}ms`, {
      duration,
      operation,
      ...additionalData,
    });
  }

  logNavigation(
    screen: string,
    params?: Record<string, any>,
    userId?: string
  ): void {
    this.info(
      'NAVIGATION',
      `Navigated to ${screen}`,
      { screen, params },
      userId
    );
  }

  logApiCall(
    method: string,
    url: string,
    statusCode?: number,
    duration?: number,
    error?: Error
  ): void {
    const data: Record<string, any> = { method, url };

    if (statusCode !== undefined) data['statusCode'] = statusCode;
    if (duration !== undefined) data['duration'] = duration;
    if (error) {
      data['error'] = {
        name: error.name,
        message: error.message,
      };
    }

    const level =
      error || (statusCode && statusCode >= 400)
        ? LogLevel.ERROR
        : LogLevel.INFO;
    const message = `API ${method} ${url} ${
      statusCode ? `- ${statusCode}` : ''
    }`;

    if (level === LogLevel.ERROR) {
      this.error('API', message, data);
    } else {
      this.info('API', message, data);
    }
  }

  // Utility methods
  getLogs(level?: LogLevel, category?: string, limit?: number): LogEntry[] {
    let filteredLogs = this.logs;

    if (level !== undefined) {
      filteredLogs = filteredLogs.filter((log) => log.level >= level);
    }

    if (category) {
      filteredLogs = filteredLogs.filter((log) => log.category === category);
    }

    if (limit) {
      filteredLogs = filteredLogs.slice(-limit);
    }

    return filteredLogs;
  }

  getLogsSummary(): {
    total: number;
    byLevel: Record<LogLevel, number>;
    byCategory: Record<string, number>;
  } {
    const summary = {
      total: this.logs.length,
      byLevel: {
        [LogLevel.DEBUG]: 0,
        [LogLevel.INFO]: 0,
        [LogLevel.WARN]: 0,
        [LogLevel.ERROR]: 0,
      },
      byCategory: {} as Record<string, number>,
    };

    this.logs.forEach((log) => {
      summary.byLevel[log.level]++;
      summary.byCategory[log.category] =
        (summary.byCategory[log.category] || 0) + 1;
    });

    return summary;
  }

  clearLogs(): void {
    this.logs = [];
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  // Future: Send logs to remote service (Sentry-ready)
  async syncLogs(): Promise<void> {
    // In a real implementation, this would send logs to a remote service like Sentry, LogRocket, etc.
    if (__DEV__) {
      console.info(
        '[LoggingService] Sync logs called - would send to remote service in production'
      );
    }
  }
}

// Export singleton instance
export const logService = new LoggingService();

// Export convenience functions
export const logDebug = (
  category: string,
  message: string,
  data?: Record<string, any>
) => logService.debug(category, message, data);

export const logInfo = (
  category: string,
  message: string,
  data?: Record<string, any>
) => logService.info(category, message, data);

export const logWarn = (
  category: string,
  message: string,
  data?: Record<string, any>
) => logService.warn(category, message, data);

export const logError = (
  category: string,
  message: string,
  data?: Record<string, any>
) => logService.error(category, message, data);

export const logException = (
  category: string,
  error: Error,
  data?: Record<string, any>
) => logService.logError(category, error, data);

export default logService;
