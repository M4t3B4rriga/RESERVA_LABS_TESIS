import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/libs/db';
import { OkPacket, RowDataPacket } from 'mysql2';
import { Roles } from '@/libs/roles';
import { Permiso } from '@/libs/permiso';
import { SubMenuItem } from '@/libs/SubMenuItem';
import { SubSubMenuItem } from '@/libs/SubSubMenuItem';

export default async function handler(req: NextApiRequest, res: NextApiResponse<{ permisos: Permiso[] } | { message: string }>) {
  const { method } = req;
  const { id } = req.query;

  switch (method) {
    case 'GET':
      if (!id) {
        return res.status(400).json({ message: 'Al obtener los permisos' });
      }

      try {
        // Realizar la consulta a la base de datos para obtener los permisos según el ID del rol
        const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM t_mspermiso WHERE PK_TMSROL = ?', [id]);

        // Mapear los resultados de la consulta a un array de objetos de tipo Permiso
        const permisos: Permiso[] = rows.map((row) => ({
          PK_TMSPERMISO: row.PK_TMSPERMISO,
          PK_TMSROL: row.PK_TMSROL,
          PK_TMS_ITEM_MENU: row.PK_TMS_ITEM_MENU,
          PK_TMSSUBITEM_MENU: row.PK_TMSSUBITEM_MENU,
          PK_TMSSUB_SUBITEM_MENU: row.PK_TMSSUB_SUBITEM_MENU,
          PK_TMSFUNCIONALIDAD: row.PK_TMSFUNCIONALIDAD,
          PER_FECHA_ASIGNACION: row.PER_FECHA_ASIGNACION,
          ESTADO: row.ESTADO,
        }));

        return res.status(200).json({ permisos });
      } catch (error) {
        return res.status(500).json({ message: 'Error al obtener los permisos' });
      }

      break;

    case 'PUT':
      // Código para actualizar los permisos

      break;

    case 'DELETE':
      // Código para eliminar los permisos

      break;

    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      res.status(405).json({ message: `Método ${method} no permitido` });
      break;
  }
}
