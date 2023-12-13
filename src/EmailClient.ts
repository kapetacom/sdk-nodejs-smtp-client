import React from "react";
import Config, { ConfigProvider, ResourceInfo } from '@kapeta/sdk-config';
import NodeMailer, {SendMailOptions, SentMessageInfo, Transporter} from 'nodemailer';
import {render} from "@react-email/render";

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

export const RESOURCE_TYPE = 'kapeta/resource-type-smtp-client';
export const PORT_TYPE = 'smtp';

const RESOURCE_NAME = 'smtpclient'; //SMTP resource name is always the same

export type SendReactMailOptions = Omit<SendMailOptions,'text'|'html'>  & { body:React.ReactElement }

export * from 'nodemailer';
export class EmailClient {
    private _ready: boolean = false;
    private _smtpInfo?: ResourceInfo;
    private _transport?: Transporter<SentMessageInfo>;

    /**
     * Initialise SMTP client
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
        const smtpInfo = await provider.getResourceInfo(RESOURCE_TYPE, PORT_TYPE, RESOURCE_NAME);
        if (!smtpInfo) {
            throw new Error('SMTP resource not found');
        }
        this._smtpInfo = smtpInfo;

        this._transport = NodeMailer.createTransport({
            host: this._smtpInfo.host,
            port: parseInt('' + this._smtpInfo.port),
            secure: trueIsh(this._smtpInfo.options?.tls),
            auth: {
                user: this._smtpInfo.credentials?.username,
                pass: this._smtpInfo.credentials?.password,
            }
        });
        console.log('Connecting to SMTP server at %s:%s', this._smtpInfo.host, this._smtpInfo.port);


        try {
            await this._transport.verify();
        } catch (err) {
            console.error('Failed to connect to SMTP server at %s:%s', this._smtpInfo.host, this._smtpInfo.port, err);
            throw new Error('Failed to connect to SMTP server');
        }

        console.log('Connected to SMTP server at %s:%s', this._smtpInfo.host, this._smtpInfo.port);

        this._ready = true;
    }

    public async send(opts: SendMailOptions): Promise<SentMessageInfo> {
        if (!this._ready) {
            throw new Error('SMTPClient not ready');
        }

        if (!opts.from) {
            throw new Error('Missing from address');
        }

        if (!opts.subject) {
            throw new Error('Missing subject');
        }

        return this.transport.sendMail(opts);
    }

    public async sendReact(opts: SendReactMailOptions): Promise<SentMessageInfo> {
        const html = render(opts.body, {
            plainText: false
        });

        const text = render(opts.body, {
            plainText: true
        });

        return this.send({
            ...opts,
            html,
            text
        });
    }

    public get transport():Transporter<SentMessageInfo> {
        if (!this._ready) {
            throw new Error('SMTP Transport not ready');
        }

        return this._transport!;
    }
}
