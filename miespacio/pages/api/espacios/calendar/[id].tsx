import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/libs/db';
import { OkPacket, RowDataPacket } from 'mysql2';
import { Espacio } from '@/libs/espacios';
import { jwtVerify } from 'jose';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;
  const { id } = req.query;

  switch (method) {
    case 'GET':
      try {
        const [rows] = await pool.query<RowDataPacket[]>(
          `SELECT 
            e.PK_TMEESPACIO as CodEspacio, e.PK_TMETIPO_ESPACIO as CodTipoEspacio, te.TES_NOMBRE as NombreTipoEspacio, te.TES_DESCRIPCION as DescripcionTipoEspacio, 
            e.PK_TMEUNIDAD as CodUnidad, u.UNI_NOMBRE as NombreUnidad, u.UNI_DESCRIPCION as DescripcionUnidad, e.ESP_NOMBRE as NombreEspacio, e.ESP_DESCRIPCION as DescripcionEspacio,
            e.ESP_CAPACIDAD as CapacidadEspacio, e.ESP_DESCRIPCION_UBICACION as DescripcionUbicacion, e.ESP_DIAS_ANTELACION as DiasAntelacion, e.ESP_DISPONIBILIDAD as Disponibilidad,
            e.ESP_FECHA_CREACION as FechaCreacion, e.ESP_FECHA_EDICION as FechaEdicion, e.ESTADO as Estado,
            f.FES_NOMBRE as NombreFoto, f.FES_RUTA as RutaFoto, f.FES_ORDEN as Orden, IFNULL(f.ESTADO, NULL) as Estado_Foto, te.ESTADO as Estado_TipoEspacio, u.ESTADO as Estado_Unidad
          FROM T_MEESPACIO e
          JOIN T_METIPO_ESPACIO te ON e.PK_TMETIPO_ESPACIO = te.PK_TMETIPO_ESPACIO
          JOIN T_MEUNIDAD u ON e.PK_TMEUNIDAD = u.PK_TMEUNIDAD
          LEFT JOIN (
            SELECT *
            FROM T_MEFOTO_ESPACIO
            WHERE ESTADO = 1
            AND (PK_TMEESPACIO, FES_ORDEN) IN (
              SELECT PK_TMEESPACIO, MIN(FES_ORDEN)
              FROM T_MEFOTO_ESPACIO
              WHERE ESTADO = 1
              GROUP BY PK_TMEESPACIO
            )
          ) f ON e.PK_TMEESPACIO = f.PK_TMEESPACIO
          WHERE e.PK_TMEESPACIO = ?`,
          [id]
        ); 

        if (rows.length === 0) {
          res.status(404).json({ message: 'Espacio no encontrado' });
          return;
        }
        const espacio = rows as Espacio[];

        res.status(200).json({ espacio });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener el espacio' });
      }
      break;

    default:
      res.setHeader('Allow', ['GET']);
      res.status(405).json({ message: `Método ${method} no permitido` });
      break;
  }
}