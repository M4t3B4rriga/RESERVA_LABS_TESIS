import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/libs/db';
import { OkPacket, RowDataPacket } from 'mysql2';
import { TipoEvento } from '@/libs/tipoEvento';


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TipoEvento[] | TipoEvento | { message: string }>
) {
  const { method } = req;
  const { id } = req.query;

  switch (method) {
    case 'GET':
      try {
        if (id) {
          const [rows] = await pool.query<RowDataPacket[]>(
            'SELECT PK_TMRTIPO_EVENTO as CodTipoEvento, TEV_NOMBRE as NombreTipoEvento, TEV_DESCRIPCION as DescripcionTipoEvento, ESTADO as Estado FROM T_MRTIPO_EVENTO WHERE PK_TMRTIPO_EVENTO = ?',
            [id]
          );
          if (rows.length === 0) {
            res.status(404).json({ message: 'Tipo de evento no encontrado' });
            return;
          }
          const tipoEspacio = rows[0] as TipoEvento;
          res.status(200).json(tipoEspacio);
        } else {
          const [rows] = await pool.query<RowDataPacket[]>('SELECT PK_TMRTIPO_EVENTO as CodTipoEvento, TEV_NOMBRE as NombreTipoEvento, TEV_DESCRIPCION as DescripcionTipoEvento, ESTADO as Estado FROM PK_TMRTIPO_EVENTO');
          const tipoEventos = rows as TipoEvento[];
          res.status(200).json(tipoEventos);
        }
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener los tipos de evento' });
      }
      break;

    case 'PUT':
      try {
        const { NombreTipoEvento, DescripcionTipoEvento } = req.body;
        //realizar actualizacion
        const [result] = await pool.query<OkPacket>(
          'UPDATE T_MRTIPO_EVENTO SET TEV_NOMBRE = ?, TEV_DESCRIPCION = ? WHERE PK_TMRTIPO_EVENTO = ?',
          [NombreTipoEvento, DescripcionTipoEvento, id]
        );
        if (result.affectedRows === 0) {
          res.status(404).json({ message: 'Tipo de evento no encontrado' });
          return;
        }
        const [row] = await pool.query<any[]>('SELECT ESTADO FROM T_MRTIPO_EVENTO WHERE PK_TMRTIPO_EVENTO = ?', [id]);
        const tipoEventoActualizado: TipoEvento = {
          CodTipoEvento: Number(id),
          NombreTipoEvento,
          DescripcionTipoEvento,
          Estado: row[0].ESTADO
        };
        res.status(200).json(tipoEventoActualizado);
        
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al actualizar el tipo de evento' });
      }
      break;

    case 'DELETE':
      try {
        // Obtener el estado actual del registro
        const [registro] = await pool.query<any[]>('SELECT * FROM T_MRTIPO_EVENTO WHERE PK_TMRTIPO_EVENTO = ?', [id]);
        
        // Obtener el nuevo estado
        const newState = registro[0].ESTADO === 0 ? 1 : 0;

        // Actualizar el registro con el nuevo estado
        const [result] = await pool.query<OkPacket>('UPDATE T_MRTIPO_EVENTO SET Estado = ? WHERE PK_TMRTIPO_EVENTO = ?', [newState, id]);
        if (result.affectedRows === 0) {
          res.status(404).json({ message: 'Tipo de evento no encontrado' });
          return;
        }
     
        const tipoEventoActualizado: TipoEvento = {
          CodTipoEvento: Number(id),
          NombreTipoEvento: registro[0].NombreTipoEvento,
          DescripcionTipoEvento: registro[0].DescripcionTipoEvento,
          Estado: String(newState),
        };
        res.status(200).json(tipoEventoActualizado);
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al eliminar el tipo de evento' });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      res.status(405).json({ message: `Método ${method} no permitido` });
      break;
  }
}