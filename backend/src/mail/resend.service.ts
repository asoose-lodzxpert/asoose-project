import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

export interface SendMailOptions {
  to: string | string[];
  subject: string;
  /** Handlebars template name (e.g. 'vendor-login' or './vendor-login') */
  template?: string;
  /** Context variables passed to the Handlebars template */
  context?: Record<string, any>;
  /** Pre-rendered HTML — used directly if no template is given */
  html?: string;
  /** Plain text — converted to simple HTML if neither template nor html is set */
  text?: string;
}

@Injectable()
export class ResendService implements OnModuleInit {
  private client: Resend;
  private readonly from: string;
  private readonly templateDir: string;
  private readonly logger = new Logger(ResendService.name);

  constructor(private readonly config: ConfigService) {
    this.from = `Asoose <${this.config.get<string>('EMAIL_FROM', 'hello@asoose.com')}>`;
    // Templates are in src/libs/mail/templates/ and copied to dist/libs/mail/templates/
    // __dirname resolves to dist/mail/ in production
    this.templateDir = path.join(__dirname, '..', 'libs', 'mail', 'templates');
  }

  onModuleInit() {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    if (!apiKey) {
      this.logger.warn(
        'RESEND_API_KEY is not configured — emails will silently fail',
      );
    }
    this.client = new Resend(apiKey ?? '');
  }

  async sendMail(options: SendMailOptions): Promise<void> {
    let html = options.html;

    if (!html && options.template) {
      html = this.renderTemplate(options.template, options.context ?? {});
    }

    if (!html && options.text) {
      // Wrap plain text in minimal HTML
      html = `<div style="font-family:sans-serif;line-height:1.6;color:#222;">${options.text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>')}</div>`;
    }

    const to = Array.isArray(options.to) ? options.to : [options.to];

    try {
      const { error } = await this.client.emails.send({
        from: this.from,
        to,
        subject: options.subject,
        html: html ?? '',
      });

      if (error) {
        this.logger.error(
          `Resend error sending to ${to.join(', ')}: ${JSON.stringify(error)}`,
        );
        throw new Error(error.message);
      }
    } catch (err: any) {
      this.logger.error(
        `Failed to send email to ${to.join(', ')}: ${err.message}`,
        err.stack,
      );
      throw err;
    }
  }

  private renderTemplate(
    templateName: string,
    context: Record<string, any>,
  ): string {
    // Normalise: strip leading './' if present
    const name = templateName.replace(/^\.\//, '');
    const filePath = path.join(this.templateDir, `${name}.hbs`);

    if (!fs.existsSync(filePath)) {
      this.logger.warn(
        `Email template not found: ${filePath} — sending empty HTML body`,
      );
      return '';
    }

    const source = fs.readFileSync(filePath, 'utf-8');
    const compiled = handlebars.compile(source);
    return compiled(context);
  }
}
