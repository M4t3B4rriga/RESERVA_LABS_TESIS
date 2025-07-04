import { NextApiRequest, NextApiResponse } from 'next'
import pool from '@/libs/db';
import url from 'url';
import querystring from 'querystring'
import { OkPacket, RowDataPacket } from 'mysql2';
import { TipoEvento } from '@/libs/tipoEvento';
import { ServicioEspecial } from '@/libs/servicioEspecial';
import { EquipoForReservation } from '@/libs/equipo';

// Interfaz para las query params de la petición GET
interface QueryParams {
    [key: string]: string | string[];
}

async function getDataForSelects(req: NextApiRequest, res: NextApiResponse) {
    try {
        const {codEspacio} = req.query;

        if (!codEspacio || codEspacio === '' || codEspacio === undefined || codEspacio === null || codEspacio === 'undefined') { 
            res.status(400).json({ message: 'No se ha especificado el código del espacio' });
            return;
        }

        const query = `
        SELECT 
            GROUP_CONCAT(DISTINCT CONCAT(t.PK_TMRTIPO_EVENTO, '||', t.TEV_NOMBRE)) AS tiposEventos,
            GROUP_CONCAT(DISTINCT CONCAT(s.PK_TMRSERVICIO_ESPECIAL, '||', s.SES_NOMBRE)) AS serviciosEspeciales
        FROM T_MRTIPO_EVENTO t
        LEFT JOIN T_MRSERVICIO_ESPECIAL s ON 1=1 AND s.ESTADO = 1
        WHERE t.ESTADO = 1;
        `;

        // Ejecutamos la consulta en la base de datos y devolvemos los resultados.
        const [rows, fields] = await pool.query<RowDataPacket[]>(query);

        let tiposEventosFormatted = [] as any;
        let serviciosEspecialesFormatted = [] as any;

        if (rows[0].tiposEventos && rows[0].tiposEventos !== '') {
            tiposEventosFormatted = {
                tiposEventos: rows[0].tiposEventos.split(',').map((item: string) => {
                    const [CodTipoEvento, NombreTipoEvento] = item.split('||');
                    return { CodTipoEvento, NombreTipoEvento };
                })
            };
        }

        if (rows[0].serviciosEspeciales && rows[0].serviciosEspeciales !== '') {
            serviciosEspecialesFormatted = {
                serviciosEspeciales: rows[0].serviciosEspeciales.split(',').map((item: string) => {
                    const [CodServicioEspecial, NombreServicioEspecial] = item.split('||');
                    return { CodServicioEspecial, NombreServicioEspecial };
                })
            };
        }

        const [rows_equipos] = await pool.query<RowDataPacket[]>(
            `SELECT
                e.PK_TMEEQUIPO AS CodEquipo,
                e.EQU_NOMBRE AS NombreEquipo,
                e.EQU_CANTIDAD AS Cantidad,
                e.PK_TMEESPACIO AS CodEspacio,
                e.PK_TMETIPO_EQUIPO AS CodTipoEquipo,
                t.TEQ_NOMBRE AS NombreTipoEquipo,
                e.ESTADO AS Estado
            FROM
                T_MEEQUIPO e
                INNER JOIN T_METIPO_EQUIPO t ON e.PK_TMETIPO_EQUIPO = t.PK_TMETIPO_EQUIPO
            WHERE
                e.PK_TMEESPACIO = ? AND t.ESTADO = 1 AND e.ESTADO = 1`,
            [codEspacio]
        );
        
        const equipos = rows_equipos as EquipoForReservation[];
        const tiposEventos = tiposEventosFormatted.tiposEventos as TipoEvento[];
        const serviciosEspeciales = serviciosEspecialesFormatted.serviciosEspeciales as ServicioEspecial[];

        res.status(200).json({ tiposEventos, serviciosEspeciales, equipos });

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