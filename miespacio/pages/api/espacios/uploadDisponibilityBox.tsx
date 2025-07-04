import { NextApiRequest, NextApiResponse } from 'next';
import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { Restriccion, Horario, AvailabilityBox } from '@/libs/restriccion';
import { OkPacket, RowDataPacket } from 'mysql2';
import pool from '@/libs/db';
import url from 'url';
import { IncomingForm, Fields, Files, File as FormidableFile } from 'formidable';
import { jwtVerify } from 'jose';

export const config = {
    api: {
        bodyParser: false,
    },
};

const calculateDuration = (startHour: number, startMinute: number, endHour: number, endMinute: number) => {
    const totalMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
    return totalMinutes;
};

function calculateDurationToHour(duration: number, startHour: string) {
    const hour = parseInt(startHour.split(':')[0]);
    const minute = parseInt(startHour.split(':')[1]);
    const durationHour = Math.floor(duration / 60);
    const durationMinute = duration % 60;
    let newHour = hour + durationHour;
    let newMinute = minute + durationMinute;

    if (newMinute >= 60) {
        newHour += Math.floor(newMinute / 60);
        newMinute = newMinute % 60;
    }

    const newHourString = newHour.toString().padStart(2, '0');
    const newMinuteString = newMinute.toString().padStart(2, '0');
    const newHourStringFormat = newHourString + ':' + newMinuteString;

    return newHourStringFormat;
}

const checkForColisions = (box: Horario, allBoxes: AvailabilityBox[]) => {
    let result = false;
    if (box) {
        const currentDay = box.Dia;

        const startSelBoxHour = new Date();
        startSelBoxHour.setHours(parseInt(box.HoraInicio.split(':')[0]));
        startSelBoxHour.setMinutes(parseInt(box.HoraInicio.split(':')[1]));
        startSelBoxHour.setSeconds(0);

        const endSelBoxHour = new Date();
        endSelBoxHour.setHours(parseInt(box.HoraFin.split(':')[0]));
        endSelBoxHour.setMinutes(parseInt(box.HoraFin.split(':')[0]));
        endSelBoxHour.setSeconds(0);

        const sameDayBoxes = allBoxes.filter((b) => b.dayIndex === currentDay);

        sameDayBoxes.forEach((b) => {
            const bStartHour = parseInt(b.startHour.split(':')[0]);
            const bEndDate = calculateDurationToHour(b.duration, b.startHour);

            const startHourBox = new Date();
            startHourBox.setHours(parseInt(b.startHour.split(':')[0]));
            startHourBox.setMinutes(parseInt(b.startHour.split(':')[1]));
            startHourBox.setSeconds(0);

            const endHourBox = new Date();
            endHourBox.setHours(parseInt(bEndDate.split(':')[0]));
            endHourBox.setMinutes(parseInt(bEndDate.split(':')[1]));
            endHourBox.setSeconds(0);

            if (
                (startSelBoxHour >= startHourBox && startSelBoxHour <= endHourBox) ||
                (endSelBoxHour >= startHourBox && endSelBoxHour <= endHourBox) ||
                (startSelBoxHour <= startHourBox && endSelBoxHour >= endHourBox)
            ) {
                console.log('Hay una colisión');
                result = true;
            }
        });

        return result;
    } else {
        console.log('No hay caja seleccionada');
        return false;
    }
}

