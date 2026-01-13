/**
 * Custom Logger Utility
 * Provides timestamps in Indian Standard Time (IST)
 */

const chalk = require('chalk');

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
        // Don't stringify meta if it's already a string or empty
        let metaString = '';
        if (meta) {
            if (typeof meta === 'string') {
                metaString = ` ${meta}`;
            } else if (meta instanceof Error) {
                metaString = ` ${meta.stack || meta.message}`;
            } else {
                metaString = ` ${JSON.stringify(meta)}`;
            }
        }

        const ts = chalk.gray(`[${timestamp}]`);
        let lvl = '';

        switch (level) {
            case 'INFO': lvl = chalk.blue('[INFO]'); break;
            case 'ERROR': lvl = chalk.red('[ERROR]'); break;
            case 'WARN': lvl = chalk.yellow('[WARN]'); break;
            case 'DEBUG': lvl = chalk.gray('[DEBUG]'); break;
            case 'SUCCESS': lvl = chalk.green('[SUCCESS]'); break;
            default: lvl = `[${level}]`;
        }

        return `${ts} ${lvl} ${message}${metaString}`;
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

    success(message, meta) {
        console.log(this._formatMessage('SUCCESS', message, meta));
    }
}

module.exports = new Logger();
