// libs/emailConfig.ts
import nodemailer from 'nodemailer';

// Configuración del transporter de email
export const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail', // Puedes cambiar por otro servicio
    auth: {
      user: process.env.EMAIL_USER, // Tu email
      pass: process.env.EMAIL_PASSWORD, // Tu contraseña de aplicación
    },
    // Configuración adicional para Gmail
    secure: true,
    port: 465,
  });
};

// Función para enviar email de nueva contraseña
export const sendPasswordChangeEmail = async (
  toEmail: string,
  userName: string,
  fullName: string,
  newPassword: string,
  adminName: string,
  comentario?: string
) => {
  const transporter = createTransporter();

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Cambio de Contraseña - miESPE</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
            }
            .header {
                background-color: #1C6758;
                color: white;
                padding: 20px;
                text-align: center;
                border-radius: 5px 5px 0 0;
            }
            .content {
                background-color: #f9f9f9;
                padding: 30px;
                border-radius: 0 0 5px 5px;
                border: 1px solid #ddd;
            }
            .password-box {
                background-color: #e9ecef;
                border: 2px solid #1C6758;
                border-radius: 5px;
                padding: 15px;
                margin: 20px 0;
                text-align: center;
                font-size: 18px;
                font-weight: bold;
            }
            .warning {
                background-color: #fff3cd;
                border: 1px solid #ffeaa7;
                color: #856404;
                padding: 15px;
                border-radius: 5px;
                margin: 20px 0;
            }
            .footer {
                text-align: center;
                margin-top: 30px;
                font-size: 12px;
                color: #666;
            }
            .logo {
                max-width: 200px;
                margin-bottom: 10px;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🔐 Cambio de Contraseña Exitoso</h1>
            <p>Sistema miESPE - Universidad de las Fuerzas Armadas</p>
        </div>
        
        <div class="content">
            <h2>Hola ${fullName},</h2>
            
            <p>Tu solicitud de cambio de contraseña ha sido <strong>aprobada</strong> por un administrador.</p>
            
            <h3>📋 Detalles de la solicitud:</h3>
            <ul>
                <li><strong>Usuario:</strong> ${userName}</li>
                <li><strong>Email:</strong> ${toEmail}</li>
                <li><strong>Procesado por:</strong> ${adminName}</li>
                <li><strong>Fecha:</strong> ${new Date().toLocaleString('es-ES')}</li>
            </ul>
            
            ${comentario ? `
            <h3>💬 Comentario del administrador:</h3>
            <p style="background-color: #e3f2fd; padding: 10px; border-radius: 5px; border-left: 4px solid #2196f3;">
                ${comentario}
            </p>
            ` : ''}
            
            <h3>🔑 Tu nueva contraseña temporal:</h3>
            <div class="password-box">
                ${newPassword}
            </div>
            
            <div class="warning">
                <strong>⚠️ Importante:</strong>
                <ul style="margin: 10px 0;">
                    <li>Esta es una contraseña temporal</li>
                    <li>Por seguridad, te recomendamos cambiarla después del primer inicio de sesión</li>
                    <li>No compartas esta contraseña con nadie</li>
                    <li>Si no solicitaste este cambio, contacta inmediatamente al administrador</li>
                </ul>
            </div>
            
            <h3>🚀 Próximos pasos:</h3>
            <ol>
                <li>Inicia sesión en miESPE con tu nueva contraseña</li>
                <li>Ve a tu perfil para cambiar la contraseña por una personalizada</li>
                <li>Asegúrate de recordar tu nueva contraseña</li>
            </ol>
            
            <p style="margin-top: 30px;">
                Si tienes alguna pregunta o problema, no dudes en contactar al soporte técnico.
            </p>
            
            <p>
                <strong>Saludos cordiales,</strong><br>
                Equipo de Administración miESPE
            </p>
        </div>
        
        <div class="footer">
            <p>Este es un mensaje automático del sistema miESPE</p>
            <p>Universidad de las Fuerzas Armadas ESPE</p>
            <p>No responder a este correo</p>
        </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"miESPE - Sistema" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: '🔐 Nueva Contraseña - miESPE',
    html: htmlContent,
    text: `
      Hola ${fullName},
      
      Tu solicitud de cambio de contraseña ha sido aprobada.
      
      Usuario: ${userName}
      Nueva contraseña temporal: ${newPassword}
      Procesado por: ${adminName}
      Fecha: ${new Date().toLocaleString('es-ES')}
      
      ${comentario ? `Comentario del administrador: ${comentario}` : ''}
      
      Por favor, inicia sesión con esta nueva contraseña y cámbiala por una personalizada.
      
      Saludos,
      Equipo miESPE
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email enviado exitosamente:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error al enviar email:', error);
    return { success: false, error: error };
  }
};

// Función para enviar email de solicitud rechazada
export const sendPasswordChangeRejectedEmail = async (
  toEmail: string,
  userName: string,
  fullName: string,
  adminName: string,
  comentario?: string
) => {
  const transporter = createTransporter();

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Solicitud Rechazada - miESPE</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
            }
            .header {
                background-color: #dc3545;
                color: white;
                padding: 20px;
                text-align: center;
                border-radius: 5px 5px 0 0;
            }
            .content {
                background-color: #f9f9f9;
                padding: 30px;
                border-radius: 0 0 5px 5px;
                border: 1px solid #ddd;
            }
            .info {
                background-color: #f8d7da;
                border: 1px solid #f5c6cb;
                color: #721c24;
                padding: 15px;
                border-radius: 5px;
                margin: 20px 0;
            }
            .footer {
                text-align: center;
                margin-top: 30px;
                font-size: 12px;
                color: #666;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>❌ Solicitud de Cambio de Contraseña Rechazada</h1>
            <p>Sistema miESPE - Universidad de las Fuerzas Armadas</p>
        </div>
        
        <div class="content">
            <h2>Hola ${fullName},</h2>
            
            <p>Lamentamos informarte que tu solicitud de cambio de contraseña ha sido <strong>rechazada</strong> por un administrador.</p>
            
            <h3>📋 Detalles de la solicitud:</h3>
            <ul>
                <li><strong>Usuario:</strong> ${userName}</li>
                <li><strong>Email:</strong> ${toEmail}</li>
                <li><strong>Procesado por:</strong> ${adminName}</li>
                <li><strong>Fecha:</strong> ${new Date().toLocaleString('es-ES')}</li>
            </ul>
            
            ${comentario ? `
            <h3>💬 Motivo del rechazo:</h3>
            <div class="info">
                ${comentario}
            </div>
            ` : ''}
            
            <h3>🔄 ¿Qué puedes hacer?</h3>
            <ul>
                <li>Contactar directamente al administrador para más información</li>
                <li>Verificar que la justificación sea válida y completa</li>
                <li>Enviar una nueva solicitud si es necesario</li>
                <li>Acudir presencialmente al área de sistemas si el problema persiste</li>
            </ul>
            
            <p style="margin-top: 30px;">
                Si consideras que esto es un error o necesitas ayuda adicional, no dudes en contactar al soporte técnico.
            </p>
            
            <p>
                <strong>Saludos cordiales,</strong><br>
                Equipo de Administración miESPE
            </p>
        </div>
        
        <div class="footer">
            <p>Este es un mensaje automático del sistema miESPE</p>
            <p>Universidad de las Fuerzas Armadas ESPE</p>
            <p>No responder a este correo</p>
        </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"miESPE - Sistema" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: '❌ Solicitud de Cambio de Contraseña Rechazada - miESPE',
    html: htmlContent,
    text: `
      Hola ${fullName},
      
      Tu solicitud de cambio de contraseña ha sido rechazada.
      
      Usuario: ${userName}
      Procesado por: ${adminName}
      Fecha: ${new Date().toLocaleString('es-ES')}
      
      ${comentario ? `Motivo del rechazo: ${comentario}` : ''}
      
      Contacta al administrador para más información.
      
      Saludos,
      Equipo miESPE
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email de rechazo enviado exitosamente:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error al enviar email de rechazo:', error);
    return { success: false, error: error };
  }
};