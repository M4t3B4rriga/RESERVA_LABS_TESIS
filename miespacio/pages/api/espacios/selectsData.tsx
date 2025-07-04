import { NextApiRequest, NextApiResponse } from 'next'
import pool from '@/libs/db';
import url from 'url';
import querystring from 'querystring'
import { OkPacket, RowDataPacket } from 'mysql2';
import { TipoEspacio } from '@/libs/tipoEspacio';
import { Unidad } from '@/libs/unidad';

// Interfaz para las query params de la petición GET
interface QueryParams {
    [key: string]: string | string[];
}

async function getDataForSelects(req: NextApiRequest, res: NextApiResponse) {
    try {
        const query = `
        SELECT 
            GROUP_CONCAT(DISTINCT CONCAT(t.PK_TMETIPO_ESPACIO, '||', t.TES_NOMBRE)) AS tiposEspacios,
            GROUP_CONCAT(DISTINCT CONCAT(u.PK_TMEUNIDAD, '||', u.UNI_NOMBRE, '||', u.UNI_SIGLAS)) AS unidades
        FROM T_METIPO_ESPACIO t, T_MEUNIDAD u
        WHERE t.ESTADO = 1 AND u.ESTADO = 1`;

        // Ejecutamos la consulta en la base de datos y devolvemos los resultados.
        const [rows, fields] = await pool.query<RowDataPacket[]>(query);

        if ((rows[0].tiposEspacios && rows[0].unidades) && (rows[0].tiposEspacios !== '' && rows[0].unidades !== '')) {
            const result = {
                tiposEspacios: rows[0].tiposEspacios.split(',').map((item: string) => {
                    const [CodTipoEspacio, NombreTipoEspacio] = item.split('||');
                    return { CodTipoEspacio, NombreTipoEspacio };
                }),
                unidades: rows[0].unidades.split(',').map((item: string) => {
                    const [CodUnidad, NombreUnidad, Siglas] = item.split('||');
                    return { CodUnidad, NombreUnidad, Siglas };
                }),
            };

            const tiposEspacios = result.tiposEspacios as TipoEspacio[];
            const unidades = result.unidades as Unidad[];

            res.status(200).json({ tiposEspacios, unidades });
        } else {
            const tiposEspacios = [] as TipoEspacio[];
            const unidades = [] as Unidad[];

            res.status(200).json({ tiposEspacios, unidades });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener la información' });
    }
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const { method } = req;

    switch (method) {
        case 'GET':
            await getDataForSelects(req, res);
            break;
        default:
            res.setHeader('Allow', ['GET']);
            res.status(405).json({ message: `Método ${method} no permitido` });
            break;
    }
}