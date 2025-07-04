import { NextApiRequest, NextApiResponse } from 'next'
import pool from '@/libs/db';
import url from 'url';
import querystring from 'querystring'
import { OkPacket } from 'mysql2';
import { PersonaInternaUsuario } from '@/libs/persona';
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

async function getUsuariosByRol(req: NextApiRequest, res: NextApiResponse, { filter, search, page, limit, orderBy, orderDir }: GetUsuariosParams = {}) {
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

        const { CodRol } = req.query;

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

        console.log("CodRol", CodRol);

        if (CodRol !== undefined && CodRol !== null && CodRol !== '') {
            const whereClause = whereConditions.length > 0 ? `WHERE r.PK_TMSROL = ? AND r.ESTADO = 1 AND ${whereConditions.join(' AND ')}` : 'WHERE r.PK_TMSROL = ? AND r.ESTADO = 1';
            const orderClause = orderBy ? `ORDER BY ${orderBy} ${orderDir || 'ASC'}` : '';

            const query = `
                    SELECT pi.PK_TMCPERSONA_INTERNA AS CodPersonaInterna,
                            pi.PK_TMEUNIDAD AS CodUnidad,
                            u.XEUSU_CODIGO AS CodUsuario,
                            pi.PEI_NOMBRE AS Nombre,
                            pi.PEI_APELLIDO_PATERNO AS ApellidoPaterno,
                            pi.PEI_APELLIDO_MATERNO AS ApellidoMaterno,
                            pi.PEI_CARNET_ID AS CarnetID,
                            pi.PEI_EMAIL_INSTITUCIONAL AS EmailInstitucional,
                            pi.PEI_EMAIL_PERSONAL AS EmailPersonal,
                            pi.PEI_TELEFONO AS Telefono,
                            pi.PEI_CEDULA AS Cedula
                    FROM T_MCPERSONA_INTERNA pi
                    INNER JOIN T_MSUSUARIO u ON pi.PK_TMCPERSONA_INTERNA = u.PK_TMCPERSONA_INTERNA
                    INNER JOIN T_MSROL_USUARIO ru ON u.XEUSU_CODIGO = ru.XEUSU_CODIGO
                    INNER JOIN T_MSROL r ON ru.PK_TMSROL = r.PK_TMSROL
                    ${whereClause}
                    ${orderClause}
                    `;

            const [result] = await pool.query(query, CodRol);
            const usuarios = result as PersonaInternaUsuario[];

            res.status(200).json({ usuarios });
            return;
        } else {
            const whereClause = whereConditions.length > 0 ? `WHERE (ru.PK_TMSROL_USUARIO IS NULL OR r.ESTADO = '0') AND ${whereConditions.join(' AND ')}` : `WHERE ru.PK_TMSROL_USUARIO IS NULL OR r.ESTADO = '0'`;
            const orderClause = orderBy ? `ORDER BY ${orderBy} ${orderDir || 'ASC'}` : '';

            const query = `
                    SELECT pi.PK_TMCPERSONA_INTERNA AS CodPersonaInterna,
                        pi.PK_TMEUNIDAD AS CodUnidad,
                        u.XEUSU_CODIGO AS CodUsuario,
                        pi.PEI_NOMBRE AS Nombre,
                        pi.PEI_APELLIDO_PATERNO AS ApellidoPaterno,
                        pi.PEI_APELLIDO_MATERNO AS ApellidoMaterno,
                        pi.PEI_CARNET_ID AS CarnetID,
                        pi.PEI_EMAIL_INSTITUCIONAL AS EmailInstitucional,
                        pi.PEI_EMAIL_PERSONAL AS EmailPersonal,
                        pi.PEI_TELEFONO AS Telefono,
                        pi.PEI_CEDULA AS Cedula
                    FROM T_MCPERSONA_INTERNA pi
                    LEFT JOIN T_MSUSUARIO u ON pi.PK_TMCPERSONA_INTERNA = u.PK_TMCPERSONA_INTERNA
                    LEFT JOIN T_MSROL_USUARIO ru ON u.XEUSU_CODIGO = ru.XEUSU_CODIGO AND ru.ESTADO = '1'
                    LEFT JOIN T_MSROL r ON ru.PK_TMSROL = r.PK_TMSROL
                    ${whereClause}
                    ${orderClause}
                    `;
            const [result] = await pool.query(query);
            const usuarios = result as PersonaInternaUsuario[];

            res.status(200).json({ usuarios });
            return;
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener los usuarios' });
    }
}

