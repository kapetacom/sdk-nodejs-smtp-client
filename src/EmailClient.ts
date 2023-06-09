import Config, { ConfigProvider, ResourceInfo } from '@kapeta/sdk-config';
import { SMTPClient, MessageHeaders,AUTH_METHODS }  from 'emailjs';
const RESOURCE_TYPE = 'kapeta/resource-type-smtp-client';
const PORT_TYPE = 'smtp';
type SimpleSendOpts = Omit<MessageHeaders, "from"> & {from?: string};
export type EmailSendOptions = MessageHeaders|SimpleSendOpts;

function trueIsh(value: any) {
    if (!value) {
        return false;
    }

    if (value === true) {
        return true;
    }
    value = value.toLowerCase();
    return value === '1' || value === 'true' || value === 'yes';
}

export * from 'emailjs';
export class EmailClient {
    private _ready: boolean = false;
    private _smtpInfo?: ResourceInfo;
    private _client?: SMTPClient;

    /**
     * Initialise SMTP client
     *
     * @param {string} resourceName
     */
    constructor() {
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
    async init(provider: ConfigProvider) {
        this._smtpInfo = await provider.getResourceInfo(RESOURCE_TYPE, PORT_TYPE, PORT_TYPE);
        const authentication = this._smtpInfo.options?.authentication
            ? (this._smtpInfo.options?.authentication.split(',') as (keyof typeof AUTH_METHODS)[])
            : [AUTH_METHODS.PLAIN];

        this._client = new SMTPClient({
            host: this._smtpInfo.host,
            port: parseInt('' + this._smtpInfo.port),
            user: this._smtpInfo.credentials?.username,
            password: this._smtpInfo.credentials?.password,
            ssl: trueIsh(this._smtpInfo.options?.ssl),
            tls: trueIsh(this._smtpInfo.options?.tls),
            authentication,
        });

        await this._testConnection();

        this._ready = true;
    }

    async send(message: MessageHeaders|SimpleSendOpts) {
        if (!this._ready) {
            throw new Error('SMTPClient not ready');
        }

        if (!message.from) {
            throw new Error('Missing from address');
        }

        return this._client!.sendAsync(message as MessageHeaders);
    }

    /**
     *
     * @return {EmailJS.SMTPConnection}
     */
    get smtp() {
        if (!this._ready) {
            throw new Error('SMTPClient not ready');
        }

        return this._client!.smtp;
    }

    async _testConnection() {
        return new Promise((resolve, reject) => {
            this._client!.smtp.connect((err) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(null);
            });
        });
    }
}
