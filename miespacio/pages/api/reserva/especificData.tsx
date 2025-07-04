import { NextApiRequest, NextApiResponse } from 'next'
import pool from '@/libs/db';
import url from 'url';
import querystring from 'querystring'
import { OkPacket, RowDataPacket } from 'mysql2';
import { TipoEvento } from '@/libs/tipoEvento';
import { ServicioEspecialReservas } from '@/libs/servicioEspecial';
import { EquipoForReservation } from '@/libs/equipo';
import { RepasoInfo } from '@/libs/reserva';

// Interfaz para las query params de la petición GET
interface QueryParams {
    [key: string]: string | string[];
}

async function getDataForSelects(req: NextApiRequest, res: NextApiResponse) {
    try {
        const { CodReserva } = req.query;

        if (!CodReserva || CodReserva === '' || CodReserva === undefined || CodReserva === null || CodReserva === 'undefined') {
            res.status(400).json({ message: 'No se ha especificado el código de la reserva' });
            return;
        }

        const [rows_equipos] = await pool.query<RowDataPacket[]>(`
            SELECT
                eq.PK_TMEEQUIPO AS CodEquipo,
                eq.EQU_NOMBRE AS NombreEquipo,
                eq.EQU_CANTIDAD AS Cantidad,
                eq.PK_TMEESPACIO AS CodEspacio,
                eq.PK_TMETIPO_EQUIPO AS CodTipoEquipo,
                teq.TEQ_NOMBRE AS NombreTipoEquipo,
                eq.ESTADO AS Estado
            FROM T_MREQUIPO_RESERVADO er
            JOIN T_MEEQUIPO eq ON er.PK_TMEEQUIPO = eq.PK_TMEEQUIPO
            JOIN T_METIPO_EQUIPO teq ON eq.PK_TMETIPO_EQUIPO = teq.PK_TMETIPO_EQUIPO
            WHERE er.PK_TMRRESERVA = ?;`,
            [CodReserva]
        );

        const [rows_servicios_especiales] = await pool.query<RowDataPacket[]>(
            `SELECT
                se.PK_TMRSERVICIO_ESPECIAL AS CodServicioEspecial,
                se.SES_NOMBRE AS NombreServicioEspecial,
                se.SES_DESCRIPCION AS DescripcionServicioEspecial,
                se.PK_TMEUNIDAD AS CodUnidad,
                se.ESTADO AS Estado
            FROM T_MRSERVICIO_ESPECIAL_RESERVA ser
            JOIN T_MRSERVICIO_ESPECIAL se ON ser.PK_TMRSERVICIO_ESPECIAL = se.PK_TMRSERVICIO_ESPECIAL
            WHERE ser.PK_TMRRESERVA = ?;`,
            [CodReserva]
        );

        const [rows_repasos] = await pool.query<RowDataPacket[]>(
            `SELECT
                CODRESERVA2 AS CodReserva,
                PK_TMRRESERVA AS CodRepaso,
                REP_DIA AS Dia,
                REP_HORA_INICIO AS HoraInicio,
                REP_HORA_FIN AS HoraFin,
                ESTADO AS Estado
            FROM T_MRREPASO
            WHERE PK_TMRRESERVA = ? AND ESTADO = 1;`,
            [CodReserva]
        );

        const equipos = rows_equipos as EquipoForReservation[];
        const serviciosEspeciales = rows_servicios_especiales as ServicioEspecialReservas[];
        const repasos = rows_repasos as RepasoInfo[];

        res.status(200).json({ serviciosEspeciales, equipos, repasos });

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