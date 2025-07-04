import { NextApiRequest, NextApiResponse } from 'next'
import pool from '@/libs/db';
import url from 'url';
import querystring from 'querystring'
import { OkPacket } from 'mysql2';
import { PersonaInterna } from '@/libs/persona';
import { jwtVerify } from "jose";
import { insertAuditLog } from '@/src/components/Auditoria';
import { VerificarPermisoApi } from '@/src/components/VerificacionPermisosApi';
// Interfaz para las query params de la petición GET
interface QueryParams {
    [key: string]: string | string[];
}

interface GetUsuariosParams {
    filter?: string;
    search?: string;
    page?: number;
    limit?: number;
    orderBy?: string;
    orderDir?: 'ASC' | 'DESC';
}

async function getUsuariosByUnidad(req: NextApiRequest, res: NextApiResponse, { filter, search, page, limit, orderBy, orderDir }: GetUsuariosParams = {}) {
    try {
        page = page || 1;
        limit = limit || 10;
        const offset = (page - 1) * limit;
        const allowedOrderBy = ['PK_TMCPERSONA_INTERNA', 'PEI_NOMBRE', 'PEI_APELLIDO_PATERNO', 'PEI_CARNET_ID', 'PEI_EMAIL_INSTITUCIONAL', 'PEI_EMAIL_PERSONAL', 'PEI_CEDULA', 'PEI_TELEFONO', 'UNI_SIGLAS'];
        orderBy = allowedOrderBy.includes(orderBy || "") ? orderBy : 'PEI_CARNET_ID';
        const allowedOrderDir = ['ASC', 'asc', 'DESC', 'desc'];
        orderDir = allowedOrderDir.includes(orderDir || "") ? orderDir : 'ASC';
        const whereConditions = [];
        const filterConditions = [] as string[];

        const { CodUnidad } = req.query;

        if (filter) {
            // Separar los filtros.
            const filterParams = filter ? filter.split(',') : [];
            const allowedAttributes = ['-.-', '°_°', '.-.'];

            // Construimos la cláusula WHERE en base a los filtros y la cadena de búsqueda.
            filterParams.forEach(param => {
                const [attribute, value] = param.split('-');
                if (!allowedAttributes.includes(attribute)) {
                    console.error(`El atributo ${attribute} no está permitido`);
                    return;
                }
                if (!value) {
                    console.error(`Se debe proporcionar un valor para el atributo ${attribute}`);
                    return;
                }

                filterConditions.push(`${attribute} = '${value}'`);
            });
        }
        if (filterConditions.length > 0) {
            whereConditions.push(`(${filterConditions.join(' OR ')})`);
        }

        if (search) {
            whereConditions.push(`
              (CONCAT(PEI_NOMBRE, ' ', PEI_APELLIDO_PATERNO) LIKE '%${search}%' OR 
               CONCAT(PEI_NOMBRE, ' ', PEI_APELLIDO_MATERNO) LIKE '%${search}%' OR
               CONCAT(PEI_APELLIDO_PATERNO, ' ', PEI_NOMBRE) LIKE '%${search}%' OR
               CONCAT(PEI_APELLIDO_MATERNO, ' ', PEI_NOMBRE) LIKE '%${search}%' OR
               PEI_CARNET_ID LIKE '%${search}%' OR 
               PEI_EMAIL_INSTITUCIONAL LIKE '%${search}%')
            `);
        }

        console.log("CodUnidad", CodUnidad);

        if (CodUnidad !== undefined && CodUnidad !== null && CodUnidad !== '') {
            const whereClause = whereConditions.length > 0 ? `WHERE u.PK_TMEUNIDAD = ? AND u.ESTADO = 1 AND ${whereConditions.join(' AND ')}` : 'WHERE u.PK_TMEUNIDAD = ? AND u.ESTADO = 1';
            const orderClause = orderBy ? `ORDER BY ${orderBy} ${orderDir || 'ASC'}` : '';

            const query = `
                    SELECT pi.PK_TMCPERSONA_INTERNA AS CodPersonaInterna,
                            pi.PK_TMEUNIDAD AS CodUnidad,
                            pi.PEI_NOMBRE AS Nombre,
                            pi.PEI_APELLIDO_PATERNO AS ApellidoPaterno,
                            pi.PEI_APELLIDO_MATERNO AS ApellidoMaterno,
                            pi.PEI_CARNET_ID AS CarnetID,
                            pi.PEI_EMAIL_INSTITUCIONAL AS EmailInstitucional,
                            pi.PEI_EMAIL_PERSONAL AS EmailPersonal,
                            pi.PEI_TELEFONO AS Telefono,
                            pi.PEI_CEDULA AS Cedula
                    FROM T_MCPERSONA_INTERNA pi
                    LEFT JOIN T_MEUNIDAD u ON pi.PK_TMEUNIDAD = u.PK_TMEUNIDAD AND u.ESTADO = 1
                    ${whereClause}
                    ${orderClause}
                    `;

            const [result] = await pool.query(query, CodUnidad);
            const usuarios = result as PersonaInterna[];

            res.status(200).json({ usuarios });
            return;
        } else {
            const whereClause = whereConditions.length > 0 ? `WHERE (pi.PK_TMEUNIDAD IS NULL OR u.ESTADO = '0') AND ${whereConditions.join(' AND ')}` : `WHERE pi.PK_TMEUNIDAD IS NULL OR u.ESTADO = '0'`;
            const orderClause = orderBy ? `ORDER BY ${orderBy} ${orderDir || 'ASC'}` : '';

            const query = `
                    SELECT pi.PK_TMCPERSONA_INTERNA AS CodPersonaInterna,
                        pi.PK_TMEUNIDAD AS CodUnidad,
                        pi.PEI_NOMBRE AS Nombre,
                        pi.PEI_APELLIDO_PATERNO AS ApellidoPaterno,
                        pi.PEI_APELLIDO_MATERNO AS ApellidoMaterno,
                        pi.PEI_CARNET_ID AS CarnetID,
                        pi.PEI_EMAIL_INSTITUCIONAL AS EmailInstitucional,
                        pi.PEI_EMAIL_PERSONAL AS EmailPersonal,
                        pi.PEI_TELEFONO AS Telefono,
                        pi.PEI_CEDULA AS Cedula
                    FROM T_MCPERSONA_INTERNA pi
                    LEFT JOIN T_MEUNIDAD u ON pi.PK_TMEUNIDAD = u.PK_TMEUNIDAD
                    ${whereClause}
                    ${orderClause}
                    `;

            const [result] = await pool.query(query);
            const usuarios = result as PersonaInterna[];

            res.status(200).json({ usuarios });
            return;
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener los usuarios' });
    }
}

async function asignUnidadToUsuario(req: NextApiRequest, res: NextApiResponse) {
    try {
        const { usuarios, CodUnidad } = req.body;
        if (CodUnidad === undefined || CodUnidad === null || CodUnidad === '') {
            if (Array.isArray(usuarios) && usuarios.length > 0) {
                const codigosUsuarios = usuarios.map((usuario) => usuario.CodPersonaInterna);
                const codigosUsuariosString = codigosUsuarios.join(',');
                const updateQuery = `
                UPDATE T_MCPERSONA_INTERNA
                SET PK_TMEUNIDAD = NULL
                WHERE PK_TMCPERSONA_INTERNA IN (${codigosUsuariosString});
                `;
                console.log(updateQuery);

                await pool.query(updateQuery);

                const { miEspacioSession } = req.cookies;
                if (miEspacioSession !== undefined) {
                    await insertAuditLog(
                        miEspacioSession,
                        new Date().toISOString().slice(0, 10),
                        new Date().toLocaleTimeString(),
                        req.socket?.remoteAddress ?? "",
                        `Asignar unidad ${CodUnidad} a usuarios`,
                        'Éxito',
                        req.headers['user-agent']?.split(' ')[0] ?? "",
                        req.headers['user-agent']?.split(') ')[0].split('; ')[1] ?? ""
                    );
                }

                res.status(200).json({ message: 'Se asignó la unidad correctamente' });
                return;
            } else {
                const updateQuery = `
                UPDATE T_MCPERSONA_INTERNA
                SET PK_TMEUNIDAD = NULL
                WHERE PK_TMCPERSONA_INTERNA = ?;
                `;
                console.log(updateQuery);

                await pool.query(updateQuery, usuarios.CodPersonaInterna);

                const { miEspacioSession } = req.cookies;
                if (miEspacioSession !== undefined) {
                    await insertAuditLog(
                        miEspacioSession,
                        new Date().toISOString().slice(0, 10),
                        new Date().toLocaleTimeString(),
                        req.socket?.remoteAddress ?? "",
                        `Asignar unidad ${CodUnidad} a usuarios`,
                        'Éxito',
                        req.headers['user-agent']?.split(' ')[0] ?? "",
                        req.headers['user-agent']?.split(') ')[0].split('; ')[1] ?? ""
                    );
                }

                res.status(200).json({ message: 'Se asignó la unidad correctamente' });
                return;
            }
        } else {
            if (Array.isArray(usuarios) && usuarios.length > 0) {
                const codigosUsuarios = usuarios.map((usuario) => usuario.CodPersonaInterna);
                const codigosUsuariosString = codigosUsuarios.join(',');
                const updateQuery = `
                UPDATE T_MCPERSONA_INTERNA
                SET PK_TMEUNIDAD = ?
                WHERE PK_TMCPERSONA_INTERNA IN (${codigosUsuariosString});
                `;
                console.log(updateQuery);

                await pool.query(updateQuery, CodUnidad);

                const { miEspacioSession } = req.cookies;
                if (miEspacioSession !== undefined) {
                    await insertAuditLog(
                        miEspacioSession,
                        new Date().toISOString().slice(0, 10),
                        new Date().toLocaleTimeString(),
                        req.socket?.remoteAddress ?? "",
                        `Asignar unidad ${CodUnidad} a usuarios`,
                        'Éxito',
                        req.headers['user-agent']?.split(' ')[0] ?? "",
                        req.headers['user-agent']?.split(') ')[0].split('; ')[1] ?? ""
                    );
                }

                res.status(200).json({ message: 'Se asignó la unidad correctamente' });
                return;
            } else {
                const updateQuery = `
                UPDATE T_MCPERSONA_INTERNA
                SET PK_TMEUNIDAD = ?
                WHERE PK_TMCPERSONA_INTERNA = ?;
                `;
                console.log(updateQuery);

                await pool.query(updateQuery, [CodUnidad, usuarios.CodPersonaInterna]);

                const { miEspacioSession } = req.cookies;
                if (miEspacioSession !== undefined) {
                    await insertAuditLog(
                        miEspacioSession,
                        new Date().toISOString().slice(0, 10),
                        new Date().toLocaleTimeString(),
                        req.socket?.remoteAddress ?? "",
                        `Asignar unidad ${CodUnidad} a usuarios`,
                        'Éxito',
                        req.headers['user-agent']?.split(' ')[0] ?? "",
                        req.headers['user-agent']?.split(') ')[0].split('; ')[1] ?? ""
                    );
                }

                res.status(200).json({ message: 'Se asignó la unidad correctamente' });
                return;
            }
        }
    } catch (error) {
        console.error(error);
        const { miEspacioSession } = req.cookies;
        if (miEspacioSession !== undefined) {
            await insertAuditLog(
                miEspacioSession,
                new Date().toISOString().slice(0, 10),
                new Date().toLocaleTimeString(),
                req.socket?.remoteAddress ?? "",
                `Asignar unidad a usuarios`,
                'Fracaso',
                req.headers['user-agent']?.split(' ')[0] ?? "",
                req.headers['user-agent']?.split(') ')[0].split('; ')[1] ?? ""
            );
        }
        res.status(500).json({ message: 'Error al asignar las unidades' });
    }
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<PersonaInterna[] | PersonaInterna | { message: string }>
) {
    const { method } = req;

    switch (method) {
        case 'GET':
            // Se parsean las query params de la URL para obtener los parámetros de la paginación y búsqueda
            const parsedUrl = url.parse(req.url || '', true);
            const { filter, search, page = '1', limit = '10', orderBy, orderDir } = parsedUrl.query;

            // Se llama a la función getUnidades con los parámetros correspondientes
            await getUsuariosByUnidad(req, res, {
                filter: filter ? filter.toString() : undefined,
                search: search ? search.toString() : undefined,
                page: parseInt(page.toString(), 10),
                limit: parseInt(limit.toString(), 10,),
                orderBy: orderBy ? orderBy.toString() : undefined,
                orderDir: orderDir === 'DESC' ? 'DESC' : 'ASC',
            });
            break;
        case 'POST':
            await asignUnidadToUsuario(req, res);
            break;
        default:
            res.setHeader('Allow', ['GET']);
            res.status(405).json({ message: `Método ${method} no permitido` });
            break;
    }
}