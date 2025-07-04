import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/libs/db';
import { OkPacket, RowDataPacket } from 'mysql2';
import { ServicioEspecial } from '@/libs/servicioEspecial';


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ServicioEspecial[] | ServicioEspecial | { message: string }>
) {
  const { method } = req;
  const { id } = req.query;

  switch (method) {
    case 'GET':
      try {
        if (id) {
          const [rows] = await pool.query<RowDataPacket[]>(
            `SELECT
            SE.PK_TMRSERVICIO_ESPECIAL as CodServicioEspecial, 
                  SE.SES_NOMBRE	as NombreServicioEspecial,
                  SE.SES_DESCRIPCION	as DescripcionServicioEspecial,
                  SE.ESTADO	as Estado,
                  U.PK_TMEUNIDAD as CodUnidad, 
                  U.UNI_NOMBRE as NombreUnidad 
            FROM T_MRSERVICIO_ESPECIAL SE JOIN T_MEUNIDAD U ON SE.PK_TMEUNIDAD=U.PK_TMEUNIDAD WHERE SE.PK_TMRSERVICIO_ESPECIAL = ?`,
            [id]
          );
          if (rows.length === 0) {
            res.status(404).json({ message: 'Tipo de servicio especial no encontrado' });
            return;
          }
          const servicioEspecial = rows[0] as ServicioEspecial;
          res.status(200).json(servicioEspecial);
        } else {
          const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM T_MRSERVICIO_ESPECIAL');
          const serviciosEspeciales = rows as ServicioEspecial[];
          res.status(200).json(serviciosEspeciales);
        }
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener los servicios especiales' });
      }
      break;

    case 'PUT':
      try {
        const { NombreServicioEspecial, DescripcionServicioEspecial, CodUnidad } = req.body;
        //realizar actualizacion
        const [result] = await pool.query<OkPacket>(
          'UPDATE T_MRSERVICIO_ESPECIAL SET SES_NOMBRE = ?, SES_DESCRIPCION = ?, PK_TMEUNIDAD = ? WHERE PK_TMRSERVICIO_ESPECIAL = ?',
          [NombreServicioEspecial, DescripcionServicioEspecial, CodUnidad, id]
        );
        if (result.affectedRows === 0) {
          res.status(404).json({ message: 'Servicio especial no encontrado' });
          return;
        }
        const [row] = await pool.query<any[]>('SELECT ESTADO as Estado FROM T_MRSERVICIO_ESPECIAL WHERE PK_TMRSERVICIO_ESPECIAL = ?', [id]);
        const [unidad] = await pool.query<any[]>('SELECT UNI_NOMBRE as NombreUnidad FROM T_MEUNIDAD WHERE PK_TMEUNIDAD = ?', [CodUnidad]);
        const servicioEspecialUpdated: ServicioEspecial = {
          CodServicioEspecial: Number(id),
          NombreServicioEspecial,
          DescripcionServicioEspecial,
          Estado: row[0].Estado,
          CodUnidad,
          NombreUnidad: unidad[0].NombreUnidad,
        };
        res.status(200).json(servicioEspecialUpdated);

      } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al actualizar el servicio especial' });
      }
      break;

    case 'DELETE':
      try {
        // Obtener el estado actual del registro
        const [registro] = await pool.query<any[]>(
          `SELECT 
          SE.PK_TMRSERVICIO_ESPECIAL as CodServicioEspecial, 
                  SE.SES_NOMBRE	as NombreServicioEspecial,
                  SE.SES_DESCRIPCION	as DescripcionServicioEspecial,
                  SE.ESTADO	as Estado
           FROM T_MRSERVICIO_ESPECIAL SE WHERE SE.PK_TMRSERVICIO_ESPECIAL = ?`, [id]);

        // Obtener el nuevo estado
        const newState = registro[0].Estado === 0 ? 1 : 0;

        // Actualizar el registro con el nuevo estado
        const [result] = await pool.query<OkPacket>('UPDATE T_MRSERVICIO_ESPECIAL SET ESTADO = ? WHERE PK_TMRSERVICIO_ESPECIAL = ?', [newState, id]);
        if (result.affectedRows === 0) {
          res.status(404).json({ message: 'Servicio especial no encontrado' });
          return;
        }

        const ServicioEspecialUpdateed: ServicioEspecial = {
          CodServicioEspecial: Number(id),
          NombreServicioEspecial: registro[0].NombreServicioEspecial,
          DescripcionServicioEspecial: registro[0].DescripcionServicioEspecial,
          Estado: String(newState),
          CodUnidad: registro[0].CodUnidad,
          NombreUnidad: '',
        };
        res.status(200).json(ServicioEspecialUpdateed);
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al eliminar el servicio especial' });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      res.status(405).json({ message: `Método ${method} no permitido` });
      break;
  }
}