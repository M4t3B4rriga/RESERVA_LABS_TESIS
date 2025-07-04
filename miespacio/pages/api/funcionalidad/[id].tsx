import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/libs/db';
import { OkPacket, RowDataPacket } from 'mysql2';
import { Unidad } from '@/libs/unidad';


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Unidad[] | Unidad | { message: string }>
) {
  const { method } = req;
  const { id } = req.query;

  switch (method) {
    case 'GET':
      try {
        if (id) {
          const [rows] = await pool.query<RowDataPacket[]>(
            'SELECT * FROM T_MEUNIDAD WHERE PK_TMEUNIDAD = ?',
            [id]
          );
          if (rows.length === 0) {
            res.status(404).json({ message: 'Unidad no encontrada' });
            return;
          }
          const rol = rows[0] as Unidad;
          res.status(200).json(rol);
        } else {
          const [rows] = await pool.query<RowDataPacket[]>(`SELECT 
            PK_TMEUNIDAD as CodUnidad,
            UNI_NOMBRE as NombreUnidad,
            UNI_SIGLAS as Siglas,
            UNI_DESCRIPCION as DescripcionUnidad,
            ESTADO as Estado 
          FROM T_MEUNIDAD`);
          const unidades = rows as Unidad[];
          res.status(200).json(unidades);
        }
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener las unidades' });
      }
      break;

    case 'PUT':
      try {
        const { NombreUnidad, Siglas, DescripcionUnidad } = req.body;
        //realizar actualizacion
        const [result] = await pool.query<OkPacket>(
          'UPDATE T_MEUNIDAD SET UNI_NOMBRE = ?, UNI_SIGLAS = ?, UNI_DESCRIPCION = ? WHERE PK_TMEUNIDAD = ?',
          [NombreUnidad, Siglas, DescripcionUnidad, id]
        );
        if (result.affectedRows === 0) {
          res.status(404).json({ message: 'Unidad no encontrada' });
          return;
        }
        const [row] = await pool.query<any[]>('SELECT ESTADO FROM T_MEUNIDAD WHERE PK_TMEUNIDAD = ?', [id]);
        const unidadUpdated: Unidad = {
          CodUnidad: Number(id),
          NombreUnidad,
          Siglas,
          DescripcionUnidad,
          Estado: row[0].ESTADO
        };
        res.status(200).json(unidadUpdated);

      } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al actualizar la unidad' });
      }
      break;

    case 'DELETE':
      try {
        // Obtener el estado actual del registro
        const [registro] = await pool.query<any[]>('SELECT * FROM T_MEUNIDAD WHERE PK_TMEUNIDAD = ?', [id]);

        // Obtener el nuevo estado
        const newState = registro[0].ESTADO === 0 ? 1 : 0;

        // Actualizar el registro con el nuevo estado
        const [result] = await pool.query<OkPacket>('UPDATE T_MEUNIDAD SET ESTADO = ? WHERE PK_TMEUNIDAD = ?', [newState, id]);
        if (result.affectedRows === 0) {
          res.status(404).json({ message: 'Unidad no encontrada' });
          return;
        }

        const unidadUpdateed: Unidad = {
          CodUnidad: Number(id),
          NombreUnidad: registro[0].NombreUnidad,
          Siglas: registro[0].Siglas,
          DescripcionUnidad: registro[0].DescripcionUnidad,
          Estado: String(newState),
        };
        res.status(200).json(unidadUpdateed);
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al eliminar la unidad' });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      res.status(405).json({ message: `Método ${method} no permitido` });
      break;
  }
}