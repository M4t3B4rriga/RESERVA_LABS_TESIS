import { NextApiRequest, NextApiResponse } from 'next'
import pool from '@/libs/db';
import url from 'url';
import querystring from 'querystring'
import { OkPacket, RowDataPacket } from 'mysql2';
import { Espacio } from '@/libs/espacios';

// Interfaz para las query params de la petición GET
interface QueryParams {
    [key: string]: string | string[];
}

async function getFiltersForEspacios(req: NextApiRequest, res: NextApiResponse) {
    try {
        const query = `
        SELECT 
            GROUP_CONCAT(DISTINCT CONCAT(t.PK_TMETIPO_ESPACIO, '||', t.TES_NOMBRE)) AS nombres_tipos_espacios,
            GROUP_CONCAT(DISTINCT CONCAT(u.PK_TMEUNIDAD, '||', u.UNI_NOMBRE)) AS nombres_unidades
        FROM T_METIPO_ESPACIO t, T_MEUNIDAD u
        WHERE t.ESTADO = 1 AND u.ESTADO = 1`;

        // Ejecutamos la consulta en la base de datos y devolvemos los resultados.

        const [rows, fields] = await pool.query<RowDataPacket[]>(query);
        const filters = {
            nombres_tipos_espacios: rows[0].nombres_tipos_espacios.split(',').map((item: string) => {
              const [codigo, nombre] = item.split('||');
              return { codigo, nombre };
            }),
            nombres_unidades: rows[0].nombres_unidades.split(',').map((item: string) => {
              const [codigo, nombre] = item.split('||');
              return { codigo, nombre };
            }),
          };
          
          res.status(200).json({ filters });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener los filtros' });
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