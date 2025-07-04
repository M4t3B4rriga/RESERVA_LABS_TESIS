import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/libs/db';
import { OkPacket, RowDataPacket } from 'mysql2';
import { TipoEspacio } from '@/libs/tipoEspacio';


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TipoEspacio[] | TipoEspacio | { message: string }>
) {
  const { method } = req;
  const { id } = req.query;

  switch (method) {
    case 'GET':
      try {
        if (id) {
          const [rows] = await pool.query<RowDataPacket[]>(
            'SELECT PK_TMETIPO_ESPACIO as CodTipoEspacio, TES_NOMBRE as NombreTipoEspacio, TES_DESCRIPCION as DescripcionTipoEspacio, ESTADO as Estado FROM T_METIPO_ESPACIO WHERE PK_TMETIPO_ESPACIO = ?',
            [id]
          );
          if (rows.length === 0) {
            res.status(404).json({ message: 'Tipo de espacio no encontrado' });
            return;
          }
          const tipoEspacio = rows[0] as TipoEspacio;
          res.status(200).json(tipoEspacio);
        } else {
          const [rows] = await pool.query<RowDataPacket[]>('SELECT PK_TMETIPO_ESPACIO as CodTipoEspacio, TES_NOMBRE as NombreTipoEspacio, TES_DESCRIPCION as DescripcionTipoEspacio, ESTADO as Estado FROM T_METIPO_ESPACIO');
          const tipoEspacios = rows as TipoEspacio[];
          res.status(200).json(tipoEspacios);
        }
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener los tipos de espacio' });
      }
      break;

    case 'PUT':
      try {
        const { NombreTipoEspacio, DescripcionTipoEspacio } = req.body;
        //realizar actualizacion
        const [result] = await pool.query<OkPacket>(
          'UPDATE T_METIPO_ESPACIO SET TES_NOMBRE = ?, TES_DESCRIPCION = ? WHERE PK_TMETIPO_ESPACIO = ?',
          [NombreTipoEspacio, DescripcionTipoEspacio, id]
        );
        if (result.affectedRows === 0) {
          res.status(404).json({ message: 'Tipo de espacio no encontrado' });
          return;
        }
        const [row] = await pool.query<any[]>('SELECT ESTADO FROM T_METIPO_ESPACIO WHERE PK_TMETIPO_ESPACIO = ?', [id]);
        const tipoEspacioActualizado: TipoEspacio = {
          CodTipoEspacio: Number(id),
          NombreTipoEspacio,
          DescripcionTipoEspacio,
          Estado: row[0].ESTADO
        };
        res.status(200).json(tipoEspacioActualizado);
        
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al actualizar el tipo de espacio' });
      }
      break;

    case 'DELETE':
      try {
        // Obtener el estado actual del registro
        const [registro] = await pool.query<any[]>('SELECT * FROM T_METIPO_ESPACIO WHERE PK_TMETIPO_ESPACIO = ?', [id]);
        
        // Obtener el nuevo estado
        const newState = registro[0].ESTADO === 0 ? 1 : 0;

        // Actualizar el registro con el nuevo estado
        const [result] = await pool.query<OkPacket>('UPDATE T_METIPO_ESPACIO SET Estado = ? WHERE PK_TMETIPO_ESPACIO = ?', [newState, id]);
        if (result.affectedRows === 0) {
          res.status(404).json({ message: 'Tipo de espacio no encontrado' });
          return;
        }
     
        const tipoEspacioEspacioActualizado: TipoEspacio = {
          CodTipoEspacio: Number(id),
          NombreTipoEspacio: registro[0].NombreTipoEspacio,
          DescripcionTipoEspacio: registro[0].DescripcionTipoEspacio,
          Estado: String(newState),
        };
        res.status(200).json(tipoEspacioEspacioActualizado);
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al eliminar el tipo de espacio' });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      res.status(405).json({ message: `Método ${method} no permitido` });
      break;
  }
}