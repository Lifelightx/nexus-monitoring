/**
 * Custom Logger Utility
 * Provides timestamps in Indian Standard Time (IST)
 */

class Logger {
    constructor() {
        this.timeZone = 'Asia/Kolkata';
    }

    _getTimestamp() {
        return new Date().toLocaleString('en-IN', {
            timeZone: this.timeZone,
            hour12: false,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    _formatMessage(level, message, meta = '') {
        const timestamp = this._getTimestamp();
        const metaString = meta ? ` ${JSON.stringify(meta)}` : '';
        return `[${timestamp}] [${level}] ${message}${metaString}`;
    }

    info(message, meta) {
        console.log(this._formatMessage('INFO', message, meta));
    }

    error(message, meta) {
        console.error(this._formatMessage('ERROR', message, meta));
    }

    warn(message, meta) {
        console.warn(this._formatMessage('WARN', message, meta));
    }

    debug(message, meta) {
        console.debug(this._formatMessage('DEBUG', message, meta));
    }
}

module.exports = new Logger();
