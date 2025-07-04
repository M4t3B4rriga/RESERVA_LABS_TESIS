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
    const { id, CodRepaso } = req.query;

    switch (method) {
        case 'GET':
            try {
                let repaso = false;
                if (CodRepaso !== undefined && CodRepaso !== null && CodRepaso !== '') {
                    repaso = true;
                }

                if (repaso) {
                    const [rows] = await pool.query<RowDataPacket[]>(
                        `SELECT
                            re.PK_TMRRESERVA AS CodReserva,
                            re.CODRESERVA2 AS CodRepaso,
                            re.REP_DIA AS Dia,
                            re.REP_HORA_INICIO AS HoraInicio,
                            re.REP_HORA_FIN AS HoraFin,
                            re.ESTADO AS Estado,
                            r.PK_TMCPERSONA_INTERNA AS CodPersonaInterna,
                            pi.PEI_NOMBRE AS NombrePersonaInterna,
                            pi.PEI_APELLIDO_PATERNO AS ApellidoPaternoPersonaInterna,
                            pi.PEI_APELLIDO_MATERNO AS ApellidoMaternoPersonaInterna,
                            e.PK_TMEESPACIO AS CodEspacio,
                            e.PK_TMETIPO_ESPACIO AS CodTipoEspacio,
                            e.ESP_DISPONIBILIDAD AS Disponibilidad,
                            te.TES_NOMBRE AS NombreTipoEspacio,
                            e.ESP_NOMBRE AS NombreEspacio,
                            e.PK_TMEUNIDAD AS CodUnidad,
                            f.FES_NOMBRE as NombreFoto, 
                            f.FES_RUTA as RutaFoto,
                            r.PK_TMRTIPO_EVENTO AS CodTipoEvento,
                            tev.TEV_NOMBRE AS NombreTipoEvento,
                            r.PK_TMCPERSONA_EXTERNA AS CodPersonaExterna,
                            pe.PEE_NOMBRE AS NombrePersonaExterna,
                            pe.PEE_APELLIDO_PATERNO AS ApellidoPaternoPersonaExterna,
                            pe.PEE_APELLIDO_MATERNO AS ApellidoMaternoPersonaExterna,
                            r.RES_RAZON AS Razon,
                            r.RES_ESTADO_SOLICITUD AS EstadoSolicitud,
                            r.RES_ES_PERSONA_EXT AS EsPersonaExterna,
                            r.RES_EVENTO_ACADEMICO AS EventoAcademico,
                            r.RES_FECHA_CREACION AS FechaCreacion,
                            e.ESTADO as EstadoEspacio
                        FROM
                            T_MRREPASO re
                            INNER JOIN T_MRRESERVA r ON re.PK_TMRRESERVA = r.PK_TMRRESERVA
                            INNER JOIN T_MEESPACIO e ON r.PK_TMEESPACIO = e.PK_TMEESPACIO
                            JOIN T_METIPO_ESPACIO te ON e.PK_TMETIPO_ESPACIO = te.PK_TMETIPO_ESPACIO
                            LEFT JOIN T_MRTIPO_EVENTO tev ON r.PK_TMRTIPO_EVENTO = tev.PK_TMRTIPO_EVENTO
                            LEFT JOIN T_MCPERSONA_INTERNA pi ON r.PK_TMCPERSONA_INTERNA = pi.PK_TMCPERSONA_INTERNA
                            LEFT JOIN T_MCPERSONA_EXTERNA pe ON r.PK_TMCPERSONA_EXTERNA = pe.PK_TMCPERSONA_EXTERNA
                            LEFT JOIN (
                                SELECT *
                                FROM T_MEFOTO_ESPACIO
                                WHERE ESTADO = 1
                                AND (PK_TMEESPACIO, FES_ORDEN) IN (
                                  SELECT PK_TMEESPACIO, MIN(FES_ORDEN)
                                  FROM T_MEFOTO_ESPACIO
                                  WHERE ESTADO = 1
                                  GROUP BY PK_TMEESPACIO
                                )
                              ) f ON e.PK_TMEESPACIO = f.PK_TMEESPACIO
                        WHERE re.CODRESERVA2 = ? AND re.ESTADO = 1 AND r.ESTADO = 1 AND te.ESTADO = 1`,
                        [CodRepaso]
                    );
    
                    if (rows.length === 0) {
                        res.status(201).json({ message: 'No se pudo encontrar el registro' });
                        return;
                    }
    
                    const reserva = rows as ReservaEspacioInfo[];
    
                    res.status(200).json({ reserva });
                } else {
                    const [rows] = await pool.query<RowDataPacket[]>(
                        `SELECT
                            r.PK_TMRRESERVA AS CodReserva,
                            NULL as CodRepaso,
                            r.PK_TMCPERSONA_INTERNA AS CodPersonaInterna,
                            pi.PEI_NOMBRE AS NombrePersonaInterna,
                            pi.PEI_APELLIDO_PATERNO AS ApellidoPaternoPersonaInterna,
                            pi.PEI_APELLIDO_MATERNO AS ApellidoMaternoPersonaInterna,
                            r.PK_TMEESPACIO AS CodEspacio,
                            e.PK_TMETIPO_ESPACIO AS CodTipoEspacio,
                            te.TES_NOMBRE AS NombreTipoEspacio,
                            e.ESP_NOMBRE AS NombreEspacio,
                            e.PK_TMEUNIDAD AS CodUnidad,
                            e.ESP_DISPONIBILIDAD AS Disponibilidad,
                            f.FES_NOMBRE as NombreFoto, 
                            f.FES_RUTA as RutaFoto,
                            r.PK_TMRTIPO_EVENTO AS CodTipoEvento,
                            tev.TEV_NOMBRE AS NombreTipoEvento,
                            r.PK_TMCPERSONA_EXTERNA AS CodPersonaExterna,
                            pe.PEE_NOMBRE AS NombrePersonaExterna,
                            pe.PEE_APELLIDO_PATERNO AS ApellidoPaternoPersonaExterna,
                            pe.PEE_APELLIDO_MATERNO AS ApellidoMaternoPersonaExterna,
                            r.RES_RAZON AS Razon,
                            r.RES_ESTADO_SOLICITUD AS EstadoSolicitud,
                            r.RES_ES_PERSONA_EXT AS EsPersonaExterna,
                            r.RES_EVENTO_ACADEMICO AS EventoAcademico,
                            r.RES_DIA AS Dia,
                            r.RES_HORA_INICIO AS HoraInicio,
                            r.RES_HORA_FIN AS HoraFin,
                            r.RES_FECHA_CREACION AS FechaCreacion,
                            r.ESTADO as Estado,
                            e.ESTADO as EstadoEspacio
                        FROM
                            T_MRRESERVA r
                            INNER JOIN T_MEESPACIO e ON r.PK_TMEESPACIO = e.PK_TMEESPACIO
                            JOIN T_METIPO_ESPACIO te ON e.PK_TMETIPO_ESPACIO = te.PK_TMETIPO_ESPACIO
                            LEFT JOIN T_MRTIPO_EVENTO tev ON r.PK_TMRTIPO_EVENTO = tev.PK_TMRTIPO_EVENTO
                            LEFT JOIN T_MCPERSONA_INTERNA pi ON r.PK_TMCPERSONA_INTERNA = pi.PK_TMCPERSONA_INTERNA
                            LEFT JOIN T_MCPERSONA_EXTERNA pe ON r.PK_TMCPERSONA_EXTERNA = pe.PK_TMCPERSONA_EXTERNA
                            LEFT JOIN (
                                SELECT *
                                FROM T_MEFOTO_ESPACIO
                                WHERE ESTADO = 1
                                AND (PK_TMEESPACIO, FES_ORDEN) IN (
                                  SELECT PK_TMEESPACIO, MIN(FES_ORDEN)
                                  FROM T_MEFOTO_ESPACIO
                                  WHERE ESTADO = 1
                                  GROUP BY PK_TMEESPACIO
                                )
                              ) f ON e.PK_TMEESPACIO = f.PK_TMEESPACIO
                        WHERE r.PK_TMRRESERVA = ? AND r.ESTADO = 1 AND te.ESTADO = 1`,
                        [id]
                    );
    
                    if (rows.length === 0) {
                        res.status(201).json({ message: 'No se pudo encontrar el registro' });
                        return;
                    }
    
                    const reserva = rows as ReservaEspacioInfo[];
    
                    res.status(200).json({ reserva });
                }
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