const checkForColisionsUpdate = (box: Horario, allBoxes: AvailabilityBox[]) => {
    let result = false;
    if (box) {
        const currentDay = box.Dia;

        const startSelBoxHour = new Date();
        startSelBoxHour.setHours(parseInt(box.HoraInicio.split(':')[0]));
        startSelBoxHour.setMinutes(parseInt(box.HoraInicio.split(':')[1]));
        startSelBoxHour.setSeconds(0);

        const endSelBoxHour = new Date();
        endSelBoxHour.setHours(parseInt(box.HoraFin.split(':')[0]));
        endSelBoxHour.setMinutes(parseInt(box.HoraFin.split(':')[0]));
        endSelBoxHour.setSeconds(0);

        const sameDayBoxes = allBoxes.filter((b) => b.dayIndex === currentDay && b.id !== box.CodHorario);

        sameDayBoxes.forEach((b) => {
            const bStartHour = parseInt(b.startHour.split(':')[0]);
            const bEndDate = calculateDurationToHour(b.duration, b.startHour);

            const startHourBox = new Date();
            startHourBox.setHours(parseInt(b.startHour.split(':')[0]));
            startHourBox.setMinutes(parseInt(b.startHour.split(':')[1]));
            startHourBox.setSeconds(0);

            const endHourBox = new Date();
            endHourBox.setHours(parseInt(bEndDate.split(':')[0]));
            endHourBox.setMinutes(parseInt(bEndDate.split(':')[1]));
            endHourBox.setSeconds(0);

            if (
                (startSelBoxHour >= startHourBox && startSelBoxHour <= endHourBox) ||
                (endSelBoxHour >= startHourBox && endSelBoxHour <= endHourBox) ||
                (startSelBoxHour <= startHourBox && endSelBoxHour >= endHourBox)
            ) {
                console.log('Hay una colisión');
                result = true;
            }
        });

        return result;
    } else {
        console.log('No hay caja seleccionada');
        return false;
    }
}

