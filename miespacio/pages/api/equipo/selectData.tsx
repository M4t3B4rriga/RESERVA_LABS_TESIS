import { NextApiRequest, NextApiResponse } from 'next'
import pool from '@/libs/db';
import url from 'url';
import querystring from 'querystring'
import { OkPacket, RowDataPacket } from 'mysql2';
import { Espacio } from '@/libs/espacios';
import { TipoEquipo } from '@/libs/tipoEquipo';

// Interfaz para las query params de la petición GET
interface QueryParams {
  [key: string]: string | string[];
}

async function getFiltersForEspacios(req: NextApiRequest, res: NextApiResponse) {
  try {
    const query = `
      SELECT 
        GROUP_CONCAT(DISTINCT CONCAT(t.PK_TMETIPO_EQUIPO, '||', t.TEQ_NOMBRE)) AS tiposEquipo,
        GROUP_CONCAT(DISTINCT CONCAT(e.PK_TMEESPACIO, '||', e.ESP_NOMBRE)) AS espacios
      FROM T_METIPO_EQUIPO t
      JOIN T_MEESPACIO e ON t.ESTADO = 1 AND e.ESTADO = 1`;

    // Ejecutamos la consulta en la base de datos y devolvemos los resultados.

    const [rows, fields] = await pool.query<RowDataPacket[]>(query);


    if ((rows[0].tiposEquipo && rows[0].tiposEquipo) && (rows[0].espacios !== '' && rows[0].espacios !== '')) {
      const result = {
        tiposEquipo: rows[0].tiposEquipo.split(',').map((item: string) => {
          const [CodTipoEquipo, NombreTipoEquipo] = item.split('||');
          return { CodTipoEquipo, NombreTipoEquipo };
        }),
        espacios: rows[0].espacios.split(',').map((item: string) => {
          const [CodEspacio, NombreEspacio] = item.split('||');
          return { CodEspacio, NombreEspacio };
        }),
      };
      const tiposEquipo = result.tiposEquipo as TipoEquipo[];
      const espacios = result.espacios as Espacio[];

      res.status(200).json({ tiposEquipo, espacios });
    } else {
      const tiposEquipo = [] as TipoEquipo[];
      const espacios = [] as Espacio[];
      res.status(200).json({ tiposEquipo, espacios });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener los selects' });
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Espacio[] | Espacio | { message: string }>
) {
  const { method } = req;

  switch (method) {
    case 'GET':
      await getFiltersForEspacios(req, res);
      break;
    default:
      res.setHeader('Allow', ['GET']);
      res.status(405).json({ message: `Método ${method} no permitido` });
      break;
  }
}