async function asignRolToUsuario(req: NextApiRequest, res: NextApiResponse) {
    try {
        const { usuarios, CodRol } = req.body;
        if (CodRol === undefined || CodRol === null || CodRol === '') {
            if (Array.isArray(usuarios) && usuarios.length > 0) {
                console.log('desasignar usuarios');
                const codigosUsuarios = usuarios.map((usuario) => usuario.CodUsuario);
                const codigosUsuariosString = codigosUsuarios.join(',');

                const deleteQuery = `
                DELETE FROM T_MSROL_USUARIO
                WHERE XEUSU_CODIGO IN (${codigosUsuariosString});
                `;
                console.log(deleteQuery);

                await pool.query(deleteQuery);

                res.status(200).json({ message: 'Se asignó el rol correctamente' });
                return;
            } else {
                console.log('desasignar usuario single');
                const deleteQuery = `
                DELETE FROM T_MSROL_USUARIO
                WHERE XEUSU_CODIGO = ?;
                `;
                console.log(deleteQuery);

                await pool.query(deleteQuery, usuarios.CodUsuario);

                res.status(200).json({ message: 'Se asignó el rol correctamente' });
                return;
            }
        } else {
            if (Array.isArray(usuarios) && usuarios.length > 0) {
                console.log('asignar usuarios');
                const codigosUsuarios = usuarios.map((usuario) => usuario.CodUsuario);
                const codigosUsuariosString = codigosUsuarios.join(',');

                const deleteQuery = `
                DELETE FROM T_MSROL_USUARIO
                WHERE XEUSU_CODIGO IN (${codigosUsuariosString});
                `;
                console.log(deleteQuery);

                await pool.query(deleteQuery);

                //Insertar los nuevos registros de la tabla T_MSROL_USUARIO
                const insertQuery = `
                INSERT INTO T_MSROL_USUARIO (PK_TMSROL, XEUSU_CODIGO, RUS_FECHA_ASIGNACION, ESTADO)
                VALUES ${usuarios.map((usuario) => `(${CodRol}, ${usuario.CodUsuario}, NOW(), '1')`).join(',')};
                `;
                console.log(insertQuery);

                await pool.query(insertQuery);

                res.status(200).json({ message: 'Se asignó el rol correctamente' });
                return;
            } else {
                console.log('asignar usuario single');
                const deleteQuery = `
                DELETE FROM T_MSROL_USUARIO
                WHERE XEUSU_CODIGO = ?;
                `;
                console.log(deleteQuery);

                await pool.query(deleteQuery, usuarios.CodUsuario);
                
                //Insertar los nuevos registros de la tabla T_MSROL_USUARIO
                const insertQuery = `
                INSERT INTO T_MSROL_USUARIO (PK_TMSROL, XEUSU_CODIGO, RUS_FECHA_ASIGNACION, ESTADO)
                VALUES (${CodRol}, ${usuarios.CodUsuario}, NOW(), '1');
                `;
                console.log(insertQuery);

                await pool.query(insertQuery);

                res.status(200).json({ message: 'Se asignó el rol correctamente' });
                return;
            }
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al asignar los roles' });
    }
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<PersonaInternaUsuario[] | PersonaInternaUsuario | { message: string }>
) {
    const { method } = req;

    switch (method) {
        case 'GET':
            // Se parsean las query params de la URL para obtener los parámetros de la paginación y búsqueda
            const parsedUrl = url.parse(req.url || '', true);
            const { filter, search, page = '1', limit = '10', orderBy, orderDir } = parsedUrl.query;

            // Se llama a la función getRoles con los parámetros correspondientes
            await getUsuariosByRol(req, res, {
                filter: filter ? filter.toString() : undefined,
                search: search ? search.toString() : undefined,
                page: parseInt(page.toString(), 10),
                limit: parseInt(limit.toString(), 10,),
                orderBy: orderBy ? orderBy.toString() : undefined,
                orderDir: orderDir === 'DESC' ? 'DESC' : 'ASC',
            });
            break;
        case 'POST':
            await asignRolToUsuario(req, res);
            break;
        default:
            res.setHeader('Allow', ['GET']);
            res.status(405).json({ message: `Método ${method} no permitido` });
            break;
    }
}