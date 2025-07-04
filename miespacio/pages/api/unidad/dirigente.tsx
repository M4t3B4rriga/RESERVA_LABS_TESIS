import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/libs/db';
import { OkPacket, RowDataPacket } from 'mysql2';
import { PersonaInterna } from '@/libs/persona';


export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<PersonaInterna[] | PersonaInterna | { message: string }>
) {
    const { method } = req;
    const { CodUnidad } = req.query;

    switch (method) {
        case 'GET':
            try {
                if (CodUnidad) {
                    const query = `
                        SELECT
                            PK_TMCPERSONA_INTERNA as CodPersonaInterna,
                            PK_TMEUNIDAD as CodUnidad,
                            PEI_NOMBRE as Nombre,
                            PEI_APELLIDO_PATERNO as ApellidoPaterno,
                            PEI_APELLIDO_MATERNO as ApellidoMaterno,
                            PEI_CARNET_ID as CarnetID,
                            PEI_EMAIL_INSTITUCIONAL as EmailInstitucional,
                            PEI_EMAIL_PERSONAL as EmailPersonal,
                            PEI_CEDULA as Cedula,
                            PEI_TELEFONO as Telefono
                        FROM T_MCPERSONA_INTERNA
                        WHERE PK_TMCPERSONA_INTERNA = (
                            SELECT PK_TMCPERSONA_INTERNA
                            FROM T_MEDIRIGENTE_UNIDAD
                            WHERE PK_TMEUNIDAD = ? AND ESTADO = 1
                        )
                    `;
                    const [result] = await pool.query(query, [CodUnidad]) as RowDataPacket[];
                    let personaInterna;
                    if ((result as RowDataPacket[]).length === 0) {
                        personaInterna = {} as PersonaInterna;
                        return res.status(201).json(personaInterna);
                    }

                    personaInterna = result[0] as PersonaInterna;
                    res.status(200).json(personaInterna);
                }
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: 'Error al obtener al dirigente' });
            }
            break;

        default:
            res.setHeader('Allow', ['GET']);
            res.status(405).json({ message: `Método ${method} no permitido` });
            break;
    }
}