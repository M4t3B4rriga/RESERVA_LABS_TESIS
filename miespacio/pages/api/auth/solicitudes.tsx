import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/libs/db';
import { RowDataPacket } from 'mysql2';

interface SolicitudRow extends RowDataPacket {
  PK_REGISTRO_SOLICITUD: number;
  USU_NOMBRE: string;
  PEI_NOMBRE: string;
  PEI_APELLIDO_PATERNO: string;
  PEI_APELLIDO_MATERNO: string;
  PEI_EMAIL_INSTITUCIONAL: string;
  ROL: string;
  ESTADO: string;
  FECHA_SOLICITUD: string;
  COMENTARIO_ADMIN?: string;
}

export default async function solicitudesHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: `Método ${req.method} no permitido` });
  }

  try {
    const [rows] = await pool.query<SolicitudRow[]>(
      'SELECT * FROM T_REGISTRO_SOLICITUD ORDER BY FECHA_SOLICITUD DESC'
    );
    return res.status(200).json({ solicitudes: rows });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al obtener las solicitudes' });
  }
}