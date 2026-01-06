const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.transporter = null;
    }

    /**
     * Configure email transporter based on provider
     * @param {Object} config - Email configuration from AlertSettings
     */
    configure(config) {
        const { emailProvider, emailConfig } = config;

        let transportConfig = {};

        switch (emailProvider) {
            case 'gmail':
                transportConfig = {
                    service: 'gmail',
                    auth: {
                        user: emailConfig.user,
                        pass: emailConfig.password
                    }
                };
                break;

            case 'outlook':
                transportConfig = {
                    service: 'hotmail', // Outlook uses 'hotmail' service name
                    auth: {
                        user: emailConfig.user,
                        pass: emailConfig.password
                    }
                };
                break;

            case 'smtp':
                transportConfig = {
                    host: emailConfig.host,
                    port: emailConfig.port || 587,
                    secure: emailConfig.secure || false, // true for 465, false for other ports
                    auth: {
                        user: emailConfig.user,
                        pass: emailConfig.password
                    }
                };
                break;

            default:
                throw new Error(`Unsupported email provider: ${emailProvider}`);
        }

        this.transporter = nodemailer.createTransport(transportConfig);
        this.fromAddress = emailConfig.from;
    }

    /**
     * Send alert email to multiple recipients
     * @param {Object} alert - Alert object
     * @param {Array} recipients - Array of email addresses
     * @param {String} agentName - Name of the agent
     */
    async sendAlert(alert, recipients, agentName) {
        if (!this.transporter) {
            throw new Error('Email service not configured');
        }

        if (!recipients || recipients.length === 0) {
            console.log('No recipients configured, skipping email');
            return;
        }

        const subject = this.getSubject(alert);
        const html = this.getHtmlTemplate(alert, agentName);

        const mailOptions = {
            from: this.fromAddress,
            to: recipients.join(', '),
            subject: subject,
            html: html
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log(`Alert email sent: ${info.messageId}`);
            return info;
        } catch (error) {
            console.error('Failed to send alert email:', error);
            throw error;
        }
    }

    /**
     * Generate email subject based on alert type and severity
     */
    getSubject(alert) {
        const severityEmoji = {
            critical: '🚨',
            warning: '⚠️',
            info: 'ℹ️'
        };

        const emoji = severityEmoji[alert.severity] || '📢';
        return `${emoji} Nexus Alert: ${alert.message}`;
    }

    /**
     * Generate HTML email template
     */
    getHtmlTemplate(alert, agentName) {
        const severityColors = {
            critical: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };

        const color = severityColors[alert.severity] || '#6b7280';
        const timestamp = new Date(alert.timestamp).toLocaleString();

        return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .alert-container {
            border-left: 4px solid ${color};
            background: #f9fafb;
            padding: 20px;
            border-radius: 8px;
        }
        .alert-header {
            background: ${color};
            color: white;
            padding: 15px;
            border-radius: 6px;
            margin-bottom: 20px;
        }
        .alert-header h2 {
            margin: 0;
            font-size: 20px;
        }
        .alert-body {
            padding: 15px;
        }
        .alert-field {
            margin-bottom: 12px;
        }
        .alert-field strong {
            display: inline-block;
            width: 120px;
            color: #4b5563;
        }
        .alert-details {
            background: white;
            padding: 15px;
            border-radius: 6px;
            margin-top: 15px;
            border: 1px solid #e5e7eb;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 12px;
        }
        .button {
            display: inline-block;
            padding: 12px 24px;
            background: ${color};
            color: white;
            text-decoration: none;
            border-radius: 6px;
            margin-top: 15px;
        }
    </style>
</head>
<body>
    <div class="alert-container">
        <div class="alert-header">
            <h2>Nexus Monitoring Alert</h2>
        </div>
        
        <div class="alert-body">
            <div class="alert-field">
                <strong>Severity:</strong>
                <span style="text-transform: uppercase; font-weight: bold; color: ${color};">${alert.severity}</span>
            </div>
            
            <div class="alert-field">
                <strong>Type:</strong>
                ${this.formatAlertType(alert.type)}
            </div>
            
            <div class="alert-field">
                <strong>Agent:</strong>
                ${agentName}
            </div>
            
            ${alert.containerName ? `
            <div class="alert-field">
                <strong>Container:</strong>
                ${alert.containerName}
            </div>
            ` : ''}
            
            <div class="alert-field">
                <strong>Message:</strong>
                ${alert.message}
            </div>
            
            <div class="alert-field">
                <strong>Time:</strong>
                ${timestamp}
            </div>
            
            ${Object.keys(alert.details || {}).length > 0 ? `
            <div class="alert-details">
                <strong>Additional Details:</strong>
                <pre style="margin-top: 10px; font-size: 12px;">${JSON.stringify(alert.details, null, 2)}</pre>
            </div>
            ` : ''}
        </div>
    </div>
    
    <div class="footer">
        <p>This is an automated alert from Nexus Monitoring System</p>
        <p>Please do not reply to this email</p>
    </div>
</body>
</html>
        `;
    }

    /**
     * Format alert type for display
     */
    formatAlertType(type) {
        const typeMap = {
            container_stopped: 'Container Stopped',
            container_error: 'Container Error',
            agent_offline: 'Agent Offline',
            high_cpu: 'High CPU Usage',
            high_memory: 'High Memory Usage',
            high_disk: 'High Disk Usage',
            docker_daemon_error: 'Docker Daemon Error'
        };
        return typeMap[type] || type;
    }

    /**
     * Test email configuration
     */
    async testConnection() {
        if (!this.transporter) {
            throw new Error('Email service not configured');
        }

        try {
            await this.transporter.verify();
            console.log('Email service connection verified');
            return true;
        } catch (error) {
            console.error('Email service connection failed:', error);
            throw error;
        }
    }
}

module.exports = new EmailService();
