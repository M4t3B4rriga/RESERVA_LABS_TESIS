import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/libs/db';
import { RowDataPacket } from 'mysql2';
import { jwtVerify } from 'jose';

export default async function passwordChangeSolicitudesHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
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
      return res.status(403).json({ error: 'No tienes permisos para ver estas solicitudes' });
    }

    // Obtener todas las solicitudes de cambio de contraseña
    const [solicitudes] = await pool.query<RowDataPacket[]>(
      `SELECT 
        PK_CAMBIO_PASSWORD_SOLICITUD,
        XEUSU_CODIGO,
        USU_NOMBRE,
        PEI_EMAIL_INSTITUCIONAL,
        PEI_NOMBRE,
        PEI_APELLIDO_PATERNO,
        JUSTIFICACION,
        ESTADO,
        FECHA_SOLICITUD,
        FECHA_RESPUESTA,
        COMENTARIO_ADMIN,
        ADMIN_PROCESADOR
       FROM T_CAMBIO_PASSWORD_SOLICITUD 
       ORDER BY 
         CASE 
           WHEN ESTADO = 'Pendiente' THEN 1
           WHEN ESTADO = 'Aceptado' THEN 2
           WHEN ESTADO = 'Rechazado' THEN 3
         END,
         FECHA_SOLICITUD DESC`
    );

    return res.status(200).json({ 
      solicitudes,
      total: solicitudes.length,
      pendientes: solicitudes.filter(s => s.ESTADO === 'Pendiente').length
    });

  } catch (error) {
    console.error('Error al obtener solicitudes:', error);
    return res.status(500).json({ error: 'Error al obtener las solicitudes' });
  }
}