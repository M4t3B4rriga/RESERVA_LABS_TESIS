import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/libs/db';
import { OkPacket, RowDataPacket } from 'mysql2';
import { FuncionalidadCrud } from '@/libs/funcionalidad';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<FuncionalidadCrud[] | FuncionalidadCrud | { message: string }>
) {
  const { method } = req;
  const { id } = req.query;

  switch (method) {
    case 'GET':
      try {
        if (id) {
          const [rows] = await pool.query<RowDataPacket[]>(
            'SELECT * FROM T_MSFUNCIONALIDAD WHERE PK_TMSFUNCIONALIDAD = ?',
            [id]
          );
          if (rows.length === 0) {
            res.status(404).json({ message: 'Funcionalidad no encontrado' });
            return;
          }
          const funcionalidad = rows[0] as FuncionalidadCrud;
          res.status(200).json(funcionalidad);
        } else {
          const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM T_MSFUNCIONALIDAD');
          const funcionalidades = rows as FuncionalidadCrud[];
          res.status(200).json(funcionalidades);
        }
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener los funcionalidades' });
      }
      break;

    case 'PUT':
      try {
        const { NombreFuncionalidad, DescripcionFuncionalidad } = req.body;
        //realizar actualizacion
        const [result] = await pool.query<OkPacket>(
          'UPDATE T_MSFUNCIONALIDAD SET FUN_NOMBRE = ?, FUN_DESCRIPCION = ? WHERE PK_TMSFUNCIONALIDAD = ?',
          [NombreFuncionalidad, DescripcionFuncionalidad, id]
        );
        if (result.affectedRows === 0) {
          res.status(404).json({ message: 'Funcionalidad no encontrado' });
          return;
        }
        const [row] = await pool.query<any[]>('SELECT ESTADO FROM T_MSFUNCIONALIDAD WHERE PK_TMSFUNCIONALIDAD = ?', [id]);
        const funcionalidadUpdated: FuncionalidadCrud = {
          CodFuncionalidad: Number(id),
          NombreFuncionalidad,
          DescripcionFuncionalidad,
          Estado: row[0].ESTADO
        };
        res.status(200).json(funcionalidadUpdated);

      } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al actualizar el funcionalidad' });
      }
      break;

    case 'DELETE':
      try {
        // Obtener el estado actual del registro
        const [registro] = await pool.query<any[]>('SELECT * FROM T_MSFUNCIONALIDAD WHERE PK_TMSFUNCIONALIDAD = ?', [id]);
        console.log(registro);
        console.log("estado"+registro[0].Estado)
        // Obtener el nuevo estado
        const newState = registro[0].ESTADO === 0 ? 1 : 0;
        console.log(newState);
        // Actualizar el registro con el nuevo estado
        const [result] = await pool.query<OkPacket>('UPDATE T_MSFUNCIONALIDAD SET ESTADO = ? WHERE PK_TMSFUNCIONALIDAD = ?', [newState, id]);
        if (result.affectedRows === 0) {
          res.status(404).json({ message: 'Funcionalidad no encontrado' });
          return;
        }

        const funcionalidadUpdateed: FuncionalidadCrud = {
          CodFuncionalidad: Number(id),
          NombreFuncionalidad: registro[0].FUN_NOMBRE,
          DescripcionFuncionalidad: registro[0].FUN_DESCRIPCION,
          Estado: String(newState),
        };
        res.status(200).json(funcionalidadUpdateed);
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al eliminar el funcionalidad' });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      res.status(405).json({ message: `Método ${method} no permitido` });
      break;
  }
}