import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/libs/db';
import { OkPacket, RowDataPacket } from 'mysql2';
import { Equipo } from '@/libs/equipo';


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Equipo[] | Equipo | { message: string }>
) {
  const { method } = req;
  const { id } = req.query;

  switch (method) {
    case 'GET':
      try {
        if (id) {
          const [rows] = await pool.query<RowDataPacket[]>(
            'SELECT EQUIPO.PK_TMEEQUIPO AS CodEquipo, EQUIPO.EQU_NOMBRE AS NombreEquipo, EQUIPO.EQU_CANTIDAD AS Cantidad, EQUIPO.EQU_ESTA_INSTALADO AS EstaInstalado, EQUIPO.EQU_MARCA AS Marca, EQUIPO.EQU_MODELO AS Modelo, ESPACIO.PK_TMEESPACIO AS CodEspacio, ESPACIO.ESP_NOMBRE AS NombreEspacio, TIPO_EQUIPO.PK_TMETIPO_EQUIPO AS CodTipoEquipo, TIPO_EQUIPO.TEQ_NOMBRE AS NombreTipoEquipo, EQUIPO.ESTADO AS Estado FROM T_MEEQUIPO AS EQUIPO JOIN T_METIPO_EQUIPO AS TIPO_EQUIPO ON EQUIPO.PK_TMETIPO_EQUIPO = TIPO_EQUIPO.PK_TMETIPO_EQUIPO JOIN T_MEESPACIO AS ESPACIO ON EQUIPO.PK_TMEESPACIO = ESPACIO.PK_TMEESPACIO WHERE EQUIPO.PK_TMEEQUIPO = ?',
            [id]
          );
          if (rows.length === 0) {
            res.status(404).json({ message: 'Equipo no encontrado' });
            return;
          }
          const equipo = rows[0] as Equipo;
          res.status(200).json(equipo);
        } else {
          const [rows] = await pool.query<RowDataPacket[]>('SELECT EQUIPO.PK_TMEEQUIPO AS CodEquipo, EQUIPO.EQU_NOMBRE AS NombreEquipo, EQUIPO.EQU_CANTIDAD AS Cantidad, EQUIPO.EQU_ESTA_INSTALADO AS EstaInstalado, EQUIPO.EQU_MARCA AS Marca, EQUIPO.EQU_MODELO AS Modelo, EQUIPO.ESTADO AS Estado FROM T_MEEQUIPO as EQUIPO');
          const equipos = rows as Equipo[];
          res.status(200).json(equipos);
        }
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener los servicios especiales' });
      }
      break;

    case 'PUT':
      try {
        const { NombreEquipo, Cantidad, EstaInstalado, Marca, Modelo, CodTipoEquipo, CodEspacio } = req.body;

        const [result] = await pool.query<OkPacket>(
          'UPDATE T_MEEQUIPO SET EQU_NOMBRE = ?, EQU_CANTIDAD = ?, EQU_ESTA_INSTALADO = ?, EQU_MARCA = ?, EQU_MODELO = ?, PK_TMETIPO_EQUIPO = ?, PK_TMEESPACIO = ? WHERE PK_TMEEQUIPO = ?',
          [NombreEquipo, Cantidad, EstaInstalado, Marca, Modelo, CodTipoEquipo, CodEspacio, id]
        );
        if (result.affectedRows === 0) {
          res.status(404).json({ message: 'Equipo no encontrado' });
          return;
        }

        const [row] = await pool.query<any[]>('SELECT ESTADO FROM T_MEEQUIPO WHERE PK_TMEEQUIPO = ?', [id]);
        const [espacio] = await pool.query<any[]>('SELECT ESP_NOMBRE AS NombreEspacio FROM T_MEESPACIO WHERE PK_TMEESPACIO = ?', [CodEspacio]);
        const [tipoEquipo] = await pool.query<any[]>('SELECT TEQ_NOMBRE AS NombreTipoEquipo FROM T_METIPO_EQUIPO WHERE PK_TMETIPO_EQUIPO = ?', [CodTipoEquipo]);
        const equipoUpdated: Equipo = {
          CodEquipo: Number(id),
          NombreEquipo,
          Cantidad,
          EstaInstalado,
          Marca,
          Modelo,
          Estado: row[0].ESTADO,
          CodEspacio,
          NombreEspacio: espacio[0].NombreEspacio,
          CodTipoEquipo,
          NombreTipoEquipo: tipoEquipo[0].NombreTipoEquipo,
        };
        res.status(200).json(equipoUpdated);

      } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al actualizar el equipo' });
      }
      break;

    case 'DELETE':
      try {
        // Obtener el estado actual del registro
        const [registro] = await pool.query<any[]>('SELECT * FROM T_MEEQUIPO WHERE PK_TMEEQUIPO = ?', [id]);

        // Obtener el nuevo estado
        const newState = registro[0].ESTADO === 0 ? 1 : 0;

        // Actualizar el registro con el nuevo estado
        const [result] = await pool.query<OkPacket>('UPDATE T_MEEQUIPO SET ESTADO = ? WHERE PK_TMEEQUIPO = ?', [newState, id]);
        if (result.affectedRows === 0) {
          res.status(404).json({ message: 'Equipo no encontrado' });
          return;
        }

        const equipoUpdated: Equipo = {
          CodEquipo: Number(id),
          NombreEquipo: registro[0].EQU_NOMBRE,
          Cantidad: registro[0].EQU_CANTIDAD,
          EstaInstalado: registro[0].EQU_ESTA_INSTALADO,
          Marca: registro[0].EQU_MARCA,
          Modelo: registro[0].EQU_MODELO,
          CodEspacio: registro[0].PK_TMEESPACIO,
          NombreEspacio: '',
          CodTipoEquipo: registro[0].PK_TMETIPO_EQUIPO,
          NombreTipoEquipo: '',
          Estado: String(newState),
        };
        
        res.status(200).json(equipoUpdated);
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al eliminar el equipo' });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      res.status(405).json({ message: `Método ${method} no permitido` });
      break;
  }
}