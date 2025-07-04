import { NextApiRequest, NextApiResponse } from 'next'
import pool from '@/libs/db';
import url from 'url';
import querystring from 'querystring'
import { OkPacket } from 'mysql2';
import { TipoEquipo } from '@/libs/tipoEquipo';

// Interfaz para las query params de la petición GET
interface QueryParams {
  [key: string]: string | string[];
}

// Interfaz para los parámetros de la función getRoles
interface GetTipoEquipoParams {
  filter?: string;
  search?: string;
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDir?: 'ASC' | 'DESC';
}

async function getTipoEquipos(req: NextApiRequest, res: NextApiResponse, { filter, search, page, limit, orderBy, orderDir }: GetTipoEquipoParams = {}) {
  try {
    // Asignamos valores por defecto si no se proporcionan en los parámetros.
    page = page || 1;
    limit = limit || 10;
    const offset = (page - 1) * limit;
    const allowedOrderBy = ['PK_TMETIPO_EQUIPO', 'TEQ_NOMBRE', 'TEQ_DESCRIPCION', 'ESTADO'];
    orderBy = allowedOrderBy.includes(orderBy || "") ? orderBy : 'CodTipoEquipo';
    const allowedOrderDir = ['ASC', 'asc', 'DESC', 'desc'];
    orderDir = allowedOrderDir.includes(orderDir || "") ? orderDir : 'ASC';
    const whereConditions = [];
    const filterConditions = [] as string[];

    if (filter) {
      // Separar los filtros.
      const filterParams = filter ? filter.split(',') : [];
      const allowedAttributes = ['ESTADO'];

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
      whereConditions.push(`TEQ_NOMBRE LIKE '%${search}%'`)
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const orderClause = orderBy ? `ORDER BY ${orderBy} ${orderDir || 'ASC'}` : '';
    const query = `
      SELECT PK_TMETIPO_EQUIPO AS CodTipoEquipo, TEQ_NOMBRE AS NombreTipoEquipo, TEQ_DESCRIPCION AS DescripcionTipoEquipo, ESTADO as Estado
      FROM T_METIPO_EQUIPO
      ${whereClause}
      ${orderClause}
      LIMIT ${limit}
      OFFSET ${offset}
    `;
    const countQuery = `SELECT COUNT(*) AS count FROM T_METIPO_EQUIPO ${whereClause}`;


    // Ejecutamos la consulta en la base de datos y devolvemos los resultados.
    const [result] = await pool.query(query);
    const tiposEquipo = result as TipoEquipo[];

    // Ejecutamos la consulta en la base de datos para obtener el número total de registros.
    type CountResult = { count: number }[];
    const [countResult] = await pool.query(countQuery);
    const count = countResult as CountResult;
    const totalCount = count[0].count;

    res.status(200).json({ tiposEquipo, totalCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener los tipos de equipo' });
  }
}

async function createTipoEquipo(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { NombreTipoEquipo, DescripcionTipoEquipo } = req.body;
    const [result] = await pool.query<OkPacket>(
      'INSERT INTO T_METIPO_EQUIPO (TEQ_NOMBRE, TEQ_DESCRIPCION, ESTADO) VALUES (?, ?, 1)',
      [NombreTipoEquipo, DescripcionTipoEquipo]
    );
    const nuevoTipoEquipo: TipoEquipo = {
      CodTipoEquipo: result.insertId,
      NombreTipoEquipo,
      DescripcionTipoEquipo,
      Estado: '1',
    };
    res.status(201).json(nuevoTipoEquipo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al crear el tipo de equipo' });
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TipoEquipo[] | TipoEquipo | { message: string }>
) {
  const { method } = req;

  switch (method) {
    case 'GET':
      // Se parsean las query params de la URL para obtener los parámetros de la paginación y búsqueda
      const parsedUrl = url.parse(req.url || '', true);
      const { filter, search, page = '1', limit = '10', orderBy, orderDir } = parsedUrl.query;

      // Se llama a la función getRoles con los parámetros correspondientes
      await getTipoEquipos(req, res, {
        filter: filter ? filter.toString() : undefined,
        search: search ? search.toString() : undefined,
        page: parseInt(page.toString(), 10),
        limit: parseInt(limit.toString(), 10,),
        orderBy: orderBy ? orderBy.toString() : undefined,
        orderDir: orderDir === 'DESC' ? 'DESC' : 'ASC',
      });
      break;

    case 'POST':
      await createTipoEquipo(req, res);
      break;
    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      res.status(405).json({ message: `Método ${method} no permitido` });
      break;
  }
}