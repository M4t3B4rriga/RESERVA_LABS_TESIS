import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/libs/db';
import url from 'url';
import { PersonaInterna } from '@/libs/persona';
import { OkPacket } from 'mysql2';

interface QueryParams {
    [key: string]: string | string[];
}

interface GetPersonasInternasParams {
    filter?: string;
    search?: string;
    page?: number;
    limit?: number;
    orderBy?: string;
    orderDir?: 'ASC' | 'DESC';
}

async function getPersonasInternas(req: NextApiRequest, res: NextApiResponse, { filter, search, page, limit, orderBy, orderDir }: GetPersonasInternasParams = {}) {
    try {
        page = page || 1;
        limit = limit || 10;
        const offset = (page - 1) * limit;
        const allowedOrderBy = ['PK_TMCPERSONA_INTERNA', 'PEI_NOMBRE', 'PEI_APELLIDO_PATERNO', 'PEI_APELLIDO_MATERNO', 'PEI_CARNET_ID', 'PEI_EMAIL_INSTITUCIONAL', 'PEI_EMAIL_PERSONAL', 'PEI_CEDULA', 'PEI_TELEFONO'];
        orderBy = allowedOrderBy.includes(orderBy || '') ? orderBy : 'PK_TMCPERSONA_INTERNA';
        const allowedOrderDir = ['ASC', 'asc', 'DESC', 'desc'];
        orderDir = allowedOrderDir.includes(orderDir || '') ? orderDir : 'ASC';
        const whereConditions = [];
        const filterConditions = [] as string[];

        if (filter) {
            const filterParams = filter ? filter.split(',') : [];
            const allowedAttributes = ['ESTADO', 'PK_TMCPERSONA_INTERNA'];

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
            whereConditions.push(`(PEI_NOMBRE LIKE '%${search}%' OR PEI_APELLIDO_PATERNO LIKE '%${search}%' OR PEI_APELLIDO_MATERNO LIKE '%${search}%' OR PEI_EMAIL_INSTITUCIONAL LIKE '%${search}%' OR PEI_CARNET_ID LIKE '%${search}%') `);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
        const orderClause = orderBy ? `ORDER BY ${orderBy} ${orderDir || 'ASC'}` : '';
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
            ${whereClause}
            ${orderClause}
            LIMIT ${limit}
            OFFSET ${offset}
        `;
        const countQuery = `SELECT COUNT(*) as count FROM T_MCPERSONA_INTERNA ${whereClause}`;

        // Ejecutamos la consulta en la base de datos y devolvemos los resultados.
        const [result] = await pool.query(query);
        const personasInternas = result as PersonaInterna[];

        if (personasInternas.length === 0) {
            return res.status(204).json({ message: 'No se encontraron resultados' });
        }

        // Ejecutamos la consulta en la base de datos para obtener el número total de registros.
        type CountResult = { count: number }[];
        const [countResult] = await pool.query(countQuery);
        const count = countResult as CountResult;
        const totalCount = count[0].count;
        
        res.status(200).json({ personasInternas, totalCount });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener las personas internas' });
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

            // Se llama a la función getRoles con los parámetros correspondientes
            await getPersonasInternas(req, res, {
                filter: filter ? filter.toString() : undefined,
                search: search ? search.toString() : undefined,
                page: parseInt(page.toString(), 10),
                limit: parseInt(limit.toString(), 10,),
                orderBy: orderBy ? orderBy.toString() : undefined,
                orderDir: orderDir === 'DESC' ? 'DESC' : 'ASC',
            });
            break;

        default:
            res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
            res.status(405).json({ message: `Método ${method} no permitido` });
            break;
    }
}