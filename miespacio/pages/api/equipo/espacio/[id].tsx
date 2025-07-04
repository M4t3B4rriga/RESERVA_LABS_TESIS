import { NextApiRequest, NextApiResponse } from 'next'
import pool from '@/libs/db';
import url from 'url';
import querystring from 'querystring'
import { OkPacket, RowDataPacket } from 'mysql2';
import { Espacio } from '@/libs/espacios';
import { Equipo } from '@/libs/equipo';
import { TipoEquipo } from '@/libs/tipoEquipo';

// Interfaz para las query params de la petición GET
interface QueryParams {
    [key: string]: string | string[];
}

async function getEquiposFromEspacios(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query;
    try {
        const [queryEquipos] = await pool.query<RowDataPacket[]>(
            `SELECT 
              GROUP_CONCAT(DISTINCT CONCAT(eq.PK_TMEEQUIPO, '||', eq.EQU_NOMBRE, '||', eq.EQU_CANTIDAD, '||', eq.EQU_ESTA_INSTALADO, '||', eq.EQU_MARCA, '||', eq.EQU_MODELO, '||', eq.PK_TMEESPACIO, '||', eq.PK_TMETIPO_EQUIPO, '||', eq.ESTADO)) AS equipos,
              GROUP_CONCAT(DISTINCT CONCAT(te.PK_TMETIPO_EQUIPO, '||', te.TEQ_NOMBRE, '||', te.TEQ_DESCRIPCION, '||', te.ESTADO)) AS tipos_equipo
            FROM T_MEEQUIPO eq
              JOIN T_METIPO_EQUIPO te ON eq.PK_TMETIPO_EQUIPO = te.PK_TMETIPO_EQUIPO
            WHERE eq.ESTADO = 1 AND te.ESTADO = 1 AND eq.PK_TMEESPACIO = ?
            `,
            [id]
        );

        if (queryEquipos.length === 0) {
            console.log({ message: 'Equipos no encontrados' });
        }

        if ((queryEquipos[0].equipos && queryEquipos[0].tipos_equipo) && (queryEquipos[0].equipos !== '' && queryEquipos[0].tipos_equipo !== '')) {
            const resultEquipos = {
                equipos: queryEquipos[0].equipos.split(',').map((item: string) => {
                    const [CodEquipo, NombreEquipo, Cantidad, EstaInstalado, Marca, Modelo, CodEspacio, CodTipoEquipo, Estado] = item.split('||');
                    return { CodEquipo, NombreEquipo, Cantidad, EstaInstalado, Marca, Modelo, CodEspacio, CodTipoEquipo, Estado };
                }),
                tipos_equipo: queryEquipos[0].tipos_equipo.split(',').map((item: string) => {
                    const [CodTipoEquipo, NombreTipoEquipo, DescripcionTipoEquipo, Estado] = item.split('||');
                    return { CodTipoEquipo, NombreTipoEquipo, DescripcionTipoEquipo, Estado };
                }),
            };
            const equipos = resultEquipos.equipos as Equipo[];
            const tipos_equipo = resultEquipos.tipos_equipo as TipoEquipo[];

            res.status(200).json({ equipos, tipos_equipo });
        } else {
            const equipos = [] as Equipo[];
            const tipos_equipo = [] as TipoEquipo[];

            res.status(200).json({ equipos, tipos_equipo });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener los equipos' });
    }
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<Espacio[] | Espacio | { message: string }>
) {
    const { method } = req;

    switch (method) {
        case 'GET':
            await getEquiposFromEspacios(req, res);
            break;
        default:
            res.setHeader('Allow', ['GET']);
            res.status(405).json({ message: `Método ${method} no permitido` });
            break;
    }
}