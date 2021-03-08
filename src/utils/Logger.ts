import {createLogger, transports as Transports, format, info} from 'winston';
import "winston-daily-rotate-file";

const { printf, combine, timestamp, json, colorize } = format;

/**
 * Formatting for the standard output transport.
 *
 * Ideally, we don't have to read JSON whilst reading stdout, so we'll make a readable format
 * with the timestamp, log level and message.
 */
const consoleLogFormat = printf((information) => {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${information.level}]: ${information.message}`;
});

/**
 * Logger for the bot with split transports.
 *
 * Logger saves colorized output to standard out and creates a daily rotated log file
 * of the same logs for safekeeping purposes.
 */
export const Logger = createLogger({
    format: json(),
    transports: [
        new Transports.Console({
            level: 'info',
            format: combine(colorize(), consoleLogFormat),
        }),
        new Transports.DailyRotateFile({
                level: 'info',
                filename: 'logs/BreadBot-%DATE%.log',
                datePattern: 'YYYY-MM-DD-HH',
                zippedArchive: true,
                maxSize: '20m',
                maxFiles: '14d'
        }),
    ],
});
