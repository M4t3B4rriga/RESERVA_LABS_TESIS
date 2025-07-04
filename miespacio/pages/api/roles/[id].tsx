import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/libs/db';
import { OkPacket, RowDataPacket } from 'mysql2';
import { Roles } from '@/libs/roles';


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Roles[] | Roles | { message: string }>
) {
  const { method } = req;
  const { id } = req.query;

  switch (method) {
    case 'GET':
      try {
        if (id) {
          const [rows] = await pool.query<RowDataPacket[]>(
            'SELECT * FROM T_MSROL WHERE PK_TMSROL = ?',
            [id]
          );
          if (rows.length === 0) {
            res.status(404).json({ message: 'Rol no encontrado' });
            return;
          }
          const rol = rows[0] as Roles;
          res.status(200).json(rol);
        } else {
          const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM T_MSROL');
          const roles = rows as Roles[];
          res.status(200).json(roles);
        }
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener los roles' });
      }
      break;

    case 'PUT':
      try {
        const { NombreRol, DescripcionRol } = req.body;
        //realizar actualizacion
        const [result] = await pool.query<OkPacket>(
          'UPDATE T_MSROL SET ROL_NOMBRE = ?, ROL_DESCRIPCION = ? WHERE PK_TMSROL = ?',
          [NombreRol, DescripcionRol, id]
        );
        if (result.affectedRows === 0) {
          res.status(404).json({ message: 'Rol no encontrado' });
          return;
        }
        const [row] = await pool.query<any[]>('SELECT Estado FROM T_MSROL WHERE PK_TMSROL = ?', [id]);
        const rolUpdated: Roles = {
          CodRol: Number(id),
          NombreRol,
          DescripcionRol,
          Estado: row[0].Estado
        };
        res.status(200).json(rolUpdated);

      } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al actualizar el rol' });
      }
      break;

    case 'DELETE':
      try {
        // Obtener el estado actual del registro
        const [registro] = await pool.query<any[]>('SELECT * FROM T_MSROL WHERE PK_TMSROL = ?', [id]);
        console.log(registro);
        console.log("estado"+registro[0].Estado)
        // Obtener el nuevo estado
        const newState = registro[0].ESTADO === 0 ? 1 : 0;
        console.log(newState);
        // Actualizar el registro con el nuevo estado
        const [result] = await pool.query<OkPacket>('UPDATE T_MSROL SET Estado = ? WHERE PK_TMSROL = ?', [newState, id]);
        if (result.affectedRows === 0) {
          res.status(404).json({ message: 'Rol no encontrado' });
          return;
        }

        const rolUpdateed: Roles = {
          CodRol: Number(id),
          NombreRol: registro[0].NombreRol,
          DescripcionRol: registro[0].DescripcionRol,
          Estado: String(newState),
        };
        res.status(200).json(rolUpdateed);
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al eliminar el rol' });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      res.status(405).json({ message: `Método ${method} no permitido` });
      break;
  }
}