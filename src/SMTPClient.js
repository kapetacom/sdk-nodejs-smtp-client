const Config = require('@kapeta/sdk-config');
const EmailJS =  require('emailjs');

const RESOURCE_TYPE = "kapeta/resource-type-smtp-client";
const PORT_TYPE = "smtp";

function trueIsh(value) {
    if (!value) {
        return false;
    }

    if (value === true) {
        return true;
    }
    value = value.toLowerCase();
    return value === '1' || value === 'true' || value === 'yes';
}

class SMTPClient {

    /**
     * Initialise SMTP client
     *
     * @param {string} resourceName
     */
    constructor() {
        this._ready = false;

        /**
         *
         * @type {ResourceInfo}
         * @private
         */
        this._smtpInfo = null;

        /**
         *
         * @type {EmailJS.SMTPClient}
         * @private
         */
        this._client = null;

        //Add init method to startup sequence
        Config.onReady(async (provider) => {
            await this.init(provider);
        });
    }

    /**
     * Called automatically during startup sequence.
     *
     * @param {ConfigProvider} provider
     * @return {Promise<void>}
     */
    async init(provider) {
        this._smtpInfo = await provider.getResourceInfo(RESOURCE_TYPE, PORT_TYPE, PORT_TYPE);
        const authentication = this._smtpInfo.options?.authentication ?
            this._smtpInfo.options?.authentication.split(',') : ['PLAIN'];

        this._client = new EmailJS.SMTPClient({
            host: this._smtpInfo.host,
            port: this._smtpInfo.port,
            user: this._smtpInfo.credentials?.username,
            password: this._smtpInfo.credentials?.password,
            ssl: trueIsh(this._smtpInfo.options?.ssl),
            tls: trueIsh(this._smtpInfo.options?.tls),
            authentication
        });

        await this._testConnection();

        this._ready = true;


    }

    /**
     *
     * @param {EmailJS.Message | EmailJS.MessageHeaders} message
     * @return {Promise<EmailJS.Message>}
     */
    async send(message) {
        if (!this._ready) {
            throw new Error('SMTPClient not ready');
        }

        return this._client.sendAsync(message);
    }

    /**
     *
     * @return {EmailJS.SMTPConnection}
     */
    get smtp() {
        if (!this._ready) {
            throw new Error('SMTPClient not ready');
        }

        return this._client.smtp;
    }

    async _testConnection() {
        return  new Promise((resolve, reject) => {
            this._client.smtp.connect((err) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            })
        });
    }

}


module.exports = SMTPClient;