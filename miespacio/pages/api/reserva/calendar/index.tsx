import { NextApiRequest, NextApiResponse } from 'next'
import pool from '@/libs/db';
import url from 'url';
import querystring from 'querystring'
import { OkPacket, RowDataPacket } from 'mysql2';
import { RepasoInfo, Reserva, ReservaEspacioCalendar, ReservaInfo } from '@/libs/reserva';
import { jwtVerify } from 'jose';
import { ServicioEspecialDirigentes, ServicioEspecialReservas } from '@/libs/servicioEspecial';
import nodemailer from 'nodemailer';
import { Espacio_Tiny } from '@/libs/espacios';
import { API_BASE_URL, API_BASE_URL_SEC } from '@/src/components/BaseURL';

// Interfaz para las query params de la petición GET
interface QueryParams {
    [key: string]: string | string[];
}

// Interfaz para los parámetros de la función getRoles
interface GetReservasParams {
    filter?: string;
    search?: string;
    format?: string;
    date?: string;
}

async function getEspacios(req: NextApiRequest, res: NextApiResponse, { filter, search, format, date }: GetReservasParams = {}) {
    try {
        const filterConditions: { [key: string]: string[] } = {};
        let repasos = false;

        const { miEspacioSession } = req.cookies;

        if (miEspacioSession === undefined) {
            res.status(201).json({ message: 'No se ha iniciado sesión' });
            return;
        }

        const { payload } = await jwtVerify(
            miEspacioSession,
            new TextEncoder().encode('secret')
        );

        const CodUsuario = payload?.PI;

        if (CodUsuario === undefined) {
            res.status(201).json({ message: 'No se ha iniciado sesión' });
            return;
        }

        if (filter) {
            // Separar los filtros.
            const filterParams = filter ? filter.split(',') : [];
            const allowedAttributes: { [key: string]: string } = {
                CodTipoEspacio: 'e.PK_TMETIPO_ESPACIO',
                CodUnidad: 'e.PK_TMEUNIDAD',
                Reserva: 'r.RES_ESTADO_SOLICITUD',
                Participantes: 'r.PK_TMCPERSONA_INTERNA',
            };

            const allowedRervasValues: { [key: string]: string } = {
                Confirmadas: '1',
                Pendientes: '2',
                Repasos: 'Repasos',
            };

            // Construimos la cláusula WHERE en base a los filtros y la cadena de búsqueda.
            filterParams.forEach(param => {
                const [attribute, value] = param.split('-');
                if (!allowedAttributes[attribute]) {
                    console.error(`El atributo ${attribute} no está permitido`);
                    return;
                }

                if (!value) {
                    console.error(`Se debe proporcionar un valor para el atributo ${attribute}`);
                    return;
                }

                if (!filterConditions[allowedAttributes[attribute]]) {
                    if (value !== 'Repasos') {
                        filterConditions[allowedAttributes[attribute]] = [];
                    }
                }

                if (attribute === 'Reserva') {
                    if (value !== 'Repasos') {
                        filterConditions[allowedAttributes[attribute]].push(`${allowedAttributes[attribute]} = '${allowedRervasValues[value]}'`);
                    } else {
                        repasos = true;
                    }
                } else {
                    if (attribute === 'Participantes') {
                        if (value === 'Propio') {
                            console.log("`${allowedAttributes[attribute]} = '${CodUsuario}'`: ", `${allowedAttributes[attribute]} = '${CodUsuario}'`);
                            filterConditions[allowedAttributes[attribute]].push(`${allowedAttributes[attribute]} = '${CodUsuario}'`);
                            console.log("filterConditions[allowedAttributes[attribute]]: ", filterConditions[allowedAttributes[attribute]]);
                        }

                    } else {
                        filterConditions[allowedAttributes[attribute]].push(`${allowedAttributes[attribute]} = '${value}'`);
                    }
                }
            });
        }

        const filterGroups = Object.values(filterConditions).map(group => `(${group.join(' OR ')})`);

        if (search) {
            filterGroups.push(`e.ESP_NOMBRE LIKE '%${search}%'`)
        }

        if (format) {
            const allowedFormatValues: { [key: string]: string } = {
                s: 's',
                d: 'd',
            };

            if (!allowedFormatValues[format]) {
                console.error(`El formato ${format} no está permitido`);
                return;
            }

            if (date) {
                const inputDate = date as string;
                const regex = /^\d{2}-\d{2}-\d{4}$/;
                if (!regex.test(inputDate)) {
                    res.status(201).json({ message: `La fecha ${inputDate} no tiene un formato válido` });
                    return;
                }

                const currentDate = new Date(inputDate);
                if (isNaN(currentDate.getTime())) {
                    res.status(201).json({ message: `La fecha ${inputDate} no es válida` });
                    return;
                }

                const currentDayOfWeek = currentDate.getDay();
                const startOfCurrentWeek = new Date(currentDate);
                const difference = currentDayOfWeek === 1 ? 0 : (currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek);
                startOfCurrentWeek.setDate(currentDate.getDate() + difference);
                const endOfCurrentWeek = new Date(startOfCurrentWeek);
                endOfCurrentWeek.setDate(startOfCurrentWeek.getDate() + 6);

                const formattedStartOfCurrentWeek = startOfCurrentWeek.toISOString().split('T')[0];
                const formattedEndOfCurrentWeek = endOfCurrentWeek.toISOString().split('T')[0];

                if (format === 'd') {
                    filterGroups.push(`r.RES_DIA = '${currentDate.toISOString().split('T')[0]}'`);
                }
                else {
                    filterGroups.push(`r.RES_DIA BETWEEN '${formattedStartOfCurrentWeek}' AND '${formattedEndOfCurrentWeek}'`);
                }
            } else {
                const currentDate = new Date();
                const currentDayOfWeek = currentDate.getDay();
                const startOfCurrentWeek = new Date(currentDate);
                const difference = currentDayOfWeek === 1 ? 0 : (currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek);
                startOfCurrentWeek.setDate(currentDate.getDate() + difference);
                const endOfCurrentWeek = new Date(startOfCurrentWeek);
                endOfCurrentWeek.setDate(startOfCurrentWeek.getDate() + 6);

                const formattedStartOfCurrentWeek = startOfCurrentWeek.toISOString().split('T')[0];
                const formattedEndOfCurrentWeek = endOfCurrentWeek.toISOString().split('T')[0];

                if (format === 'd') {
                    filterGroups.push(`r.RES_DIA = '${currentDate.toISOString().split('T')[0]}'`);
                } else filterGroups.push(`r.RES_DIA BETWEEN '${formattedStartOfCurrentWeek}' AND '${formattedEndOfCurrentWeek}'`);
            }
        }

        const whereClause = filterGroups.length > 0 ? `WHERE ${filterGroups.join(' AND ')} AND r.ESTADO = 1 AND te.ESTADO = 1 AND u.ESTADO = 1` : '';
        const query = `
            SELECT
                r.PK_TMRRESERVA AS CodReserva,
                NULL as CodRepaso,
                r.PK_TMCPERSONA_INTERNA AS CodPersonaInterna,
                r.PK_TMEESPACIO AS CodEspacio,
                e.PK_TMETIPO_ESPACIO AS CodTipoEspacio,
                e.ESP_NOMBRE AS NombreEspacio,
                e.PK_TMEUNIDAD AS CodUnidad,
                r.PK_TMRTIPO_EVENTO AS CodTipoEvento,
                r.PK_TMCPERSONA_EXTERNA AS CodPersonaExterna,
                r.RES_RAZON AS Razon,
                r.RES_ESTADO_SOLICITUD AS EstadoSolicitud,
                r.RES_ES_PERSONA_EXT AS EsPersonaExterna,
                r.RES_EVENTO_ACADEMICO AS EventoAcademico,
                r.RES_DIA AS Dia,
                r.RES_HORA_INICIO AS HoraInicio,
                r.RES_HORA_FIN AS HoraFin,
                r.RES_FECHA_CREACION AS FechaCreacion,
                r.ESTADO as Estado
            FROM
                T_MRRESERVA r
                INNER JOIN T_MEESPACIO e ON r.PK_TMEESPACIO = e.PK_TMEESPACIO
                JOIN T_METIPO_ESPACIO te ON e.PK_TMETIPO_ESPACIO = te.PK_TMETIPO_ESPACIO
                JOIN T_MEUNIDAD u ON e.PK_TMEUNIDAD = u.PK_TMEUNIDAD
            ${whereClause !== '' ? whereClause : 'WHERE r.RES_DIA >= CURDATE() AND r.ESTADO = 1 AND te.ESTADO = 1 AND u.ESTADO = 1'}
            ORDER BY r.RES_DIA ASC, r.RES_HORA_INICIO ASC;
        `;
        const [result] = await pool.query(query);
        const reservas = result as ReservaEspacioCalendar[];
        let repasosLista = [] as ReservaEspacioCalendar[];

        if (repasos) {

            const query = `
                SELECT
                    re.PK_TMRRESERVA AS CodReserva,
                    re.CODRESERVA2 AS CodRepaso,
                    re.REP_DIA AS Dia,
                    re.REP_HORA_INICIO AS HoraInicio,
                    re.REP_HORA_FIN AS HoraFin,
                    re.ESTADO AS Estado,
                    e.PK_TMEESPACIO AS CodEspacio,
                    e.PK_TMETIPO_ESPACIO AS CodTipoEspacio,
                    e.ESP_NOMBRE AS NombreEspacio,
                    e.PK_TMEUNIDAD AS CodUnidad,
                    NULL AS CodTipoEvento,
                    NULL AS CodPersonaExterna,
                    NULL AS Razon,
                    NULL AS EstadoSolicitud,
                    NULL AS EsPersonaExterna,
                    NULL AS EventoAcademico,
                    NULL AS FechaCreacion
                FROM
                    T_MRREPASO re
                    INNER JOIN T_MRRESERVA r ON re.PK_TMRRESERVA = r.PK_TMRRESERVA
                    INNER JOIN T_MEESPACIO e ON r.PK_TMEESPACIO = e.PK_TMEESPACIO
                    JOIN T_METIPO_ESPACIO te ON e.PK_TMETIPO_ESPACIO = te.PK_TMETIPO_ESPACIO
                    JOIN T_MEUNIDAD u ON e.PK_TMEUNIDAD = u.PK_TMEUNIDAD
                ${whereClause !== '' ? whereClause : 'WHERE r.RES_DIA >= CURDATE() AND re.ESTADO = 1 AND te.ESTADO = 1 AND u.ESTADO = 1'}
                ORDER BY re.REP_DIA ASC, re.REP_HORA_INICIO ASC;
            `;

            const [result] = await pool.query(query);
            repasosLista = result as ReservaEspacioCalendar[];
        }
        reservas.push(...repasosLista);
        res.status(200).json({ reservas });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener las reservas' });
    }
}

