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

    // Obtener parámetros de query
    const { usuario, filter, page = 1, limit = 10 } = req.query;
    
    // Construir query base
    let baseQuery = `SELECT 
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
     FROM T_CAMBIO_PASSWORD_SOLICITUD`;

    let countQuery = `SELECT COUNT(*) as total FROM T_CAMBIO_PASSWORD_SOLICITUD`;
    
    // Array para condiciones WHERE
    const conditions: string[] = [];
    const queryParams: any[] = [];
    
    // Filtro por usuario (búsqueda por nombre de usuario)
    if (usuario && typeof usuario === 'string' && usuario.trim() !== '') {
      conditions.push('USU_NOMBRE LIKE ?');
      queryParams.push(`%${usuario.trim()}%`);
    }
    
    // Filtro por estado
    if (filter && typeof filter === 'string' && filter !== 'Todos') {
      conditions.push('ESTADO = ?');
      queryParams.push(filter);
    }
    
    // Agregar WHERE si hay condiciones
    if (conditions.length > 0) {
      const whereClause = ` WHERE ${conditions.join(' AND ')}`;
      baseQuery += whereClause;
      countQuery += whereClause;
    }
    
    // Agregar ORDER BY
    baseQuery += ` ORDER BY 
      CASE 
        WHEN ESTADO = 'Pendiente' THEN 1
        WHEN ESTADO = 'Aceptado' THEN 2
        WHEN ESTADO = 'Rechazado' THEN 3
      END,
      FECHA_SOLICITUD DESC`;
    
    // Agregar paginación
    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 10;
    const offset = (pageNum - 1) * limitNum;
    
    baseQuery += ` LIMIT ? OFFSET ?`;
    queryParams.push(limitNum, offset);
    
    // Ejecutar query principal
    const [solicitudes] = await pool.query<RowDataPacket[]>(baseQuery, queryParams);
    
    // Ejecutar query de conteo (sin los parámetros de paginación)
    const countParams = queryParams.slice(0, -2); // Remover LIMIT y OFFSET
    const [countResult] = await pool.query<RowDataPacket[]>(countQuery, countParams);
    const totalCount = countResult[0].total;

    return res.status(200).json({ 
      solicitudes,
      totalCount,
      total: solicitudes.length,
      pendientes: solicitudes.filter(s => s.ESTADO === 'Pendiente').length
    });

  } catch (error) {
    console.error('Error al obtener solicitudes:', error);
    return res.status(500).json({ error: 'Error al obtener las solicitudes' });
  }
}