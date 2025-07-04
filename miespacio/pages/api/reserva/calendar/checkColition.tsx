import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/libs/db';
import { OkPacket, RowDataPacket } from 'mysql2';
import { jwtVerify } from 'jose';
import { ReservaEspacioInfo } from '@/libs/reserva';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const { method } = req;
    const { CodEspacio, Dia, HoraInicio, HoraFin } = req.query;

    switch (method) {
        case 'GET':
            try {

                if (CodEspacio === '' || Dia === '' || HoraInicio === '' || HoraFin === '' || CodEspacio === undefined || Dia === undefined || HoraInicio === undefined || HoraFin === undefined || CodEspacio === null || Dia === null || HoraInicio === null || HoraFin === null) {
                    res.status(201).json({ message: 'No se proporcionaron todos los datos' });
                    return;
                }

                const fechaReserva = new Date(Dia as string);
                const fechaActual = new Date();

                if (isNaN(fechaReserva.getTime()) || isNaN(fechaActual.getTime())) {
                    res.status(201).json({ message: 'La fecha proporcionada es inválida' });
                    return;
                }

                const [rows] = await pool.query<RowDataPacket[]>(
                    `SELECT
                            r.PK_TMRRESERVA AS CodReserva,
                            r.RES_DIA AS Dia,
                            r.RES_HORA_INICIO AS HoraInicio,
                            r.RES_HORA_FIN AS HoraFin,
                            r.ESTADO as Estado
                        FROM
                            T_MRRESERVA r
                            INNER JOIN T_MEESPACIO e ON r.PK_TMEESPACIO = e.PK_TMEESPACIO AND e.ESTADO = '1'
                        WHERE r.PK_TMEESPACIO = ? AND r.RES_ESTADO_SOLICITUD != '0' AND r.ESTADO = '1' AND r.RES_DIA = ?`,
                    [CodEspacio, Dia]
                );

                const [repasos] = await pool.query<RowDataPacket[]>(
                    `SELECT
                      r.PK_TMRRESERVA AS CodReserva,
                      r.REP_DIA AS Dia,
                      r.REP_HORA_INICIO AS HoraInicio,
                      r.REP_HORA_FIN AS HoraFin,
                      r.ESTADO as Estado
                    FROM
                      T_MRREPASO r
                      INNER JOIN T_MRRESERVA res ON r.PK_TMRRESERVA = res.PK_TMRRESERVA
                      INNER JOIN T_MEESPACIO e ON res.PK_TMEESPACIO = e.PK_TMEESPACIO
                    WHERE res.PK_TMEESPACIO = ? AND res.ESTADO = '1' AND e.ESTADO = '1' AND r.REP_DIA = ? AND res.RES_ESTADO_SOLICITUD != '0' AND r.ESTADO = '1'`,
                    [CodEspacio, Dia]
                );

                console.log('repasos', repasos);
                console.log('rows', rows);
                console.log('Dia, CodEspacio', Dia, CodEspacio);
                if (rows.length === 0 && repasos.length === 0) {
                    res.status(200).json({ message: 'Proceda Capitán' });
                    return;
                }

                const reservations = rows.map(row => ({
                    start: row.HoraInicio,
                    end: row.HoraFin
                }));

                const repasosReservations = repasos.map(repaso => ({
                    start: repaso.HoraInicio,
                    end: repaso.HoraFin
                }));

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
                    return repasosReservations.some(repaso => {
                        const { start: repasoStart, end: repasoEnd } = repaso;

                        if (HoraInicio >= repasoStart && HoraInicio < repasoEnd) {
                            return true;
                        }

                        if (HoraFin > repasoStart && HoraFin <= repasoEnd) {
                            return true;
                        }

                        if (HoraInicio <= repasoStart && HoraFin >= repasoEnd) {
                            return true;
                        }

                        return false;
                    });
                });

                console.log('reservations', reservations);
                console.log('repasosReservations', repasosReservations);
                console.log('Dia, HoraInicio, HoraFin', Dia, HoraInicio, HoraFin);

                if (hasOverlap) {
                    res.status(201).json({ message: 'La reserva se superpone con otra reserva o repaso existente' });
                    return;
                }

                res.status(200).json({ message: 'Proceda Capitán' });
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: 'Error al obtener la reserva' });
            }
            break;

        default:
            res.setHeader('Allow', ['GET']);
            res.status(405).json({ message: `Método ${method} no permitido` });
            break;
    }
}