import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/libs/db';
import { OkPacket, RowDataPacket } from 'mysql2';
import { jwtVerify } from 'jose';
import bcrypt from 'bcrypt';
import { sendPasswordChangeEmail, sendPasswordChangeRejectedEmail } from '@/libs/emailConfig';

interface SolicitudPasswordRow extends RowDataPacket {
  PK_CAMBIO_PASSWORD_SOLICITUD: number;
  XEUSU_CODIGO: number;
  USU_NOMBRE: string;
  PEI_EMAIL_INSTITUCIONAL: string;
  PEI_NOMBRE: string;
  PEI_APELLIDO_PATERNO: string;
  ESTADO: string;
}

export default async function managePasswordChangeHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: `Método ${req.method} no permitido` });
  }

  const { miEspacioSession } = req.cookies;
  if (!miEspacioSession) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  try {
    const { payload } = await jwtVerify(
      miEspacioSession,
      new TextEncoder().encode('secret')
    );

    // Verificar si el usuario es Admin Root (PK_TMSROL = 3)
    if (payload.CodRol !== 3) {
      return res.status(403).json({ error: 'No tienes permisos para realizar esta acción' });
    }

    const { solicitudId, accion, comentario, nuevaPassword } = req.body;

    if (!solicitudId || !accion || !['Aceptado', 'Rechazado'].includes(accion)) {
      return res.status(400).json({ error: 'Datos inválidos' });
    }

    if (accion === 'Aceptado' && !nuevaPassword) {
      return res.status(400).json({ error: 'La nueva contraseña es requerida para aceptar la solicitud' });
    }

    if (accion === 'Aceptado' && nuevaPassword.length < 6) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }

    // Obtener la solicitud
    const [solicitudes] = await pool.query<SolicitudPasswordRow[]>(
       `SELECT PK_CAMBIO_PASSWORD_SOLICITUD, XEUSU_CODIGO, USU_NOMBRE, PEI_EMAIL_INSTITUCIONAL, 
              PEI_NOMBRE, PEI_APELLIDO_PATERNO, ESTADO 
       FROM T_CAMBIO_PASSWORD_SOLICITUD 
       WHERE PK_CAMBIO_PASSWORD_SOLICITUD = ? AND ESTADO = ?`,
      [solicitudId, 'Pendiente']
    );

    if (solicitudes.length === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada o ya procesada' });
    }

    const solicitud = solicitudes[0];

    // Iniciar transacción
    await pool.query('START TRANSACTION');

    try {
      if (accion === 'Aceptado') {
        // Hashear la nueva contraseña
        const hashedPassword = await bcrypt.hash(nuevaPassword, 10);

        // Actualizar la contraseña del usuario
        await pool.query(
          'UPDATE T_MSUSUARIO SET XEUSU_PASWD = ? WHERE XEUSU_CODIGO = ?',
          [hashedPassword, solicitud.XEUSU_CODIGO]
        );

        console.log(`Contraseña actualizada para usuario: ${solicitud.USU_NOMBRE}`);
      }

      // Actualizar el estado de la solicitud
      await pool.query(
        `UPDATE T_CAMBIO_PASSWORD_SOLICITUD 
         SET ESTADO = ?, FECHA_RESPUESTA = NOW(), COMENTARIO_ADMIN = ?, ADMIN_PROCESADOR = ? 
         WHERE PK_CAMBIO_PASSWORD_SOLICITUD = ?`,
        [accion, comentario || null, payload.NombreUsuario, solicitudId]
      );

      // Confirmar transacción
      await pool.query('COMMIT');

      // Enviar email según la acción realizada
      const adminName = payload.NombreUsuario as string;
      const fullName = `${solicitud.PEI_NOMBRE} ${solicitud.PEI_APELLIDO_PATERNO}`;

      if (accion === 'Aceptado') {
        // Enviar email con la nueva contraseña
        const emailResult = await sendPasswordChangeEmail(
          solicitud.PEI_EMAIL_INSTITUCIONAL,
          solicitud.USU_NOMBRE,
          fullName,
          nuevaPassword,
          adminName,
          comentario
        );

        if (!emailResult.success) {
          console.error('Error al enviar email de confirmación:', emailResult.error);
          // No fallar la operación por el email, solo logear el error
        } else {
          console.log('Email de nueva contraseña enviado exitosamente');
        }
      } else {
        // Enviar email de rechazo
        const emailResult = await sendPasswordChangeRejectedEmail(
          solicitud.PEI_EMAIL_INSTITUCIONAL,
          solicitud.USU_NOMBRE,
          fullName,
          adminName,
          comentario
        );

        if (!emailResult.success) {
          console.error('Error al enviar email de rechazo:', emailResult.error);
        } else {
          console.log('Email de rechazo enviado exitosamente');
        }
      }

      const mensaje = accion === 'Aceptado' 
        ? `Solicitud aceptada, contraseña actualizada y email enviado con éxito para ${solicitud.USU_NOMBRE}`
        : `Solicitud rechazada y email de notificación enviado con éxito`;

      return res.status(200).json({ 
        message: mensaje,
        detalles: {
          usuario: solicitud.USU_NOMBRE,
          accion: accion,
          procesadoPor: adminName,
          emailEnviado: true
        }
      });

      

    } catch (error) {
      // Rollback en caso de error
      await pool.query('ROLLBACK');
      throw error;
    }

  } catch (error: any) {
    console.error('Error al procesar la solicitud de cambio de contraseña:', error);
    return res.status(500).json({ 
      error: 'Error al procesar la solicitud',
      details: error.message || 'Error desconocido'
    });
  }
}