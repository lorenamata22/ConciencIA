import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly resend: Resend;
  private readonly logger = new Logger(EmailService.name);
  private readonly fromAddress: string;
  private readonly frontendUrl: string;

  constructor(private readonly config: ConfigService) {
    this.resend = new Resend(this.config.get<string>('RESEND_API_KEY'));
    this.fromAddress = this.config.get<string>('ConciencIA', '<matheus.cabral@losdevs.com.br>');
    this.frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');
  }

  async sendPasswordReset(toEmail: string, token: string): Promise<void> {
    const resetUrl = `${this.frontendUrl}/reset-password/${token}`;

    const { error } = await this.resend.emails.send({
      from: this.fromAddress,
      to: toEmail,
      subject: 'Recuperar contraseña — ConciencIA',
      html: buildPasswordResetEmail(resetUrl),
    });

    if (error) {
      this.logger.error(`Falha ao enviar email de reset para ${toEmail}: ${error.message}`);
      throw new Error('Falha ao enviar email de recuperação.');
    }

    this.logger.log(`Email de reset enviado para ${toEmail}`);
  }
}

function buildPasswordResetEmail(resetUrl: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Recuperar contraseña</title>
</head>
<body style="margin:0;padding:0;background-color:#F5F3EE;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F3EE;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background-color:#85C9C3;padding:32px 40px;text-align:center;">
              <span style="font-size:28px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">ConciencIA</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#3D2B1F;">Recupera tu contraseña</p>
              <p style="margin:0 0 24px;font-size:14px;color:#7A6A5F;line-height:1.6;">
                Recibimos una solicitud para restablecer la contraseña de tu cuenta.
                Haz clic en el botón de abajo para crear una nueva contraseña.
              </p>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 24px;">
                    <a href="${resetUrl}"
                       style="display:inline-block;background-color:#85C9C3;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 32px;border-radius:100px;">
                      Restablecer contraseña
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:12px;color:#7A6A5F;line-height:1.6;">
                Si el botón no funciona, copia y pega este enlace en tu navegador:
              </p>
              <p style="margin:0 0 24px;font-size:12px;word-break:break-all;">
                <a href="${resetUrl}" style="color:#85C9C3;">${resetUrl}</a>
              </p>

              <p style="margin:0;font-size:12px;color:#7A6A5F;line-height:1.6;">
                Este enlace expira en <strong>1 hora</strong>.
                Si no solicitaste restablecer tu contraseña, puedes ignorar este mensaje.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #F0EDE8;text-align:center;">
              <p style="margin:0;font-size:11px;color:#A99E96;">
                © ${new Date().getFullYear()} ConciencIA · Este es un mensaje automático, no respondas a este correo.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