export default async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === 'POST') {
        const form = new IncomingForm();

        form.parse(req, async (err: any, fields: Fields) => {
            if (err) {
                console.error(err);
                res.status(500).json({ message: 'Error al procesar el formulario' });
                return;
            }
            try {
                const { CodEspacio, Dia, HoraInicio, Duracion, HoraFin } = fields;
                var CodRestriccion = fields.CodRestriccion;

                const FechaCreacion = new Date(Date.now());
                const FechaEdicion = FechaCreacion;

                const { miEspacioSession } = req.cookies;

                if (miEspacioSession === undefined) {
                    res.status(401).json({ message: 'No se ha iniciado sesión' });
                    return;
                }

                const { payload } = await jwtVerify(
                    miEspacioSession,
                    new TextEncoder().encode('secret')
                );

                const CodUsuario = payload?.CodUsuario;
                var AvaliabilityBoxes = null as AvailabilityBox[] | null;

                if (!CodRestriccion) {
                    console.log('No hay restricción, se buscará si hay una existente');

                    const [restriccionSearchResult] = await pool.query<RowDataPacket[]>(
                        'SELECT PK_TMEERESTRICCION FROM T_MEERESTRICCION WHERE PK_TMEESPACIO = ? AND ESTADO = 1',
                        [CodEspacio]
                    );

                    if (restriccionSearchResult.length > 0) {
                        console.log('Se encontró una restricción existente');
                        CodRestriccion = restriccionSearchResult[0].PK_TMEERESTRICCION.toString();
                    } else {
                        console.log('No se encontró una restricción existente, se creará una nueva');
                        const [restriccionResult] = await pool.query<OkPacket>(
                            'INSERT INTO T_MEERESTRICCION (PK_TMEESPACIO, PK_TMCPERSONA_INTERNA, RES_FECHA_CREACION, RES_FECHA_EDICION, ESTADO) VALUES (?, ?, ?, ?, ?)',
                            [
                                CodEspacio,
                                CodUsuario,
                                FechaCreacion,
                                FechaEdicion,
                                1
                            ]
                        );
                        CodRestriccion = restriccionResult.insertId.toString();
                    }
                }

                const [horariosSearchResult] = await pool.query<RowDataPacket[]>(
                    'SELECT PK_TMEEHORARIO as CodHorario, HOR_DIA, HOR_HORA_INICIO, HOR_HORA_FIN FROM T_MEEHORARIO WHERE PK_TMEERESTRICCION = ? AND ESTADO = 1',
                    [CodRestriccion]
                );

                if (horariosSearchResult.length > 0) {
                    AvaliabilityBoxes = horariosSearchResult.map((horario) => {
                        return {
                            id: horario.CodHorario,
                            dayIndex: horario.HOR_DIA,
                            startHour: horario.HOR_HORA_INICIO,
                            duration: calculateDuration(parseInt(horario.HOR_HORA_INICIO.split(':')[0]), parseInt(horario.HOR_HORA_INICIO.split(':')[1]), parseInt(horario.HOR_HORA_FIN.split(':')[0]), parseInt(horario.HOR_HORA_FIN.split(':')[1]))
                        } as AvailabilityBox;
                    });
                } else {
                    AvaliabilityBoxes = [];
                }

                console.log(AvaliabilityBoxes);

                if (AvaliabilityBoxes) {
                    const newHorario = {
                        CodHorario: 999,
                        CodRestriccion: parseInt(CodRestriccion as string),
                        Dia: parseInt(Dia as string),
                        HoraInicio: HoraInicio,
                        HoraFin: HoraFin,
                        Estado: '1'
                    } as Horario;

                    if (checkForColisions(newHorario, AvaliabilityBoxes)) {
                        res.status(201).json({ message: 'Hay una colisión en el lugar que seleccionó, revise nuevamente el horario', CodRestriccion, AvaliabilityBoxes });
                        return;
                    }
                }

                const [horarioResult] = await pool.query<OkPacket>(
                    'INSERT INTO T_MEEHORARIO (PK_TMEERESTRICCION, HOR_DIA, HOR_HORA_INICIO, HOR_HORA_FIN, ESTADO) VALUES (?, ?, ?, ?, ?)',
                    [
                        CodRestriccion,
                        Dia,
                        HoraInicio,
                        HoraFin,
                        1
                    ]
                );

                const CodHorario = horarioResult.insertId.toString();

                AvaliabilityBoxes?.push({
                    id: parseInt(CodHorario),
                    dayIndex: parseInt(Dia[0]),
                    startHour: HoraInicio,
                    duration: parseInt(Duracion as string)
                } as AvailabilityBox);

                console.log("Nuevo AvaliabilityBoxes = ", AvaliabilityBoxes);

                res.status(200).json({ message: 'Éxito', CodRestriccion, CodHorario, AvaliabilityBoxes });
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: 'Error al realizar la acción' });
            }
        });
    } else if (req.method === 'PUT') {
        const form = new IncomingForm();

        form.parse(req, async (err: any, fields: Fields) => {
            if (err) {
                console.error(err);
                res.status(500).json({ message: 'Error al procesar el formulario' });
                return;
            }
            try {
                const { CodEspacio, Id, Dia, HoraInicio, Duracion, HoraFin } = fields;
                var CodRestriccion = fields.CodRestriccion;

                var AvaliabilityBoxes = null as AvailabilityBox[] | null;

                if (!CodRestriccion) {
                    console.log('No hay restricción, se buscará si hay una existente');

                    const [restriccionSearchResult] = await pool.query<RowDataPacket[]>(
                        'SELECT PK_TMEERESTRICCION FROM T_MEERESTRICCION WHERE PK_TMEESPACIO = ? AND ESTADO = 1',
                        [CodEspacio]
                    );

                    if (restriccionSearchResult.length > 0) {
                        console.log('Se encontró una restricción existente');
                        CodRestriccion = restriccionSearchResult[0].PK_TMEERESTRICCION.toString();
                    } else {
                        return res.status(201).json({ message: 'No se pudo verificar los datos de la restricción' });
                    }
                }

                const [horariosSearchResult] = await pool.query<RowDataPacket[]>(
                    'SELECT PK_TMEEHORARIO as CodHorario, HOR_DIA, HOR_HORA_INICIO, HOR_HORA_FIN FROM T_MEEHORARIO WHERE PK_TMEERESTRICCION = ? AND ESTADO = 1',
                    [CodRestriccion]
                );

                if (horariosSearchResult.length > 0 && horariosSearchResult.find((horario) => horario.CodHorario === parseInt(Id as string))) {
                    AvaliabilityBoxes = horariosSearchResult.map((horario) => {
                        return {
                            id: horario.CodHorario,
                            dayIndex: horario.HOR_DIA,
                            startHour: horario.HOR_HORA_INICIO,
                            duration: calculateDuration(parseInt(horario.HOR_HORA_INICIO.split(':')[0]), parseInt(horario.HOR_HORA_INICIO.split(':')[1]), parseInt(horario.HOR_HORA_FIN.split(':')[0]), parseInt(horario.HOR_HORA_FIN.split(':')[1]))
                        } as AvailabilityBox;
                    });
                } else {
                    return res.status(201).json({ message: 'No se encontraron registros para actualizar' });
                }

                console.log(AvaliabilityBoxes);

                if (AvaliabilityBoxes) {
                    const newHorario = {
                        CodHorario: parseInt(Id as string),
                        CodRestriccion: parseInt(CodRestriccion as string),
                        Dia: parseInt(Dia as string),
                        HoraInicio: HoraInicio,
                        HoraFin: HoraFin,
                        Estado: '1'
                    } as Horario;

                    if (checkForColisionsUpdate(newHorario, AvaliabilityBoxes)) {
                        res.status(201).json({ message: 'Hay una colisión en el lugar que seleccionó, revise nuevamente el horario', CodRestriccion, AvaliabilityBoxes });
                        return;
                    }
                }

                const [horarioResult] = await pool.query<OkPacket>(
                    'UPDATE T_MEEHORARIO SET HOR_HORA_INICIO = ?, HOR_HORA_FIN = ? WHERE PK_TMEEHORARIO = ?',
                    [
                        HoraInicio,
                        HoraFin,
                        Id
                    ]
                );

                const CodHorario = horarioResult.insertId.toString();

                AvaliabilityBoxes?.forEach((box) => {
                    if (box.id === parseInt(Id as string)) {
                        box.startHour = HoraInicio as string;
                        box.duration = parseInt(Duracion as string);
                    }
                });

                console.log("Nuevo AvaliabilityBoxes = ", AvaliabilityBoxes);

                res.status(200).json({ message: 'Éxito', CodRestriccion, CodHorario, AvaliabilityBoxes });
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: 'Error al realizar la acción' });
            }
        });
    } else if (req.method === 'DELETE') {
        try {
            const { CodEspacio, Id } = req.query;
            var CodRestriccion = req.query.CodRestriccion;

            console.log('CodEspacio = ', CodEspacio);
            console.log('Id = ', Id);
            console.log('CodRestriccion = ', CodRestriccion);
            var AvaliabilityBoxes = null as AvailabilityBox[] | null;

            if (!CodRestriccion || CodRestriccion === undefined || CodRestriccion === null || CodRestriccion === '') {
                console.log('No hay restricción, se buscará si hay una existente');

                const [restriccionSearchResult] = await pool.query<RowDataPacket[]>(
                    'SELECT PK_TMEERESTRICCION FROM T_MEERESTRICCION WHERE PK_TMEESPACIO = ? AND ESTADO = 1',
                    [CodEspacio]
                );

                if (restriccionSearchResult.length > 0) {
                    console.log('Se encontró una restricción existente');
                    CodRestriccion = restriccionSearchResult[0].PK_TMEERESTRICCION.toString();
                } else {
                    return res.status(201).json({ message: 'No se pudo verificar los datos de la restricción' });
                }
            }

            console.log('Buscado CodRestriccion = ', CodRestriccion);
            const [horariosSearchResult] = await pool.query<RowDataPacket[]>(
                'SELECT PK_TMEEHORARIO as CodHorario, HOR_DIA, HOR_HORA_INICIO, HOR_HORA_FIN FROM T_MEEHORARIO WHERE PK_TMEERESTRICCION = ? AND ESTADO = 1',
                [CodRestriccion]
            );

            if (horariosSearchResult.length > 0 && horariosSearchResult.find((horario) => horario.CodHorario === parseInt(Id as string))) {
                AvaliabilityBoxes = horariosSearchResult.map((horario) => {
                    return {
                        id: horario.CodHorario,
                        dayIndex: horario.HOR_DIA,
                        startHour: horario.HOR_HORA_INICIO,
                        duration: calculateDuration(parseInt(horario.HOR_HORA_INICIO.split(':')[0]), parseInt(horario.HOR_HORA_INICIO.split(':')[1]), parseInt(horario.HOR_HORA_FIN.split(':')[0]), parseInt(horario.HOR_HORA_FIN.split(':')[1]))
                    } as AvailabilityBox;
                });
            } else {
                return res.status(201).json({ message: 'No se encontraron registros' });
            }

            console.log(AvaliabilityBoxes);

            const [horarioResult] = await pool.query<OkPacket>(
                'DELETE FROM T_MEEHORARIO WHERE PK_TMEEHORARIO = ?',
                [Id]
            );

            AvaliabilityBoxes = AvaliabilityBoxes?.filter((box) => {
                return box.id !== parseInt(Id as string);
            });

            console.log("Nuevo AvaliabilityBoxes = ", AvaliabilityBoxes);

            res.status(200).json({ message: 'Éxito', CodRestriccion, AvaliabilityBoxes });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error al realizar la acción' });
        }
    }  else if (req.method === 'GET') {
        try {
            const { CodEspacio} = req.query;
            var CodRestriccion = req.query.CodRestriccion;

            console.log('CodEspacio = ', CodEspacio);
            console.log('CodRestriccion = ', CodRestriccion);
            var AvaliabilityBoxes = null as AvailabilityBox[] | null;

            if (!CodRestriccion || CodRestriccion === undefined || CodRestriccion === null || CodRestriccion === '') {
                console.log('No hay restricción, se buscará si hay una existente');

                const [restriccionSearchResult] = await pool.query<RowDataPacket[]>(
                    'SELECT PK_TMEERESTRICCION FROM T_MEERESTRICCION WHERE PK_TMEESPACIO = ? AND ESTADO = 1',
                    [CodEspacio]
                );

                if (restriccionSearchResult.length > 0) {
                    console.log('Se encontró una restricción existente');
                    CodRestriccion = restriccionSearchResult[0].PK_TMEERESTRICCION.toString();
                }
            }

            const [horariosSearchResult] = await pool.query<RowDataPacket[]>(
                'SELECT PK_TMEEHORARIO as CodHorario, HOR_DIA, HOR_HORA_INICIO, HOR_HORA_FIN FROM T_MEEHORARIO WHERE PK_TMEERESTRICCION = ? AND ESTADO = 1',
                [CodRestriccion]
            );

            if (horariosSearchResult.length > 0) {
                AvaliabilityBoxes = horariosSearchResult.map((horario) => {
                    return {
                        id: horario.CodHorario,
                        dayIndex: horario.HOR_DIA,
                        startHour: horario.HOR_HORA_INICIO,
                        duration: calculateDuration(parseInt(horario.HOR_HORA_INICIO.split(':')[0]), parseInt(horario.HOR_HORA_INICIO.split(':')[1]), parseInt(horario.HOR_HORA_FIN.split(':')[0]), parseInt(horario.HOR_HORA_FIN.split(':')[1]))
                    } as AvailabilityBox;
                });
            } else {
                AvaliabilityBoxes = [];
            }

            console.log(AvaliabilityBoxes);

            res.status(200).json({ message: 'Éxito', CodRestriccion, AvaliabilityBoxes });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error al realizar la acción' });
        }
    } else {
        res.status(405).json({ message: 'Método no permitido' });
    }
};