async function createReserva(req: NextApiRequest, res: NextApiResponse) {
    try {
        const {
            Dia,
            HoraInicio,
            HoraFin,
            DiaRepaso1,
            HoraInicioRepaso1,
            HoraFinRepaso1,
            DiaRepaso2,
            HoraInicioRepaso2,
            HoraFinRepaso2,
            NombrePersonaExterna,
            ApellPaternoPersonaExterna,
            ApellMaternoPersonaExterna,
            EmailPersonaExterna,
            TelefonoPersonaExterna,
            CedulaPersonaExterna,
            OrganizacionPersonaExterna,
            Razon,
            CodTipoEvento,
            Equipos,
            ServiciosEspeciales,
            isEventoAcademico,
            EsPersonaExterna,
            CodEspacio
        } = req.body;

        if (Dia === undefined || HoraInicio === undefined || HoraFin === undefined || Dia === '' || HoraInicio === '' || HoraFin === '' || Razon === undefined || CodEspacio === undefined || CodEspacio === '' || (EsPersonaExterna && (NombrePersonaExterna === undefined || ApellPaternoPersonaExterna === undefined || ApellMaternoPersonaExterna === undefined || EmailPersonaExterna === undefined))) {
            res.status(201).json({ message: 'Faltan datos' });
            return;
        }

        const fechaReserva = new Date(Dia as string);
        const fechaActual = new Date();

        if (isNaN(fechaReserva.getTime()) || isNaN(fechaActual.getTime())) {
            res.status(201).json({ message: 'La fecha proporcionada es inválida' });
            return;
        }

        // Validar si la fecha de los repasos, si los hay, es válida
        if (DiaRepaso1 !== undefined && DiaRepaso1 !== '') {
            const fechaRepaso1 = new Date(DiaRepaso1 as string);
            if (isNaN(fechaRepaso1.getTime())) {
                res.status(201).json({ message: 'La fecha del repaso 1 proporcionada es inválida' });
                return;
            }
        }

        if (DiaRepaso2 !== undefined && DiaRepaso2 !== '') {
            const fechaRepaso2 = new Date(DiaRepaso2 as string);
            if (isNaN(fechaRepaso2.getTime())) {
                res.status(201).json({ message: 'La fecha del repaso 2 proporcionada es inválida' });
                return;
            }
        }

        // Validar que la hora de inicio sea menor a la hora de fin
        if (HoraInicio >= HoraFin) {
            res.status(201).json({ message: 'La hora de inicio debe ser menor a la hora de fin' });
            return;
        }

        // Validar, si esque existe repaso 1, que la hora de inicio sea menor a la hora de fin
        if (DiaRepaso1 !== undefined && HoraInicioRepaso1 !== undefined && HoraFinRepaso1 !== undefined && DiaRepaso1 !== '' && HoraInicioRepaso1 !== '' && HoraFinRepaso1 !== '') {
            if (HoraInicioRepaso1 >= HoraFinRepaso1) {
                res.status(201).json({ message: 'La hora de inicio del repaso 1 debe ser menor a la hora de fin del repaso 1' });
                return;
            }

            // Validar que la duración del repaso 1 sea máximo de 2 horas
            const duracionRepaso1 = (HoraFinRepaso1 as number) - (HoraInicioRepaso1 as number);
            if (duracionRepaso1 > 2) {
                res.status(201).json({ message: 'La duración del repaso 1 no puede ser mayor a 2 horas' });
                return;
            }
        }

        // Validar, si esque existe repaso 2, que la hora de inicio sea menor a la hora de fin
        if (DiaRepaso2 !== undefined && HoraInicioRepaso2 !== undefined && HoraFinRepaso2 !== undefined && DiaRepaso2 !== '' && HoraInicioRepaso2 !== '' && HoraFinRepaso2 !== '') {
            if (HoraInicioRepaso2 >= HoraFinRepaso2) {
                res.status(201).json({ message: 'La hora de inicio del repaso 2 debe ser menor a la hora de fin del repaso 2' });
                return;
            }

            // Validar que la duración del repaso 2 sea máximo de 2 horas
            const duracionRepaso2 = (HoraFinRepaso2 as number) - (HoraInicioRepaso2 as number);
            if (duracionRepaso2 > 2) {
                res.status(201).json({ message: 'La duración del repaso 2 no puede ser mayor a 2 horas' });
                return;
            }
        }

        const newDateRestriction = new Date(Dia);
        const currentNewDay = newDateRestriction.getDay() === 0 ? 6 : newDateRestriction.getDay() - 1;

        // Validar que la reserva y los repasos, en caso de tenerlos, se encuentren dentro de la restriccion de horario segun lo que tenga en la base de datos de la tabla T_MEERESTRICCION y T_MEEHORARIO
        const [restriccionResult] = await pool.query<RowDataPacket[]>(
            `SELECT
                r.PK_TMEERESTRICCION AS CodRestriccion,
                r.PK_TMEESPACIO AS CodEspacio,
                r.PK_TMCPERSONA_INTERNA AS CodPersonaInterna,
                r.RES_FECHA_CREACION AS FechaCreacion,
                r.RES_FECHA_EDICION AS FechaEdicion,
                r.ESTADO as Estado,
                h.PK_TMEEHORARIO AS CodHorario,
                h.PK_TMEERESTRICCION AS CodRestriccion,
                h.HOR_DIA AS Dia,
                h.HOR_HORA_INICIO AS HoraInicio,
                h.HOR_HORA_FIN AS HoraFin,
                h.ESTADO as Estado
            FROM
                T_MEERESTRICCION r
                INNER JOIN T_MEEHORARIO h ON r.PK_TMEERESTRICCION = h.PK_TMEERESTRICCION
            WHERE r.PK_TMEESPACIO = ? AND r.ESTADO = 1 AND h.ESTADO = 1 AND h.HOR_DIA = ? AND h.HOR_HORA_INICIO <= ? AND h.HOR_HORA_FIN >= ?`,
            [CodEspacio, currentNewDay, HoraInicio, HoraFin]
        );

        if (restriccionResult.length === 0) {
            res.status(201).json({ message: 'La reserva no se encuentra dentro de la restricción de horario' });
            return;
        }


        // Validar que los repasos, en caso de tenerlos, se encuentren dentro de la restriccion de horario segun lo que tenga en la base de datos de la tabla T_MEERESTRICCION y T_MEEHORARIO
        if (DiaRepaso1 !== undefined && HoraInicioRepaso1 !== undefined && HoraFinRepaso1 !== undefined && DiaRepaso1 !== '' && HoraInicioRepaso1 !== '' && HoraFinRepaso1 !== '') {
            const newDateRepaso1 = new Date(DiaRepaso1);
            const currentNewDayRepaso1 = newDateRepaso1.getDay() === 0 ? 6 : newDateRepaso1.getDay() - 1;

            const [restriccionRepaso1Result] = await pool.query<RowDataPacket[]>(
                `SELECT
                    r.PK_TMEERESTRICCION AS CodRestriccion,
                    r.PK_TMEESPACIO AS CodEspacio,
                    r.PK_TMCPERSONA_INTERNA AS CodPersonaInterna,
                    r.RES_FECHA_CREACION AS FechaCreacion,
                    r.RES_FECHA_EDICION AS FechaEdicion,
                    r.ESTADO as Estado,
                    h.PK_TMEEHORARIO AS CodHorario,
                    h.PK_TMEERESTRICCION AS CodRestriccion,
                    h.HOR_DIA AS Dia,
                    h.HOR_HORA_INICIO AS HoraInicio,
                    h.HOR_HORA_FIN AS HoraFin,
                    h.ESTADO as Estado
                FROM
                    T_MEERESTRICCION r
                    INNER JOIN T_MEEHORARIO h ON r.PK_TMEERESTRICCION = h.PK_TMEERESTRICCION
                WHERE r.PK_TMEESPACIO = ? AND r.ESTADO = 1 AND h.ESTADO = 1 AND h.HOR_DIA = ? AND h.HOR_HORA_INICIO <= ? AND h.HOR_HORA_FIN >= ?`,
                [CodEspacio, currentNewDayRepaso1, HoraInicioRepaso1, HoraFinRepaso1]
            );

            if (restriccionRepaso1Result.length === 0) {
                res.status(201).json({ message: 'El repaso 1 no se encuentra dentro de la restricción de horario' });
                return;
            }
        }

        if (DiaRepaso2 !== undefined && HoraInicioRepaso2 !== undefined && HoraFinRepaso2 !== undefined && DiaRepaso2 !== '' && HoraInicioRepaso2 !== '' && HoraFinRepaso2 !== '') {
            const newDateRepaso2 = new Date(DiaRepaso1);
            const currentNewDayRepaso2 = newDateRepaso2.getDay() === 0 ? 6 : newDateRepaso2.getDay() - 1;

            const [restriccionRepaso2Result] = await pool.query<RowDataPacket[]>(
                `SELECT
                    r.PK_TMEERESTRICCION AS CodRestriccion,
                    r.PK_TMEESPACIO AS CodEspacio,
                    r.PK_TMCPERSONA_INTERNA AS CodPersonaInterna,
                    r.RES_FECHA_CREACION AS FechaCreacion,
                    r.RES_FECHA_EDICION AS FechaEdicion,
                    r.ESTADO as Estado,
                    h.PK_TMEEHORARIO AS CodHorario,
                    h.PK_TMEERESTRICCION AS CodRestriccion,
                    h.HOR_DIA AS Dia,
                    h.HOR_HORA_INICIO AS HoraInicio,
                    h.HOR_HORA_FIN AS HoraFin,
                    h.ESTADO as Estado
                FROM
                    T_MEERESTRICCION r
                    INNER JOIN T_MEEHORARIO h ON r.PK_TMEERESTRICCION = h.PK_TMEERESTRICCION
                WHERE r.PK_TMEESPACIO = ? AND r.ESTADO = 1 AND h.ESTADO = 1 AND h.HOR_DIA = ? AND h.HOR_HORA_INICIO <= ? AND h.HOR_HORA_FIN >= ?`,
                [CodEspacio, currentNewDayRepaso2, HoraInicioRepaso2, HoraFinRepaso2]
            );

            if (restriccionRepaso2Result.length === 0) {
                res.status(400).json({ message: 'El repaso 2 no se encuentra dentro de la restricción de horario' });
                return;
            }
        }

        // Validar si existen colisiones con otras reservas o repasos
        const [rows] = await pool.query<RowDataPacket[]>(
            `SELECT
                            r.PK_TMRRESERVA AS CodReserva,
                            r.RES_DIA AS Dia,
                            r.RES_HORA_INICIO AS HoraInicio,
                            r.RES_HORA_FIN AS HoraFin,
                            r.ESTADO as Estado
                        FROM
                            T_MRRESERVA r
                            INNER JOIN T_MEESPACIO e ON r.PK_TMEESPACIO = e.PK_TMEESPACIO
                        WHERE r.PK_TMEESPACIO = ? AND r.RES_ESTADO_SOLICITUD != 0 AND r.ESTADO = 1 AND e.ESTADO = 1 AND r.RES_DIA = ? AND r.RES_ESTADO_SOLICITUD != 0`,
            [CodEspacio, Dia]
        );

        const reservations = rows.map(row => ({
            start: row.HoraInicio,
            end: row.HoraFin
        }));

        let repaso1Reservations: any[] = [];
        let repaso2Reservations: any[] = [];

        if (DiaRepaso1 !== undefined && HoraInicioRepaso1 !== undefined && HoraFinRepaso1 !== undefined && DiaRepaso1 !== '' && HoraInicioRepaso1 !== '' && HoraFinRepaso1 !== '') {
            const [repasos] = await pool.query<RowDataPacket[]>(
                `SELECT
                      r.PK_TMRRESERVA AS CodReserva,
                      r.REP_DIA AS Dia,
                      r.REP_HORA_INICIO AS HoraInicio,
                      r.REP_HORA_FIN AS HoraFin,
                      r.ESTADO as Estado
                    FROM
                      T_MRREPASO r
                      INNER JOIN T_MRRESERVA res ON res.PK_TMRRESERVA = r.PK_TMRRESERVA
                      INNER JOIN T_MEESPACIO e ON res.PK_TMEESPACIO = e.PK_TMEESPACIO
                    WHERE res.PK_TMEESPACIO = ? AND res.ESTADO = 1 AND e.ESTADO = 1 AND r.REP_DIA = ? AND res.RES_ESTADO_SOLICITUD != 0 AND r.ESTADO = 1`,
                [CodEspacio, DiaRepaso1]
            );

            repaso1Reservations = repasos.map(repaso => ({
                start: repaso.HoraInicio,
                end: repaso.HoraFin
            }));
        }

        if (DiaRepaso2 !== undefined && HoraInicioRepaso2 !== undefined && HoraFinRepaso2 !== undefined && DiaRepaso2 !== '' && HoraInicioRepaso2 !== '' && HoraFinRepaso2 !== '') {
            const [repasos] = await pool.query<RowDataPacket[]>(
                `SELECT
                        r.PK_TMRRESERVA AS CodReserva,
                        r.REP_DIA AS Dia,
                        r.REP_HORA_INICIO AS HoraInicio,
                        r.REP_HORA_FIN AS HoraFin,
                        r.ESTADO as Estado
                    FROM
                        T_MRREPASO r
                        INNER JOIN T_MRRESERVA res ON res.PK_TMRRESERVA = r.PK_TMRRESERVA
                        INNER JOIN T_MEESPACIO e ON res.PK_TMEESPACIO = e.PK_TMEESPACIO
                    WHERE res.PK_TMEESPACIO = ? AND res.ESTADO = 1 AND e.ESTADO = 1 AND r.REP_DIA = ? AND res.RES_ESTADO_SOLICITUD != 0 AND r.ESTADO = 1`,
                [CodEspacio, DiaRepaso2]
            );

            repaso2Reservations = repasos.map(repaso => ({
                start: repaso.HoraInicio,
                end: repaso.HoraFin
            }));
        }

        const hasOverlap = reservations.some(reservation => {
            const { start, end } = reservation;

            // Verificar superposición con otras reservas
            if (HoraInicio >= start && HoraInicio < end) {
                return true;
            }

            if (HoraFin > start && HoraFin <= end) {
                return true;
            }

            if (HoraInicio <= start && HoraFin >= end) {
                return true;
            }

            // Verificar superposición con repasos
            if (repaso1Reservations.length === 0 && repaso2Reservations.length === 0) {
                return false;
            }

            const repaso1 = repaso1Reservations.some(repaso => {
                const { start: repasoStart, end: repasoEnd } = repaso;

                if (HoraInicioRepaso1 >= repasoStart && HoraInicioRepaso1 < repasoEnd) {
                    return true;
                }

                if (HoraFinRepaso1 > repasoStart && HoraFinRepaso1 <= repasoEnd) {
                    return true;
                }

                if (HoraInicioRepaso1 <= repasoStart && HoraFinRepaso1 >= repasoEnd) {
                    return true;
                }

                return false;
            });

            const repaso2 = repaso2Reservations.some(repaso => {
                const { start: repasoStart, end: repasoEnd } = repaso;

                if (HoraInicioRepaso2 >= repasoStart && HoraInicioRepaso2 < repasoEnd) {
                    return true;
                }

                if (HoraFinRepaso2 > repasoStart && HoraFinRepaso2 <= repasoEnd) {
                    return true;
                }

                if (HoraInicioRepaso2 <= repasoStart && HoraFinRepaso2 >= repasoEnd) {
                    return true;
                }

                return false;
            });

            if (repaso1 && repaso2) {
                return true;
            }
        });

        if (hasOverlap) {
            res.status(201).json({ message: 'La reserva o repaso se superpone con otra existente' });
            return;
        }

        // Fin de validacion de colisión

        const FechaCreacion = new Date(Date.now());
        const FechaEdicion = FechaCreacion;
        const Disponibilidad = 1;

        const { miEspacioSession } = req.cookies;

        if (miEspacioSession === undefined) {
            res.status(201).json({ message: 'No se ha iniciado sesión' });
            return;
        }

        const { payload } = await jwtVerify(
            miEspacioSession,
            new TextEncoder().encode('secret')
        );

        const CodPersonaInterna = payload?.PI;
        let CodPersonaExterna: number | null = null;

        if (EsPersonaExterna === true) {
            const [personaExternaResult] = await pool.query<OkPacket>(
                'INSERT INTO T_MCPERSONA_EXTERNA (PEE_NOMBRE, PEE_APELLIDO_PATERNO, PEE_APELLIDO_MATERNO, PEE_EMAIL_PERSONAL, PEE_TELEFONO, PEE_CEDULA, PEE_ORGANIZACION, ESTADO) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    NombrePersonaExterna,
                    ApellPaternoPersonaExterna,
                    ApellMaternoPersonaExterna,
                    EmailPersonaExterna,
                    TelefonoPersonaExterna,
                    CedulaPersonaExterna,
                    OrganizacionPersonaExterna,
                    1
                ]
            );

            CodPersonaExterna = personaExternaResult.insertId;
        }

        const fechaDia = new Date(Dia);

        const [reservaResult] = await pool.query<OkPacket>(
            'INSERT INTO T_MRRESERVA (PK_TMCPERSONA_INTERNA, PK_TMEESPACIO, RES_FECHA_CREACION, RES_RAZON, RES_ESTADO_SOLICITUD, RES_ES_PERSONA_EXT, RES_EVENTO_ACADEMICO, RES_DIA, RES_HORA_INICIO, RES_HORA_FIN, PK_TMRTIPO_EVENTO, PK_TMCPERSONA_EXTERNA, ESTADO) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                CodPersonaInterna,
                CodEspacio,
                FechaCreacion,
                Razon,
                EsPersonaExterna && CodPersonaExterna !== null ? 1 : 2,
                EsPersonaExterna,
                isEventoAcademico,
                fechaDia,
                HoraInicio,
                HoraFin,
                CodTipoEvento === '' ? null : CodTipoEvento,
                CodPersonaExterna,
                1
            ]
        );

        const CodReserva = reservaResult.insertId;

        if (CodReserva === undefined) {
            res.status(201).json({ message: 'Error al crear la reserva' });
            return;
        }

        if (Equipos && Equipos.length > 0) {
            const FechaAsignacion = new Date(Date.now());

            const equipos = Equipos.map((equipo: any) => {
                return [CodReserva, equipo, FechaAsignacion, 1];
            });

            const [equiposReservadosResult] = await pool.query<OkPacket>(
                'INSERT INTO T_MREQUIPO_RESERVADO (PK_TMRRESERVA, PK_TMEEQUIPO, ERE_FECHA_ASIGNACION, ESTADO) VALUES ?',
                [equipos]
            );
        }

        if (ServiciosEspeciales && ServiciosEspeciales.length > 0) {
            const FechaAsignacion = new Date(Date.now());

            const serviciosEspeciales = ServiciosEspeciales.map((servicio: any) => {
                return [CodReserva, servicio, FechaAsignacion, 1];
            });

            const [serviciosEspecialesReservadosResult] = await pool.query<OkPacket>(
                'INSERT INTO T_MRSERVICIO_ESPECIAL_RESERVA (PK_TMRRESERVA, PK_TMRSERVICIO_ESPECIAL, SER_FECHA_ASIGNACION, ESTADO) VALUES ?',
                [serviciosEspeciales]
            );
        }

        if (DiaRepaso1 !== null && HoraInicioRepaso1 !== null && HoraFinRepaso1 !== null && DiaRepaso1 !== '' && HoraInicioRepaso1 !== '' && HoraFinRepaso1 !== '') {
            const fechaDia = new Date(DiaRepaso1);

            const [repaso1Result] = await pool.query<OkPacket>(
                'INSERT INTO T_MRREPASO (PK_TMRRESERVA, REP_DIA, REP_HORA_INICIO, REP_HORA_FIN, ESTADO) VALUES (?, ?, ?, ?, ?)',
                [
                    CodReserva,
                    fechaDia,
                    HoraInicioRepaso1,
                    HoraFinRepaso1,
                    1
                ]
            );

            if (DiaRepaso2 !== null && HoraInicioRepaso2 !== null && HoraFinRepaso2 !== null && DiaRepaso2 !== '' && HoraInicioRepaso2 !== '' && HoraFinRepaso2 !== '') {
                const fechaDia = new Date(DiaRepaso2);

                const [repaso2Result] = await pool.query<OkPacket>(
                    'INSERT INTO T_MRREPASO (PK_TMRRESERVA, REP_DIA, REP_HORA_INICIO, REP_HORA_FIN, ESTADO) VALUES (?, ?, ?, ?, ?)',
                    [
                        CodReserva,
                        fechaDia,
                        HoraInicioRepaso2,
                        HoraFinRepaso2,
                        1
                    ]
                );
            }
        }

        // Obtencion de información adicional
        let [rows_equipos] = [] as any;

        if (!Equipos || Equipos.length === 0) {
            console.log('No se encontraron equipos.');
        } else {
            [rows_equipos] = await pool.query<RowDataPacket[]>(`
                SELECT
                    eq.PK_TMEEQUIPO AS CodEquipo,
                    eq.EQU_NOMBRE AS NombreEquipo,
                    eq.EQU_CANTIDAD AS Cantidad,
                    eq.PK_TMEESPACIO AS CodEspacio,
                    eq.PK_TMETIPO_EQUIPO AS CodTipoEquipo,
                    teq.TEQ_NOMBRE AS NombreTipoEquipo,
                    eq.ESTADO AS Estado
                FROM T_MEEQUIPO eq
                JOIN T_METIPO_EQUIPO teq ON eq.PK_TMETIPO_EQUIPO = teq.PK_TMETIPO_EQUIPO
                WHERE eq.PK_TMEEQUIPO IN (?) AND teq.ESTADO = 1 AND eq.ESTADO = 1`,
                [Equipos]
            );
        }

        let [rows_servicios_especiales] = [] as any;

        if (!ServiciosEspeciales || ServiciosEspeciales.length === 0) {
            console.log('No se encontraron Servicios Especiales.');
        } else {
            [rows_servicios_especiales] = await pool.query<RowDataPacket[]>(
                `
                SELECT
                    se.PK_TMRSERVICIO_ESPECIAL AS CodServicioEspecial,
                    se.SES_NOMBRE AS NombreServicioEspecial,
                    se.SES_DESCRIPCION AS DescripcionServicioEspecial,
                    se.PK_TMEUNIDAD AS CodUnidad,
                    se.ESTADO AS Estado,
                    pi.PEI_EMAIL_INSTITUCIONAL AS CorreoInstitucionalDirigenteUnidad,
                    pi.PEI_EMAIL_PERSONAL AS CorreoPersonalDirigenteUnidad
                FROM T_MRSERVICIO_ESPECIAL se
                LEFT JOIN (
                    SELECT
                    dun.PK_TMEUNIDAD AS CodUnidad,
                    dun.PK_TMCPERSONA_INTERNA AS CodPersonaInterna,
                    pi.PEI_EMAIL_INSTITUCIONAL,
                    pi.PEI_EMAIL_PERSONAL
                    FROM T_MEDIRIGENTE_UNIDAD dun
                    JOIN T_MCPERSONA_INTERNA pi ON dun.PK_TMCPERSONA_INTERNA = pi.PK_TMCPERSONA_INTERNA
                    WHERE dun.ESTADO = 1
                ) pi ON se.PK_TMEUNIDAD = pi.CodUnidad
                WHERE se.PK_TMRSERVICIO_ESPECIAL IN (?) AND se.ESTADO = 1
                `,
                [ServiciosEspeciales ? ServiciosEspeciales : []]
            );
        }

        //obtener los detalles del espacio
        const [rows_espacio] = await pool.query<RowDataPacket[]>(
            `
                SELECT
                    PK_TMEESPACIO AS CodEspacio,
                    ESP_NOMBRE AS NombreEspacio,
                    ESP_DISPONIBILIDAD AS Disponibilidad,
                    ESTADO AS Estado
                FROM T_MEESPACIO
                WHERE PK_TMEESPACIO = ? AND ESTADO = 1
            `,
            [CodEspacio]
        );

        const espacio = rows_espacio[0] as Espacio_Tiny;

        const correoServiciosMap: { [correo: string]: ServicioEspecialReservas[] } = {};
        const serviciosEspeciales = rows_servicios_especiales as ServicioEspecialDirigentes[];
        if (serviciosEspeciales && serviciosEspeciales.length > 0) {
            serviciosEspeciales.forEach((servicio: ServicioEspecialDirigentes) => {
                // Obtenemos el correo institucional o personal de la persona responsable de la unidad
                const correoDirigenteUnidad =
                    servicio.CorreoInstitucionalDirigenteUnidad ||
                    servicio.CorreoPersonalDirigenteUnidad;

                // Si el correo existe en el objeto, agregamos el servicio al arreglo correspondiente
                if (correoDirigenteUnidad && correoServiciosMap[correoDirigenteUnidad]) {
                    correoServiciosMap[correoDirigenteUnidad].push(servicio);
                } else {
                    // Si el correo no existe en el objeto, creamos una nueva entrada con el servicio
                    correoServiciosMap[correoDirigenteUnidad] = [servicio];
                }
            });


            Object.keys(correoServiciosMap).forEach((correo) => {
                console.log("Correo:", correo);
                console.log("Servicios:");
                correoServiciosMap[correo].forEach((servicio) => {
                    console.log(
                        `- ${servicio.NombreServicioEspecial} - Descripción: ${servicio.DescripcionServicioEspecial}`
                    );
                });
            });
        }

        const [correo_institucional_reservador] = await pool.query<RowDataPacket[]>(
            `SELECT
                pi.PEI_EMAIL_INSTITUCIONAL AS CorreoInstitucional,
                pi.PEI_EMAIL_PERSONAL AS CorreoPersonal,
                pi.PEI_CARNET_ID AS ID
            FROM T_MCPERSONA_INTERNA pi
            WHERE pi.PK_TMCPERSONA_INTERNA = ?`,
            [CodPersonaInterna]
        );

        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com', // Servidor SMTP de Gmail
            port: 465, // Puerto para la conexión TLS
            secure: true,
            auth: {
                user: 'miespacio.espe@gmail.com',
                pass: 'zvqiaicxoauwfqqe',
            },
        });

        if (EsPersonaExterna === true && CodPersonaExterna !== null) {
            // Enviar correo a la persona externa
            const [correos_dirigentes_espacios] = await pool.query<RowDataPacket[]>(
                `SELECT
                    pi.PEI_EMAIL_INSTITUCIONAL AS CorreoInstitucional,
                    pi.PEI_EMAIL_PERSONAL AS CorreoPersonal
                FROM T_MEDIRIGENTE_ESPACIO de
                JOIN T_MCPERSONA_INTERNA pi ON de.PK_TMCPERSONA_INTERNA = pi.PK_TMCPERSONA_INTERNA
                WHERE de.PK_TMEESPACIO = ? AND de.ESTADO = '1'`,
                [CodEspacio]
            );

            let emailSuccess = true;

            const currentDate = new Date();
            const formattedDate = `${currentDate.getDate()}/${currentDate.getMonth() + 1}/${currentDate.getFullYear()}`;
            const mailOptions = {
                from: 'miespacio.espe@gmail.com',
                to: `${correo_institucional_reservador[0].CorreoInstitucional}, ${EmailPersonaExterna}`,
                subject: 'Reserva Agendada',
                html: `<p>Saludos.</p><p>Se ha agendado la reserva con éxito del espacio <b>${espacio.NombreEspacio}</b> para la persona ${NombrePersonaExterna} ${ApellPaternoPersonaExterna} ${ApellMaternoPersonaExterna} ${OrganizacionPersonaExterna !== '' && OrganizacionPersonaExterna !== null ? 'en representación de la organización ' + OrganizacionPersonaExterna : ''}.</p>
                            <p>La reserva fue realizada por <b>${correo_institucional_reservador[0].ID} - ${correo_institucional_reservador[0].CorreoInstitucional}</b> el día ${formattedDate}.</p>
                            <h5>Información de la reserva:</h5>
                            <p><b>Fecha:</b> ${(new Date(Dia)).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                            <p><b>Hora de inicio:</b> ${HoraInicio}</p>
                            <p><b>Hora de fin:</b> ${HoraFin}</p>
                            <p><b>Razón:</b> ${Razon}</p>
                            ${Equipos && Equipos.length > 0 ? `<p><b>Equipos:</b> ${rows_equipos.map((equipo: any) => equipo.NombreEquipo).join(', ')}</p>` : ''}
                            ${ServiciosEspeciales && ServiciosEspeciales.length > 0 ? `<p><b>Servicios especiales:</b> ${rows_servicios_especiales.map((servicio: any) => servicio.NombreServicioEspecial).join(', ')}</p>` : ''}
                            ${DiaRepaso1 !== null && HoraInicioRepaso1 !== null && HoraFinRepaso1 !== null && DiaRepaso1 !== '' && HoraInicioRepaso1 !== '' && HoraFinRepaso1 !== '' ? `<p><b>Repaso 1:</b></p><p>Fecha: ${(new Date(DiaRepaso1)).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</p><p>Hora de inicio: ${HoraInicioRepaso1}</p><p>Hora de fin: ${HoraFinRepaso1}</p>` : ''}
                            ${DiaRepaso2 !== null && HoraInicioRepaso2 !== null && HoraFinRepaso2 !== null && DiaRepaso2 !== '' && HoraInicioRepaso2 !== '' && HoraFinRepaso2 !== '' ? `<p><b>Repaso 2:</b></p><p>Fecha: ${(new Date(DiaRepaso2)).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</p><p>Hora de inicio: ${HoraInicioRepaso2}</p><p>Hora de fin: ${HoraFinRepaso2}</p>` : ''}
                            <p>Para ver más detalles de la reserva ingrese al sistema MiEspacio o de click en el siguiente enlace.</p>
                            <h5><a href='${API_BASE_URL_SEC}/reservas?filter=CodReserva-${CodReserva}' target='_blank'>Ver Reserva</a></h5>
                            `,
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.log('Error al enviar el correo:', error);
                    emailSuccess = false;
                } else {
                    console.log('Correo enviado:', info.response);
                }
            });

            if (!emailSuccess) {
                res.status(201).json({ message: 'Error al enviar el correo' });
                return;
            }

            //Correo a las personas dirigentes del espacio
            let success = true;

            correos_dirigentes_espacios.forEach((dirigente: any) => {
                const currentDate = new Date();
                const formattedDate = `${currentDate.getDate()}/${currentDate.getMonth() + 1}/${currentDate.getFullYear()}`;
                const mailOptions = {
                    from: 'miespacio.espe@gmail.com',
                    to: dirigente.CorreoInstitucional,
                    subject: 'Nueva Reserva Agendada',
                    html: `<p>Saludos.</p><p>Se ha agendado la reserva con éxito del espacio <b>${espacio.NombreEspacio}</b> para la persona ${NombrePersonaExterna} ${ApellPaternoPersonaExterna} ${ApellMaternoPersonaExterna} ${OrganizacionPersonaExterna !== '' && OrganizacionPersonaExterna !== null ? 'en representación de la organización ' + OrganizacionPersonaExterna : ''}.</p>
                            <p>La reserva fue realizada por <b>${correo_institucional_reservador[0].ID} - ${correo_institucional_reservador[0].CorreoInstitucional}</b> el día ${formattedDate} el día ${formattedDate}.</p>
                            <h5>Información de la reserva:</h5>
                            <p><b>Fecha:</b> ${(new Date(Dia)).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                            <p><b>Hora de inicio:</b> ${HoraInicio}</p>
                            <p><b>Hora de fin:</b> ${HoraFin}</p>
                            <p><b>Razón:</b> ${Razon}</p>
                            ${Equipos && Equipos.length > 0 ? `<p><b>Equipos:</b> ${rows_equipos.map((equipo: any) => equipo.NombreEquipo).join(', ')}</p>` : ''}
                            ${ServiciosEspeciales && ServiciosEspeciales.length > 0 ? `<p><b>Servicios especiales:</b> ${rows_servicios_especiales.map((servicio: any) => servicio.NombreServicioEspecial).join(', ')}</p>` : ''}
                            ${DiaRepaso1 !== null && HoraInicioRepaso1 !== null && HoraFinRepaso1 !== null && DiaRepaso1 !== '' && HoraInicioRepaso1 !== '' && HoraFinRepaso1 !== '' ? `<p><b>Repaso 1:</b></p><p>Fecha: ${(new Date(DiaRepaso1)).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</p><p>Hora de inicio: ${HoraInicioRepaso1}</p><p>Hora de fin: ${HoraFinRepaso1}</p>` : ''}
                            ${DiaRepaso2 !== null && HoraInicioRepaso2 !== null && HoraFinRepaso2 !== null && DiaRepaso2 !== '' && HoraInicioRepaso2 !== '' && HoraFinRepaso2 !== '' ? `<p><b>Repaso 2:</b></p><p>Fecha: ${(new Date(DiaRepaso2)).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</p><p>Hora de inicio: ${HoraInicioRepaso2}</p><p>Hora de fin: ${HoraFinRepaso2}</p>` : ''}
                            <p>Para ver más información de la reserva ingrese al sistema MiEspacio o de click en el siguiente enlace.</p>
                            <h5><a href='${API_BASE_URL_SEC}/reservas?filter=CodReserva-${CodReserva}' target='_blank'>Ver Reserva</a></h5>
                            <h6><i>Debe tener en cuenta que el cumplimiento de equipos solicitados en la reserva son responsabilidad de los encargados del espacio</i></h6>
                            `,
                };

                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        console.log('Error al enviar el correo:', error);
                        success = false;
                    } else {
                        console.log('Correo enviado:', info.response);
                    }
                });
            });

            if (!success) {
                res.status(201).json({ message: 'Error al enviar los correos' });
                return;
            }

            //Correo a las personas dirigentes de los servicios especiales
            if (serviciosEspeciales && serviciosEspeciales.length > 0) {
                let success = true;
                Object.keys(correoServiciosMap).forEach((correo) => {
                    const currentDate = new Date();
                    const formattedDate = `${currentDate.getDate()}/${currentDate.getMonth() + 1}/${currentDate.getFullYear()}`;
                    const serviciosEspecialesText = correoServiciosMap[correo]
                        .map((servicio) => servicio.NombreServicioEspecial)
                        .join(" - ");
                    const mailOptions = {
                        from: 'miespacio.espe@gmail.com',
                        to: correo,
                        subject: 'Servicios Requeridos en Reserva',
                        html: `<p>Saludos.</p><p>Se ha agendado la reserva del espacio <b>${espacio.NombreEspacio}</b> para la persona ${NombrePersonaExterna} ${ApellPaternoPersonaExterna} ${ApellMaternoPersonaExterna} ${OrganizacionPersonaExterna !== '' && OrganizacionPersonaExterna !== null ? 'en representación de la organización ' + OrganizacionPersonaExterna : ''} y se requiere del servicio <b>${serviciosEspecialesText}</b></p>
                                <p>La reserva fue realizada por <b>${correo_institucional_reservador[0].ID} - ${correo_institucional_reservador[0].CorreoInstitucional}</b> el día ${formattedDate}.</p>
                                <h5>Información de la reserva:</h5>
                                <p><b>Fecha:</b> ${(new Date(Dia)).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                <p><b>Hora de inicio:</b> ${HoraInicio}</p>
                                <p><b>Hora de fin:</b> ${HoraFin}</p>
                                <p><b>Razón:</b> ${Razon}</p>
                                ${Equipos && Equipos.length > 0 ? `<p><b>Equipos:</b> ${rows_equipos.map((equipo: any) => equipo.NombreEquipo).join(', ')}</p>` : ''}
                                ${ServiciosEspeciales && ServiciosEspeciales.length > 0 ? `<p><b>Servicios especiales:</b> ${rows_servicios_especiales.map((servicio: any) => servicio.NombreServicioEspecial).join(', ')}</p>` : ''}
                                ${DiaRepaso1 !== null && HoraInicioRepaso1 !== null && HoraFinRepaso1 !== null && DiaRepaso1 !== '' && HoraInicioRepaso1 !== '' && HoraFinRepaso1 !== '' ? `<p><b>Repaso 1:</b></p><p>Fecha: ${(new Date(DiaRepaso1)).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</p><p>Hora de inicio: ${HoraInicioRepaso1}</p><p>Hora de fin: ${HoraFinRepaso1}</p>` : ''}
                                ${DiaRepaso2 !== null && HoraInicioRepaso2 !== null && HoraFinRepaso2 !== null && DiaRepaso2 !== '' && HoraInicioRepaso2 !== '' && HoraFinRepaso2 !== '' ? `<p><b>Repaso 2:</b></p><p>Fecha: ${(new Date(DiaRepaso2)).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</p><p>Hora de inicio: ${HoraInicioRepaso2}</p><p>Hora de fin: ${HoraFinRepaso2}</p>` : ''}
                                <p>Para ver más información de la reserva ingrese al sistema MiEspacio o de click en el siguiente enlace.</p>
                                <h2><a href='${API_BASE_URL_SEC}/reservas?filter=CodReserva-${CodReserva}' target='_blank'>Ver Reserva</a></h2>
                                <h6><i>Debe tener en cuenta que el servicio solicitado en la reserva debe ser satisfecho por la unidad encargada</i></h6>
                                `,
                    };

                    transporter.sendMail(mailOptions, (error, info) => {
                        if (error) {
                            console.log('Error al enviar el correo:', error);
                            success = false;
                        } else {
                            console.log('Correo enviado:', info.response);
                        }
                    });

                });

                if (!success) {
                    res.status(201).json({ message: 'Error al enviar los correos' });
                    return;
                }
            }
        } else {
            const [correos_dirigentes_espacios] = await pool.query<RowDataPacket[]>(
                `SELECT
                    pi.PEI_EMAIL_INSTITUCIONAL AS CorreoInstitucional,
                    pi.PEI_EMAIL_PERSONAL AS CorreoPersonal
                FROM T_MEDIRIGENTE_ESPACIO de
                JOIN T_MCPERSONA_INTERNA pi ON de.PK_TMCPERSONA_INTERNA = pi.PK_TMCPERSONA_INTERNA
                WHERE de.PK_TMEESPACIO = ? AND de.ESTADO = '1'`,
                [CodEspacio]
            );

            //Correo a la persona que hizo la reserva
            let emailSuccess = true;

            const currentDate = new Date();
            const formattedDate = `${currentDate.getDate()}/${currentDate.getMonth() + 1}/${currentDate.getFullYear()}`;
            const mailOptions = {
                from: 'miespacio.espe@gmail.com',
                to: correo_institucional_reservador[0].CorreoInstitucional,
                subject: 'Solicitud para Reserva',
                html: `<p>Saludos.</p><p>Se ha solicitado con éxito la reserva del espacio <b>${espacio.NombreEspacio}</b> realizada por usted el día ${formattedDate}.</p>
                            <h5>Información de la reserva:</h5>
                            <p><b>Fecha:</b> ${(new Date(Dia)).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                            <p><b>Hora de inicio:</b> ${HoraInicio}</p>
                            <p><b>Hora de fin:</b> ${HoraFin}</p>
                            <p><b>Razón:</b> ${Razon}</p>
                            ${Equipos && Equipos.length > 0 ? `<p><b>Equipos:</b> ${rows_equipos.map((equipo: any) => equipo.NombreEquipo).join(', ')}</p>` : ''}
                            ${ServiciosEspeciales && ServiciosEspeciales.length > 0 ? `<p><b>Servicios especiales:</b> ${rows_servicios_especiales.map((servicio: any) => servicio.NombreServicioEspecial).join(', ')}</p>` : ''}
                            ${DiaRepaso1 !== null && HoraInicioRepaso1 !== null && HoraFinRepaso1 !== null && DiaRepaso1 !== '' && HoraInicioRepaso1 !== '' && HoraFinRepaso1 !== '' ? `<p><b>Repaso 1:</b></p><p>Fecha: ${(new Date(DiaRepaso1)).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</p><p>Hora de inicio: ${HoraInicioRepaso1}</p><p>Hora de fin: ${HoraFinRepaso1}</p>` : ''}
                            ${DiaRepaso2 !== null && HoraInicioRepaso2 !== null && HoraFinRepaso2 !== null && DiaRepaso2 !== '' && HoraInicioRepaso2 !== '' && HoraFinRepaso2 !== '' ? `<p><b>Repaso 2:</b></p><p>Fecha: ${(new Date(DiaRepaso2)).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</p><p>Hora de inicio: ${HoraInicioRepaso2}</p><p>Hora de fin: ${HoraFinRepaso2}</p>` : ''}
                            <p>Para ver más detalles de la reserva ingrese al sistema MiEspacio o de click en el siguiente enlace.</p>
                            <h5><a href='${API_BASE_URL_SEC}/reservas?filter=CodReserva-${CodReserva}' target='_blank'>Ver Reserva</a></h5>
                            `,
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.log('Error al enviar el correo:', error);
                    emailSuccess = false;
                } else {
                    console.log('Correo enviado:', info.response);
                }
            });

            if (!emailSuccess) {
                res.status(201).json({ message: 'Error al enviar el correo' });
                return;
            }

            //Correo a las personas dirigentes del espacio
            let success = true;

            correos_dirigentes_espacios.forEach((dirigente: any) => {
                const currentDate = new Date();
                const formattedDate = `${currentDate.getDate()}/${currentDate.getMonth() + 1}/${currentDate.getFullYear()}`;
                const mailOptions = {
                    from: 'miespacio.espe@gmail.com',
                    to: dirigente.CorreoInstitucional,
                    subject: 'Solicitud para Reserva',
                    html: `<p>Saludos.</p><p>Se ha solicitado aprobación para la reserva del espacio <b>${espacio.NombreEspacio}</b> del cual usted se registra como responsable.</p>
                            <p>La solicitud fue realizada por <b>${correo_institucional_reservador[0].ID} - ${correo_institucional_reservador[0].CorreoInstitucional}</b> el día ${formattedDate}.</p>
                            <h5>Información de la reserva:</h5>
                            <p><b>Fecha:</b> ${(new Date(Dia)).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                            <p><b>Hora de inicio:</b> ${HoraInicio}</p>
                            <p><b>Hora de fin:</b> ${HoraFin}</p>
                            <p><b>Razón:</b> ${Razon}</p>
                            ${Equipos && Equipos.length > 0 ? `<p><b>Equipos:</b> ${rows_equipos.map((equipo: any) => equipo.NombreEquipo).join(', ')}</p>` : ''}
                            ${ServiciosEspeciales && ServiciosEspeciales.length > 0 ? `<p><b>Servicios especiales:</b> ${rows_servicios_especiales.map((servicio: any) => servicio.NombreServicioEspecial).join(', ')}</p>` : ''}
                            ${DiaRepaso1 !== null && HoraInicioRepaso1 !== null && HoraFinRepaso1 !== null && DiaRepaso1 !== '' && HoraInicioRepaso1 !== '' && HoraFinRepaso1 !== '' ? `<p><b>Repaso 1:</b></p><p>Fecha: ${(new Date(DiaRepaso1)).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</p><p>Hora de inicio: ${HoraInicioRepaso1}</p><p>Hora de fin: ${HoraFinRepaso1}</p>` : ''}
                            ${DiaRepaso2 !== null && HoraInicioRepaso2 !== null && HoraFinRepaso2 !== null && DiaRepaso2 !== '' && HoraInicioRepaso2 !== '' && HoraFinRepaso2 !== '' ? `<p><b>Repaso 2:</b></p><p>Fecha: ${(new Date(DiaRepaso2)).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</p><p>Hora de inicio: ${HoraInicioRepaso2}</p><p>Hora de fin: ${HoraFinRepaso2}</p>` : ''}
                            <p>Para <b>aprobar o rechazar</b> la solicitud, ingrese al sistema MiEspacio o de click en el siguiente enlace.</p>
                            <h5><a href='${API_BASE_URL_SEC}/reservas?filter=CodReserva-${CodReserva}' target='_blank'>Ver Reserva</a></h5>
                            <h6><i>Debe tener en cuenta que el cumplimiento de equipos solicitados en la reserva son responsabilidad de los encargados del espacio</i></h6>
                            `,
                };

                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        console.log('Error al enviar el correo:', error);
                        success = false;
                    } else {
                        console.log('Correo enviado:', info.response);
                    }
                });
            });

            if (!success) {
                res.status(201).json({ message: 'Error al enviar los correos' });
                return;
            }
        }

        // crear objetos de reserva y repasos si los hay para mandarlos de vuelta
        const reserva: Reserva = {
            CodReserva,
            CodPersonaInterna: CodPersonaInterna as number,
            CodEspacio,
            FechaCreacion,
            Razon,
            EstadoSolicitud: EsPersonaExterna ? '1' : '2',
            EsPersonaExterna,
            EventoAcademico: isEventoAcademico as number,
            Dia,
            HoraInicio,
            HoraFin,
            CodTipoEvento,
            CodPersonaExterna,
            Estado: '1'
        };

        const repasos: RepasoInfo[] = [];

        if (DiaRepaso1 !== null && HoraInicioRepaso1 !== null && HoraFinRepaso1 !== null && DiaRepaso1 !== '' && HoraInicioRepaso1 !== '' && HoraFinRepaso1 !== '') {
            repasos.push({
                CodReserva: CodReserva as number,
                CodRepaso: 0,
                Dia: DiaRepaso1,
                HoraInicio: HoraInicioRepaso1,
                HoraFin: HoraFinRepaso1,
                Estado: '1'
            });
        }

        if (DiaRepaso2 !== null && HoraInicioRepaso2 !== null && HoraFinRepaso2 !== null && DiaRepaso2 !== '' && HoraInicioRepaso2 !== '' && HoraFinRepaso2 !== '') {
            repasos.push({
                CodReserva: CodReserva as number,
                CodRepaso: 2,
                Dia: DiaRepaso2,
                HoraInicio: HoraInicioRepaso2,
                HoraFin: HoraFinRepaso2,
                Estado: '1'
            });
        }

        res.status(200).json({ reserva, repasos, espacio });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al crear el espacio' });
    }
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ReservaEspacioCalendar[] | ReservaEspacioCalendar | { message: string }>
) {
    const { method } = req;

    switch (method) {
        case 'GET':
            // Se parsean las query params de la URL para obtener los parámetros de la paginación y búsqueda
            const parsedUrl = url.parse(req.url || '', true);
            const { filter, search, format, date } = parsedUrl.query;

            // Se llama a la función getRoles con los parámetros correspondientes
            await getEspacios(req, res, {
                filter: filter ? filter.toString() : undefined,
                search: search ? search.toString() : undefined,
                format: format ? format.toString() : undefined,
                date: date ? date.toString() : undefined,
            });
            break;

        case 'POST':
            await createReserva(req, res);
            break;
        default:
            res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
            res.status(405).json({ message: `Método ${method} no permitido` });
            break;
    }
}