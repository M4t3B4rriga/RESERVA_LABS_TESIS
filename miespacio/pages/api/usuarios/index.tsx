import { NextApiRequest, NextApiResponse } from 'next'
import pool from '@/libs/db';
import url from 'url';
import querystring from 'querystring'
import { OkPacket } from 'mysql2';
import { PersonaInternaUnidad } from '@/libs/persona';
import { jwtVerify } from 'jose';
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
    cliente?: string;
}

async function getUsuarios(req: NextApiRequest, res: NextApiResponse, { filter, search, page, limit, orderBy, orderDir, cliente }: GetUsuariosParams = {}) {
    try {
        page = page || 1;
        limit = limit || 10;
        const offset = (page - 1) * limit;
        const allowedOrderBy = ['PK_TMCPERSONA_INTERNA', 'PEI_NOMBRE', 'PEI_APELLIDO_PATERNO', 'PEI_CARNET_ID', 'PEI_EMAIL_INSTITUCIONAL', 'PEI_EMAIL_PERSONAL', 'PEI_CEDULA', 'PEI_TELEFONO', 'UNI_SIGLAS'];
        orderBy = allowedOrderBy.includes(orderBy || '') ? orderBy : 'PK_TMCPERSONA_INTERNA';
        const allowedOrderDir = ['ASC', 'asc', 'DESC', 'desc'];
        orderDir = allowedOrderDir.includes(orderDir || '') ? orderDir : 'ASC';
        const whereConditions = [];
        const filterConditions = [] as string[];

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
            whereConditions.push(`PEI_APELLIDO_PATERNO LIKE '%${search}%' OR PEI_APELLIDO_MATERNO LIKE '%${search}%' OR PEI_NOMBRE LIKE '%${search}%' OR PEI_CARNET_ID LIKE '%${search}%' OR PEI_EMAIL_INSTITUCIONAL LIKE '%${search}%' OR PEI_EMAIL_PERSONAL LIKE '%${search}%' OR PEI_CEDULA LIKE '%${search}%' OR PEI_TELEFONO LIKE '%${search}%' OR UNI_SIGLAS LIKE '%${search}%'`)
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
        const orderClause = orderBy ? `ORDER BY ${orderBy} ${orderDir || 'ASC'}` : '';
        const query = `
                    SELECT 
                        pi.PK_TMCPERSONA_INTERNA AS CodPersonaInterna,
                        pi.PK_TMEUNIDAD AS CodUnidad,
                        u.UNI_NOMBRE AS NombreUnidad,
                        u.UNI_SIGLAS AS SiglasUnidad,
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
                    LIMIT ${limit}
                    OFFSET ${offset}
                    `;
        const countQuery = `SELECT COUNT(*) as count FROM T_MCPERSONA_INTERNA pi
        LEFT JOIN T_MEUNIDAD u ON pi.PK_TMEUNIDAD = u.PK_TMEUNIDAD AND u.ESTADO = 1 ${whereClause}`;

        // Ejecutamos la consulta en la base de datos y devolvemos los resultados.
        const [result] = await pool.query(query);
        const usuarios = result as PersonaInternaUnidad[];

        // Ejecutamos la consulta en la base de datos para obtener el número total de registros.
        type CountResult = { count: number }[];
        const [countResult] = await pool.query(countQuery);
        const count = countResult as CountResult;
        const totalCount = count[0].count;

        res.status(200).json({ usuarios, totalCount });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener los usuarios' });
    }
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<PersonaInternaUnidad[] | PersonaInternaUnidad | { message: string }>
) {
    const { method } = req;

    switch (method) {
        case 'GET':
            // Se parsean las query params de la URL para obtener los parámetros de la paginación y búsqueda
            const parsedUrl = url.parse(req.url || '', true);
            const { filter, search, page = '1', limit = '10', orderBy, orderDir } = parsedUrl.query;

            // Se llama a la función getRoles con los parámetros correspondientes
            await getUsuarios(req, res, {
                filter: filter ? filter.toString() : undefined,
                search: search ? search.toString() : undefined,
                page: parseInt(page.toString(), 10),
                limit: parseInt(limit.toString(), 10,),
                orderBy: orderBy ? orderBy.toString() : undefined,
                orderDir: orderDir === 'DESC' ? 'DESC' : 'ASC',
            });
            break;
        default:
            res.setHeader('Allow', ['GET']);
            res.status(405).json({ message: `Método ${method} no permitido` });
            break;
    }
}