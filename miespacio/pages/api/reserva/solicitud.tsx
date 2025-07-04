import { NextApiRequest, NextApiResponse } from 'next'
import pool from '@/libs/db';
import url from 'url';
import querystring from 'querystring'
import { OkPacket, RowDataPacket } from 'mysql2';
import { RepasoInfo, ReservaEspacioCalendar, ReservaInfo } from '@/libs/reserva';
import { jwtVerify } from 'jose';
import { EquipoForReservation } from '@/libs/equipo';
import { ServicioEspecialDirigentes, ServicioEspecialReservas } from '@/libs/servicioEspecial';
import nodemailer from 'nodemailer';
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

async function gestionarSolicitud(req: NextApiRequest, res: NextApiResponse) {
    try {
        const {
            reserva,
            action,
            usuarioLogueado
        } = req.body;

        console.log(reserva);
        console.log(action);
        console.log(usuarioLogueado);

        if (!(reserva && action && usuarioLogueado)) {
            res.status(201).json({ message: 'Faltan datos' });
            return;
        }

        // Obtencion de información adicional
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
            WHERE er.PK_TMRRESERVA = ? AND teq.ESTADO = 1 AND eq.ESTADO = 1`,
            [reserva.CodReserva]
        );

        const [rows_servicios_especiales] = await pool.query<RowDataPacket[]>(
            `
              SELECT
                se.PK_TMRSERVICIO_ESPECIAL AS CodServicioEspecial,
                se.SES_NOMBRE AS NombreServicioEspecial,
                se.SES_DESCRIPCION AS DescripcionServicioEspecial,
                se.PK_TMEUNIDAD AS CodUnidad,
                se.ESTADO AS Estado,
                pi.PEI_EMAIL_INSTITUCIONAL AS CorreoInstitucionalDirigenteUnidad,
                pi.PEI_EMAIL_PERSONAL AS CorreoPersonalDirigenteUnidad
              FROM T_MRSERVICIO_ESPECIAL_RESERVA ser
              JOIN T_MRSERVICIO_ESPECIAL se ON ser.PK_TMRSERVICIO_ESPECIAL = se.PK_TMRSERVICIO_ESPECIAL
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
              WHERE ser.PK_TMRRESERVA = ? AND se.ESTADO = 1
            `,
            [reserva.CodReserva]
        );

        const correoServiciosMap: { [correo: string]: ServicioEspecialReservas[] } = {};
        const serviciosEspeciales = rows_servicios_especiales as ServicioEspecialDirigentes[];
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

        const [rows_repasos] = await pool.query<RowDataPacket[]>(
            `SELECT
                CODRESERVA2 AS CodReserva,
                PK_TMRRESERVA AS CodRepaso,
                REP_DIA AS Dia,
                REP_HORA_INICIO AS HoraInicio,
                REP_HORA_FIN AS HoraFin,
                ESTADO AS Estado
            FROM T_MRREPASO
            WHERE PK_TMRRESERVA = ? AND ESTADO = 1`,
            [reserva.CodReserva]
        );

        const equipos = rows_equipos as EquipoForReservation[];
        const repasos = rows_repasos as RepasoInfo[];

        const codigosInternos = reserva.CodPersonaInternaDirigenteEspacio.split(',').map(Number);

        const [correos_dirigentes_espacios] = await pool.query<RowDataPacket[]>(
            `SELECT
                pi.PEI_EMAIL_INSTITUCIONAL AS CorreoInstitucional,
                pi.PEI_EMAIL_PERSONAL AS CorreoPersonal
            FROM T_MEDIRIGENTE_ESPACIO de
            JOIN T_MCPERSONA_INTERNA pi ON de.PK_TMCPERSONA_INTERNA = pi.PK_TMCPERSONA_INTERNA
            WHERE de.PK_TMEESPACIO IN (?) AND de.ESTADO = '1'`,
            [codigosInternos]
        );

        const [correo_institucional_reservador] = await pool.query<RowDataPacket[]>(
            `SELECT
                pi.PEI_EMAIL_INSTITUCIONAL AS CorreoInstitucional,
                pi.PEI_EMAIL_PERSONAL AS CorreoPersonal,
                pi.PEI_CARNET_ID AS ID
            FROM T_MCPERSONA_INTERNA pi
            WHERE pi.PK_TMCPERSONA_INTERNA = ?`,
            [reserva.CodPersonaInterna]
        );

        const newReserva = reserva as ReservaInfo;

        if (action === '1') {
            const [rows] = await pool.query<OkPacket>(
                `UPDATE T_MRRESERVA SET RES_ESTADO_SOLICITUD = 1 WHERE PK_TMRRESERVA = ?`,
                [reserva.CodReserva]
            );
            newReserva.EstadoSolicitud = '1';
        } else if (action === '0') {
            const [rows] = await pool.query<OkPacket>(
                `UPDATE T_MRRESERVA SET RES_ESTADO_SOLICITUD = 0 WHERE PK_TMRRESERVA = ?`,
                [reserva.CodReserva]
            );
            newReserva.EstadoSolicitud = '0';
        }

        // envio de correos
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com', // Servidor SMTP de Gmail
            port: 465, // Puerto para la conexión TLS
            secure: true,
            auth: {
                user: 'miespacio.espe@gmail.com',
                pass: 'zvqiaicxoauwfqqe',
            },
        });

        let emailSuccess = true;

        const currentDate = new Date();
        const formattedDate = `${currentDate.getDate()}/${currentDate.getMonth() + 1}/${currentDate.getFullYear()}`;
        const mailOptions = {
            from: 'miespacio.espe@gmail.com',
            to: correo_institucional_reservador[0].CorreoInstitucional,
            subject: action == '1' ? 'Solicitud de Reserva Aprobada' : 'Solicitud de Reserva Rechazada',
            html: `<p>Saludos.</p><p>El motivo del siguiente mensaje es informarle que su reserva del espacio <b>${reserva.NombreEspacio}</b> ha sido ${action == '1' ? '<b><i>APROBADA</i></b>' : '<b><i>RECHAZADA</i></b>'} el día ${formattedDate}.</p>
                            <h5>Información de la reserva:</h5>
                            <p><b>Fecha:</b> ${(new Date(reserva.Dia)).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                            <p><b>Hora de inicio:</b> ${reserva.HoraInicio}</p>
                            <p><b>Hora de fin:</b> ${reserva.HoraFin}</p>
                            <p><b>Razón:</b> ${reserva.Razon}</p>
                            ${equipos && equipos.length > 0 ? `<p><b>Equipos:</b> ${equipos.map((equipo: any) => equipo.NombreEquipo).join(', ')}</p>` : ''}
                            ${rows_servicios_especiales && rows_servicios_especiales.length > 0 ? `<p><b>Servicios especiales:</b> ${rows_servicios_especiales.map((servicio: any) => servicio.NombreServicioEspecial).join(', ')}</p>` : ''}
                            ${repasos && repasos.length > 0 ? repasos.map((repaso, index) => `<p><b>Repaso ${index + 1}:</b></p><p>Fecha: ${(new Date(repaso.Dia)).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</p><p>Hora de inicio: ${repaso.HoraInicio}</p><p>Hora de fin: ${repaso.HoraFin}</p>`) : ''}
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

        if (action === '1') {
            //Correo a las personas dirigentes del espacio
            let success = true;

            correos_dirigentes_espacios.forEach((dirigente: any) => {

                const currentDate = new Date();
                const formattedDate = `${currentDate.getDate()}/${currentDate.getMonth() + 1}/${currentDate.getFullYear()}`;
                const mailOptions = {
                    from: 'miespacio.espe@gmail.com',
                    to: dirigente.CorreoInstitucional,
                    subject: 'Nueva Reserva Agendada',
                    html: `<p>Saludos.</p><p>Se ha agendado la reserva con éxito del espacio <b>${reserva.NombreEspacio}</b> del cual usted se registra como responsable.</p>
                            <p>La reserva fue realizada por <b>${correo_institucional_reservador[0].ID} - ${correo_institucional_reservador[0].CorreoInstitucional}</b> el día ${formattedDate}.</p>
                            <h5>Información de la reserva:</h5>
                            <p><b>Fecha:</b> ${(new Date(reserva.Dia)).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                            <p><b>Hora de inicio:</b> ${reserva.HoraInicio}</p>
                            <p><b>Hora de fin:</b> ${reserva.HoraFin}</p>
                            <p><b>Razón:</b> ${reserva.Razon}</p>
                            ${equipos && equipos.length > 0 ? `<p><b>Equipos:</b> ${equipos.map((equipo: any) => equipo.NombreEquipo).join(', ')}</p>` : ''}
                            ${rows_servicios_especiales && rows_servicios_especiales.length > 0 ? `<p><b>Servicios especiales:</b> ${rows_servicios_especiales.map((servicio: any) => servicio.NombreServicioEspecial).join(', ')}</p>` : ''}
                            ${repasos && repasos.length > 0 ? repasos.map((repaso, index) => `<p><b>Repaso ${index + 1}:</b></p><p>Fecha: ${(new Date(repaso.Dia)).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</p><p>Hora de inicio: ${repaso.HoraInicio}</p><p>Hora de fin: ${repaso.HoraFin}</p>`) : ''}
                            <p>Para ver más información de la reserva ingrese al sistema MiEspacio o de click en el siguiente enlace.</p>
                            <h5><a href='${API_BASE_URL_SEC}/reservas?filter=CodReserva-${reserva.CodReserva}' target='_blank'>Ver Reserva</a></h5>
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
                        html: `<p>Saludos.</p><p>Se ha agendado la reserva del espacio <b>${reserva.NombreEspacio}</b> y se requiere del servicio <b>${serviciosEspecialesText}</b></p>
                                <p>La reserva fue realizada por <b>${correo_institucional_reservador[0].ID} - ${correo_institucional_reservador[0].CorreoInstitucional}</b> el día ${formattedDate}.</p>
                                <h5>Información de la reserva:</h5>
                                <p><b>Fecha:</b> ${(new Date(reserva.Dia)).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                <p><b>Hora de inicio:</b> ${reserva.HoraInicio}</p>
                                <p><b>Hora de fin:</b> ${reserva.HoraFin}</p>
                                <p><b>Razón:</b> ${reserva.Razon}</p>
                                ${equipos && equipos.length > 0 ? `<p><b>Equipos:</b> ${equipos.map((equipo: any) => equipo.NombreEquipo).join(', ')}</p>` : ''}
                                ${rows_servicios_especiales && rows_servicios_especiales.length > 0 ? `<p><b>Servicios especiales:</b> ${rows_servicios_especiales.map((servicio: any) => servicio.NombreServicioEspecial).join(', ')}</p>` : ''}
                                ${repasos && repasos.length > 0 ? repasos.map((repaso, index) => `<p><b>Repaso ${index + 1}:</b></p><p>Fecha: ${(new Date(repaso.Dia)).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</p><p>Hora de inicio: ${repaso.HoraInicio}</p><p>Hora de fin: ${repaso.HoraFin}</p>`) : ''}
                                <p>Para ver más información de la reserva ingrese al sistema MiEspacio o de click en el siguiente enlace.</p>
                                <h2><a href='${API_BASE_URL_SEC}/reservas?filter=CodReserva-${reserva.CodReserva}' target='_blank'>Ver Reserva</a></h2>
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
        }

        res.status(200).json({ newReserva, serviciosEspeciales, equipos, repasos });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al gestionar la solicitud' });
    }
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ReservaEspacioCalendar[] | ReservaEspacioCalendar | { message: string }>
) {
    const { method } = req;

    switch (method) {
        case 'POST':
            await gestionarSolicitud(req, res);
            break;
        default:
            res.setHeader('Allow', ['POST']);
            res.status(405).json({ message: `Método ${method} no permitido` });
            break;
    }
}