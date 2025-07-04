import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/libs/db';
import { OkPacket, RowDataPacket } from 'mysql2';
import { TipoEquipo } from '@/libs/tipoEquipo';


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TipoEquipo[] | TipoEquipo | { message: string }>
) {
  const { method } = req;
  const { id } = req.query;

  switch (method) {
    case 'GET':
      try {
        if (id) {
          const [rows] = await pool.query<RowDataPacket[]>(
            'SELECT * FROM T_METIPO_EQUIPO WHERE PK_TMETIPO_EQUIPO = ?',
            [id]
          );
          if (rows.length === 0) {
            res.status(404).json({ message: 'Tipo de equipo no encontrado' });
            return;
          }
          const tipoEquipo = rows[0] as TipoEquipo;
          res.status(200).json(tipoEquipo);
        } else {
          const [rows] = await pool.query<RowDataPacket[]>('SELECT PK_TMETIPO_EQUIPO AS CodTipoEquipo, TEQ_NOMBRE AS NombreTipoEquipo, TEQ_DESCRIPCION AS DescripcionTipoEquipo, ESTADO as Estado FROM T_METIPO_EQUIPO');
          const tiposEquipo = rows as TipoEquipo[];
          res.status(200).json(tiposEquipo);
        }
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener los tipos de equipo' });
      }
      break;

    case 'PUT':
      try {
        const { NombreTipoEquipo, DescripcionTipoEquipo } = req.body;
        //realizar actualizacion
        const [result] = await pool.query<OkPacket>(
          'UPDATE T_METIPO_EQUIPO SET TEQ_NOMBRE = ?, TEQ_DESCRIPCION = ? WHERE PK_TMETIPO_EQUIPO = ?',
          [NombreTipoEquipo, DescripcionTipoEquipo, id]
        );
        if (result.affectedRows === 0) {
          res.status(404).json({ message: 'TipoEquipo no encontrado' });
          return;
        }
        const [row] = await pool.query<any[]>('SELECT ESTADO FROM T_METIPO_EQUIPO WHERE PK_TMETIPO_EQUIPO = ?', [id]);
        const tipoEquipoUpdated: TipoEquipo = {
          CodTipoEquipo: Number(id),
          NombreTipoEquipo,
          DescripcionTipoEquipo,
          Estado: row[0].ESTADO
        };
        res.status(200).json(tipoEquipoUpdated);

      } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al actualizar el tipo de equipo' });
      }
      break;

    case 'DELETE':
      try {
        // Obtener el estado actual del registro
        const [registro] = await pool.query<any[]>('SELECT * FROM T_METIPO_EQUIPO WHERE PK_TMETIPO_EQUIPO = ?', [id]);

        // Obtener el nuevo estado
        const newState = registro[0].ESTADO === 0 ? 1 : 0;

        // Actualizar el registro con el nuevo estado
        const [result] = await pool.query<OkPacket>('UPDATE T_METIPO_EQUIPO SET ESTADO = ? WHERE PK_TMETIPO_EQUIPO = ?', [newState, id]);
        if (result.affectedRows === 0) {
          res.status(404).json({ message: 'tipo de equipo no encontrado' });
          return;
        }

        const TipoEquipoUpdateed: TipoEquipo = {
          CodTipoEquipo: Number(id),
          NombreTipoEquipo: registro[0].NombreTipoEquipo,
          DescripcionTipoEquipo: registro[0].DescripcionTipoEquipo,
          Estado: String(newState),
        };
        res.status(200).json(TipoEquipoUpdateed);
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al eliminar el tipo de equipo' });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      res.status(405).json({ message: `Método ${method} no permitido` });
      break;
  }
}